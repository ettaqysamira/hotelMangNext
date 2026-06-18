import dotenv from 'dotenv';
import prisma from '../config/db';

dotenv.config();

const HF_API_KEY = process.env.HUGGING_FACE_API_KEY || '';

async function queryHFModel(model: string, payload: any): Promise<any> {
  if (!HF_API_KEY || HF_API_KEY === 'your-huggingface-api-key-here') {
    console.warn(`[HF-Service] Missing HUGGING_FACE_API_KEY. Using smart fallback responses.`);
    return null;
  }

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HF-Service] Hugging Face API returned ${response.status}: ${errorText}`);
      return null;
    }

    return await response.json();
  } catch (error: any) {
    console.error(`[HF-Service] Error querying Hugging Face model ${model}:`, error.message);
    return null;
  }
}

/**
 * Classifies a guest complaint description using BART zero-shot classification
 */
export async function classifyComplaint(description: string): Promise<{ category: string; priority: string }> {
  const model = 'facebook/bart-large-mnli';
  const categories = ['NETWORK', 'PLUMBING', 'ELECTRICITY', 'CLEANLINESS', 'LOCKER', 'NOISE', 'OTHER'];
  
  const payload = {
    inputs: description,
    parameters: { candidate_labels: categories }
  };

  const result = await queryHFModel(model, payload);

  // Default Fallbacks
  let category = 'OTHER';
  let priority = 'MEDIUM';

  if (result && result.labels && result.scores) {
    category = result.labels[0]; // Label with highest probability
  }

  // Basic keyword heuristics to detect URGENT/HIGH priority issues
  const lowerDesc = description.toLowerCase();
  if (
    lowerDesc.includes('feu') || 
    lowerDesc.includes('inondation') || 
    lowerDesc.includes('étincelle') || 
    lowerDesc.includes('danger') ||
    lowerDesc.includes('flood') ||
    lowerDesc.includes('fire') ||
    lowerDesc.includes('spark')
  ) {
    priority = 'URGENT';
  } else if (
    lowerDesc.includes('bloqué') || 
    lowerDesc.includes('panne générale') ||
    lowerDesc.includes('cassé') ||
    lowerDesc.includes('broken') ||
    lowerDesc.includes('locked')
  ) {
    priority = 'HIGH';
  } else if (
    lowerDesc.includes('lent') || 
    lowerDesc.includes('poussière') ||
    lowerDesc.includes('dust') ||
    lowerDesc.includes('slow')
  ) {
    priority = 'LOW';
  }

  return { category, priority };
}

/**
 * Generates embeddings (384 float dimensions) for room recommendations
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  const model = 'sentence-transformers/all-MiniLM-L6-v2';
  const payload = { inputs: text };

  const result = await queryHFModel(model, payload);
  
  if (Array.isArray(result) && typeof result[0] === 'number') {
    return result as number[];
  }
  
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as number[]; // Some endpoints wrap response in a double array
  }

  // Return a mock vector if API is missing or fails
  console.log('[HF-Service] Generating mock embedding vector (384 dimensions)');
  return Array.from({ length: 384 }, () => Math.random() - 0.5);
}

/**
 * Calculates cosine similarity between two vectors
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─────────────────────────────────────────────────────────────
// INTENT DETECTION — Detects what the user is asking about
// ─────────────────────────────────────────────────────────────

type Intent = 
  | 'ROOM_OCCUPANCY'
  | 'ROOM_AVAILABILITY' 
  | 'PRICING'
  | 'BOOKING_COUNT'
  | 'COMPLAINT_STATUS'
  | 'WIFI'
  | 'CHECKIN_CHECKOUT'
  | 'KITCHEN'
  | 'EXCURSION'
  | 'LOCKER'
  | 'GREETING'
  | 'GENERAL';

function detectIntent(message: string): Intent {
  const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Room occupancy: "combien de chambre occupé", "chambres prises", "lits occupés"
  if (
    (lower.includes('occupe') || lower.includes('pris') || lower.includes('prise')) &&
    (lower.includes('chambre') || lower.includes('lit') || lower.includes('room') || lower.includes('bed'))
  ) {
    return 'ROOM_OCCUPANCY';
  }
  
  // Also handle "combien de chambre" alone (implies wanting to know status)
  if (
    (lower.includes('combien') || lower.includes('nombre') || lower.includes('how many')) &&
    (lower.includes('chambre') || lower.includes('room') || lower.includes('lit') || lower.includes('bed'))
  ) {
    // Check if asking about availability or occupancy
    if (lower.includes('disponible') || lower.includes('libre') || lower.includes('available') || lower.includes('free') || lower.includes('vide')) {
      return 'ROOM_AVAILABILITY';
    }
    return 'ROOM_OCCUPANCY';
  }

  // Room availability: "chambre disponible", "lit libre", "available rooms"
  if (
    (lower.includes('disponible') || lower.includes('libre') || lower.includes('available') || lower.includes('free') || lower.includes('vide') || lower.includes('dispo')) &&
    (lower.includes('chambre') || lower.includes('lit') || lower.includes('room') || lower.includes('bed') || lower.includes('place'))
  ) {
    return 'ROOM_AVAILABILITY';
  }

  // Pricing: "tarif", "prix", "coût", "price", "rate", "combien coûte"
  if (
    lower.includes('tarif') || lower.includes('prix') || lower.includes('cout') || 
    lower.includes('price') || lower.includes('rate') || lower.includes('coute') ||
    lower.includes('cher') || lower.includes('payer') || lower.includes('cost')
  ) {
    return 'PRICING';
  }

  // Booking count: "réservation", "booking", "combien de réservation"
  if (
    lower.includes('reservation') || lower.includes('booking') || lower.includes('reserve')
  ) {
    return 'BOOKING_COUNT';
  }

  // Complaint status: "réclamation", "plainte", "ticket", "problème signalé"
  if (
    lower.includes('reclamation') || lower.includes('plainte') || lower.includes('ticket') ||
    lower.includes('complaint') || lower.includes('signale')
  ) {
    return 'COMPLAINT_STATUS';
  }

  // WiFi
  if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('internet') || lower.includes('connexion') || lower.includes('mot de passe wifi')) {
    return 'WIFI';
  }

  // Check-in / Check-out
  if (lower.includes('check-in') || lower.includes('checkin') || lower.includes('check-out') || lower.includes('checkout') || lower.includes('heure') || lower.includes('depart') || lower.includes('arrivee')) {
    return 'CHECKIN_CHECKOUT';
  }

  // Kitchen
  if (lower.includes('cuisine') || lower.includes('manger') || lower.includes('kitchen') || lower.includes('food') || lower.includes('cook')) {
    return 'KITCHEN';
  }

  // Excursions
  if (lower.includes('excursion') || lower.includes('tour') || lower.includes('visite') || lower.includes('sortie') || lower.includes('pub crawl') || lower.includes('activite')) {
    return 'EXCURSION';
  }

  // Locker
  if (lower.includes('casier') || lower.includes('locker') || lower.includes('coffre') || lower.includes('cadenas')) {
    return 'LOCKER';
  }

  // Greeting
  if (lower.match(/^(bonjour|salut|hello|hi|hey|bonsoir|coucou|salam)/)) {
    return 'GREETING';
  }

  return 'GENERAL';
}

// ─────────────────────────────────────────────────────────────
// DATABASE QUERIES — Real-time data from PostgreSQL
// ─────────────────────────────────────────────────────────────

async function getRoomOccupancyData(): Promise<string> {
  try {
    const totalBeds = await prisma.bed.count();
    const occupiedBeds = await prisma.bed.count({ where: { status: 'OCCUPIED' } });
    const availableBeds = await prisma.bed.count({ where: { status: 'AVAILABLE' } });
    const maintenanceBeds = await prisma.bed.count({ where: { status: 'MAINTENANCE' } });
    const reservedBeds = await prisma.bed.count({ where: { status: 'RESERVED' } });
    const cleaningBeds = await prisma.bed.count({ where: { status: 'CLEANING_REQUIRED' } });

    const totalRooms = await prisma.room.count();
    
    // A room is "fully occupied" when all its beds are occupied
    const rooms = await prisma.room.findMany({
      include: { beds: true }
    });
    
    let fullyOccupiedRooms = 0;
    let partiallyOccupiedRooms = 0;
    let emptyRooms = 0;
    
    for (const room of rooms) {
      const occupiedInRoom = room.beds.filter(b => b.status === 'OCCUPIED').length;
      if (occupiedInRoom === room.beds.length && room.beds.length > 0) {
        fullyOccupiedRooms++;
      } else if (occupiedInRoom > 0) {
        partiallyOccupiedRooms++;
      } else {
        emptyRooms++;
      }
    }

    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return `📊 **État d'occupation en temps réel :**\n\n` +
      `🏠 **Chambres** : ${totalRooms} au total\n` +
      `   • ${fullyOccupiedRooms} entièrement occupée(s)\n` +
      `   • ${partiallyOccupiedRooms} partiellement occupée(s)\n` +
      `   • ${emptyRooms} vide(s)\n\n` +
      `🛏️ **Lits** : ${totalBeds} au total\n` +
      `   • ${occupiedBeds} occupé(s)\n` +
      `   • ${availableBeds} disponible(s)\n` +
      `   • ${reservedBeds} réservé(s)\n` +
      `   • ${maintenanceBeds} en maintenance\n` +
      `   • ${cleaningBeds} en nettoyage\n\n` +
      `📈 Taux d'occupation : **${occupancyRate}%**`;
  } catch (error) {
    console.error('[Chatbot] Error querying room occupancy:', error);
    return "Désolé, je n'arrive pas à accéder aux données d'occupation en ce moment. Veuillez contacter la réception.";
  }
}

