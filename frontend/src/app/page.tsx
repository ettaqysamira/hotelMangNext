'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, Key, CreditCard, Sparkles, Navigation, Calendar, Settings, ShieldCheck, Bed } from 'lucide-react';

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  } as const;

  const features = [
    {
      icon: <Calendar className="text-[#00ffff]" size={24} />,
      title: "Réservation & Lits Disponibles",
      desc: "Recherchez et réservez instantanément un lit individuel dans nos dortoirs ou une chambre privée sans risque de double-booking."
    },
    {
      icon: <CreditCard className="text-[#00ffff]" size={24} />,
      title: "Paiements Sécurisés Intégrés",
      desc: "Réglez vos nuitées et extras en ligne via Stripe ou Razorpay. Vos reçus PDF sont générés automatiquement par nos robots."
    },
    {
      icon: <Key className="text-[#00ffff]" size={24} />,
      title: "Check-in Physique par QR Code",
      desc: "Plus besoin de faire la queue ! Présentez votre QR Code de confirmation à l'arrivée et votre enregistrement se fait en 5 secondes."
    },
    {
      icon: <Bot className="text-[#00ffff]" size={24} />,
      title: "Assistant Virtuel IA 24h/7",
      desc: "Notre chatbot Llama-3 répond instantanément à toutes vos interrogations sur les excursions, le WiFi ou les règlements intérieurs."
    },
    {
      icon: <Settings className="text-[#00ffff]" size={24} />,
      title: "Tri & Routage des Pannes (n8n)",
      desc: "Une ampoule grillée ? Signalez-le en ligne. L'IA catégorise la réclamation et l'assigne en temps réel au technicien disponible."
    },
    {
      icon: <ShieldCheck className="text-[#00ffff]" size={24} />,
      title: "Sécurité & Audit Logs",
      desc: "Authentification robuste par double jeton JWT et traçabilité complète des actions sensibles pour rassurer notre administration."
    }
  ];

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0f1f]">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#00d4aa]/8 blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#00f0c8]/8 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-[#00d4aa]/5 blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="w-full border-b border-[#1f2844]/60 bg-[#0a0f1f]/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[#00ffff]/20 border border-[#00ffff] text-[#00ffff] shadow-lg shadow-[#00ffff]/10 flex items-center justify-center">
              <Bed size={20} />
            </span>
            <span className="bg-gradient-to-r from-white to-[#a8c5ff] bg-clip-text text-transparent">Roomify</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/" className="text-white hover:text-white transition-colors">Home</Link>
            <Link href="/hostels" className="text-zinc-400 hover:text-white transition-colors">Hostels</Link>
            <Link href="/rooms" className="text-zinc-400 hover:text-white transition-colors">Rooms</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/auth/login" 
              className="text-xs font-semibold text-[#a8c5ff] hover:text-white transition-colors"
            >
              Connexion
            </Link>
            <Link 
              href="/auth/register" 
              className="text-xs font-bold px-4 py-2 rounded-xl bg-[#00ffff] hover:bg-[#40ffff] text-[#08101d] transition-all shadow-lg shadow-[#00ffff]/20"
            >
              S'inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/20 text-[#00d4aa] text-xs font-semibold mb-6 animate-pulse"
        >
          <Sparkles size={14} /> Roomify — Système de gestion & IA
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight bg-gradient-to-b from-white via-[#f8f9ff] to-[#a8c5ff] bg-clip-text text-transparent"
        >
          Bienvenue à Roomify, <br />
          <span className="bg-gradient-to-r from-[#00d4aa] via-[#00f0c8] to-[#00c8b3] bg-clip-text text-transparent">
            Automatisée & Assistée par IA
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-sm sm:text-base text-[#a8c5ff] max-w-2xl leading-relaxed"
        >
          Résolvez les frictions d'enregistrement, de pannes et de facturation. Une plateforme cloud tout-en-un connectée à n8n et Hugging Face pour une gestion hôtelière 100% intelligente.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <Link 
            href="/auth/register" 
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#00d4aa] to-[#00f0c8] text-[#08101d] font-bold text-sm hover:brightness-110 transition-all shadow-xl shadow-[#00d4aa]/30"
          >
            Commencer l'expérience
          </Link>
          <Link 
            href="/auth/login" 
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#00d4aa] to-[#00f0c8] text-[#08101d] font-bold text-sm hover:brightness-110 transition-all shadow-xl shadow-[#00d4aa]/30"
          >
            Accéder aux Dashboards
          </Link>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-[#1f2844]/60 relative z-10">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#f8f9ff]">
            Une architecture innovante et distribuée
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#a8c5ff]">
            Découvrez comment notre écosystème simplifie l'accueil et la maintenance.
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feat, idx) => (
            <motion.div 
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl border border-[#1f2844] bg-[#0a0f1f]/40 hover:bg-[#141b2e]/60 hover:border-[#2a3a5a] transition-all flex flex-col gap-4 group backdrop-blur-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-[#141b2e] border border-[#2a3a5a] flex items-center justify-center group-hover:scale-110 transition-transform">
                {feat.icon}
              </div>
              <div>
                <h3 className="font-bold text-[#f8f9ff] text-sm">{feat.title}</h3>
                <p className="mt-2 text-xs text-[#a8c5ff] leading-relaxed">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
        <footer className="w-full py-8 border-t border-[#1f2844] bg-[#0a0f1f] mt-auto text-center relative z-10">
        <p className="text-[10px] sm:text-xs text-[#a8c5ff]">
          &copy; 2026 Roomify. Projet Académique PFA/PFE - Conçu pour impressionner le Jury.
        </p>
      </footer>
    </div>
  );
}