async function getRoomAvailabilityData(): Promise<string> {
  try {
    const rooms = await prisma.room.findMany({
      include: { 
        beds: true,
        hostel: { select: { name: true } }
      }
    });

    let response = `🟢 **Chambres et lits disponibles :**\n\n`;
    let totalAvailable = 0;

    for (const room of rooms) {
      const availableBeds = room.beds.filter(b => b.status === 'AVAILABLE');
      totalAvailable += availableBeds.length;
      
      const typeLabel = {
        'DORM_MIXED': '🔀 Dortoir Mixte',
        'DORM_FEMALE': '♀️ Dortoir Filles',
        'DORM_MALE': '♂️ Dortoir Garçons',
        'PRIVATE_ROOM': '🔒 Chambre Privée'
      }[room.type] || room.type;

      response += `**Chambre ${room.roomNumber}** (${typeLabel}) — ${room.pricePerNight}€/nuit\n`;
      response += `   ${availableBeds.length}/${room.beds.length} lit(s) disponible(s)\n\n`;
    }

    response += `\n✅ **Total : ${totalAvailable} lit(s) disponible(s)** sur l'ensemble de l'auberge.`;
    
    if (totalAvailable === 0) {
      response += `\n\n⚠️ Aucun lit n'est disponible pour le moment. Contactez la réception pour les prochaines disponibilités.`;
    }

    return response;
  } catch (error) {
    console.error('[Chatbot] Error querying availability:', error);
    return "Désolé, je n'arrive pas à récupérer les disponibilités. Veuillez contacter la réception.";
  }
}

async function getPricingData(): Promise<string> {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { pricePerNight: 'asc' }
    });

    let response = `💰 **Tarifs par nuit :**\n\n`;
    
    const typeLabel: Record<string, string> = {
      'DORM_MIXED': '🔀 Dortoir Mixte',
      'DORM_FEMALE': '♀️ Dortoir Filles',
      'DORM_MALE': '♂️ Dortoir Garçons',
      'PRIVATE_ROOM': '🔒 Chambre Privée'
    };

    for (const room of rooms) {
      response += `• **Chambre ${room.roomNumber}** (${typeLabel[room.type] || room.type}) : **${room.pricePerNight}€** /nuit\n`;
      if (room.amenities.length > 0) {
        response += `  Équipements : ${room.amenities.join(', ')}\n`;
      }
      response += `\n`;
    }

    return response;
  } catch (error) {
    console.error('[Chatbot] Error querying pricing:', error);
    return "Nos lits en dortoir commencent à 25€ par nuit et les chambres privées à partir de 65€. Contactez la réception pour plus de détails.";
  }
}

async function getBookingStats(): Promise<string> {
  try {
    const totalBookings = await prisma.booking.count();
    const pendingBookings = await prisma.booking.count({ where: { status: 'PENDING' } });
    const confirmedBookings = await prisma.booking.count({ where: { status: 'CONFIRMED' } });
    const completedBookings = await prisma.booking.count({ where: { status: 'COMPLETED' } });
    const cancelledBookings = await prisma.booking.count({ where: { status: 'CANCELLED' } });

    // Active bookings (today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeToday = await prisma.booking.count({
      where: {
        status: 'CONFIRMED',
        checkInDate: { lte: tomorrow },
        checkOutDate: { gte: today }
      }
    });

    return `📋 **Statistiques des réservations :**\n\n` +
      `📊 Total : **${totalBookings}** réservation(s)\n` +
      `   • ⏳ En attente : ${pendingBookings}\n` +
      `   • ✅ Confirmées : ${confirmedBookings}\n` +
      `   • ✔️ Complétées : ${completedBookings}\n` +
      `   • ❌ Annulées : ${cancelledBookings}\n\n` +
      `🏨 **Séjours actifs aujourd'hui : ${activeToday}**`;
  } catch (error) {
    console.error('[Chatbot] Error querying bookings:', error);
    return "Désolé, je n'arrive pas à accéder aux données de réservation en ce moment.";
  }
}

async function getComplaintStats(): Promise<string> {
  try {
    const totalComplaints = await prisma.complaint.count();
    const openComplaints = await prisma.complaint.count({ where: { status: 'OPEN' } });
    const assignedComplaints = await prisma.complaint.count({ where: { status: 'ASSIGNED' } });
    const inProgressComplaints = await prisma.complaint.count({ where: { status: 'IN_PROGRESS' } });
    const resolvedComplaints = await prisma.complaint.count({ where: { status: 'RESOLVED' } });

    return `🎫 **État des réclamations :**\n\n` +
      `Total : **${totalComplaints}** réclamation(s)\n` +
      `   • 🔴 Ouvertes : ${openComplaints}\n` +
      `   • 🟡 Assignées : ${assignedComplaints}\n` +
      `   • 🔵 En cours : ${inProgressComplaints}\n` +
      `   • 🟢 Résolues : ${resolvedComplaints}\n\n` +
      (openComplaints > 0 
        ? `⚠️ Il y a **${openComplaints}** réclamation(s) en attente de traitement.`
        : `✅ Toutes les réclamations sont prises en charge !`);
  } catch (error) {
    console.error('[Chatbot] Error querying complaints:', error);
    return "Désolé, je ne peux pas accéder aux données de réclamations actuellement.";
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN CHAT RESPONSE — Smart routing with DB + HF fallback
// ─────────────────────────────────────────────────────────────

/**
 * Handles LLM Chat bot queries for the Smart Hostel assistant.
 * First detects intent, queries the database for data-driven questions,
 * then falls back to Hugging Face or static responses for general queries.
 */
export async function generateChatResponse(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {

  const intent = detectIntent(userMessage);
  console.log(`[Chatbot] Detected intent: ${intent} for message: "${userMessage}"`);

  // ── Data-driven intents → Query PostgreSQL ──
  switch (intent) {
    case 'ROOM_OCCUPANCY':
      return await getRoomOccupancyData();
    
    case 'ROOM_AVAILABILITY':
      return await getRoomAvailabilityData();
    
    case 'PRICING':
      return await getPricingData();
    
    case 'BOOKING_COUNT':
      return await getBookingStats();
    
    case 'COMPLAINT_STATUS':
      return await getComplaintStats();
    
    case 'WIFI':
      return "📶 **Informations WiFi :**\n\n" +
        "• Réseau : **SmartHostel_Guest**\n" +
        "• Mot de passe : **BackpackersLife2026!**\n\n" +
        "Le WiFi est disponible partout dans l'auberge. Si la connexion est lente, essayez de vous rapprocher de la réception.";
    
    case 'CHECKIN_CHECKOUT':
      return "🕐 **Horaires :**\n\n" +
        "• **Check-in** : à partir de **14h00** (2:00 PM)\n" +
        "• **Check-out** : avant **11h00** (11:00 AM)\n\n" +
        "Un check-in anticipé ou un check-out tardif peut être demandé à la réception (sous réserve de disponibilité).";
    
    case 'KITCHEN':
      return "🍳 **Cuisine partagée :**\n\n" +
        "• Ouverte **24h/24** — 7j/7\n" +
        "• Étiquetez vos produits avec votre nom et votre date de départ\n" +
        "• Lavez votre vaisselle après utilisation\n" +
        "• Le frigo est nettoyé chaque dimanche — récupérez vos aliments !";
    
    case 'EXCURSION':
      return "🗺️ **Activités & Excursions :**\n\n" +
        "• 🚶 **Walking Tour gratuit** : tous les jours à **10h00** (départ de la réception)\n" +
        "• 🍻 **Pub Crawl** : chaque vendredi à **21h00** (inscription à la réception)\n\n" +
        "Demandez à la réception pour d'autres recommandations de sorties !";
    
    case 'LOCKER':
      return "🔒 **Casiers / Lockers :**\n\n" +
        "• Chaque lit dispose d'un casier individuel\n" +
        "• Utilisez votre clé/badge de chambre pour verrouiller/déverrouiller\n" +
        "• En cas de problème avec votre casier, signalez-le via 'Réclamations' dans votre portail ou à la réception.";
    
    case 'GREETING':
      return "Bonjour ! 👋 Je suis le **Portier Virtuel** de l'auberge Smart Hostel.\n\n" +
        "Je peux vous aider avec :\n" +
        "• 🛏️ Disponibilité des chambres/lits\n" +
        "• 📊 Occupation en temps réel\n" +
        "• 💰 Tarifs\n" +
        "• 📶 WiFi\n" +
        "• 🕐 Horaires check-in/check-out\n" +
        "• 🍳 Règles de la cuisine\n" +
        "• 🗺️ Excursions & activités\n\n" +
        "Que souhaitez-vous savoir ?";
  }

  // ── General intent → Try Hugging Face LLM ──
  const model = 'meta-llama/Meta-Llama-3-8B-Instruct';

  const systemContext = `Tu es un portier virtuel intelligent pour le "Smart Hostel" (Auberge de Jeunesse).
Informations de l'auberge :
- WiFi : "SmartHostel_Guest", mdp : "BackpackersLife2026!"
- Check-in : après 14h00, Check-out : avant 11h00
- Cuisine partagée ouverte 24h/24. Étiqueter la nourriture. Laver la vaisselle.
- Tarifs : Dortoirs à partir de 25€/nuit, Chambres privées à partir de 65€/nuit.
- Excursions : Walking tour gratuit à 10h, Pub crawl vendredi 21h.
- Casiers individuels avec chaque lit.
- Réclamations via le portail guest ou à la réception.
Réponds poliment et en français. Si tu ne sais pas, dirige vers la réception.`;

  // Compile prompt in Llama-3 instruction format
  let prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemContext}<|eot_id|>\n`;
  
  for (const turn of history) {
    prompt += `<|start_header_id|>${turn.role}<|end_header_id|>\n\n${turn.content}<|eot_id|>\n`;
  }
  
  prompt += `<|start_header_id|>user<|end_header_id|>\n\n${userMessage}<|eot_id|>\n<|start_header_id|>assistant<|end_header_id|>\n\n`;

  const payload = {
    inputs: prompt,
    parameters: {
      max_new_tokens: 250,
      temperature: 0.7,
      stop: ['<|eot_id|>', '<|end_of_text|>']
    }
  };

  const result = await queryHFModel(model, payload);
  
  if (result && Array.isArray(result) && result[0]?.generated_text) {
    const text = result[0].generated_text;
    // Strip the input prompt from output if returned
    const lastAssistantIdx = text.lastIndexOf('<|start_header_id|>assistant<|end_header_id|>\n\n');
    if (lastAssistantIdx !== -1) {
      return text.substring(lastAssistantIdx + '<|start_header_id|>assistant<|end_header_id|>\n\n'.length).trim();
    }
    return text.trim();
  }

  // ── Ultimate Fallback ──
  return "Merci pour votre question ! 🤔 Je suis spécialisé dans les informations pratiques de l'auberge. " +
    "Essayez de me demander :\n\n" +
    "• \"Combien de chambres sont occupées ?\"\n" +
    "• \"Quels lits sont disponibles ?\"\n" +
    "• \"Quels sont les tarifs ?\"\n" +
    "• \"Quel est le mot de passe WiFi ?\"\n" +
    "• \"Quelles sont les heures de check-in ?\"\n\n" +
    "Pour toute autre question, n'hésitez pas à vous adresser à la réception. 🙂";
}
