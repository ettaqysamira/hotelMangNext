# ⚙️ n8n Automation Workflows Blueprints

Ce dossier contient les spécifications et guides d'importation des 4 workflows d'automatisation **n8n** pour le **Smart Hostel Management System**.

---

## 📋 Table des Workflows
1. [Workflow 1 : Tri & Assignation des Réclamations par IA](#workflow-1)
2. [Workflow 2 : Relance des Factures & Extras Impayés](#workflow-2)
3. [Workflow 3 : Rapport Financier Mensuel Généré par IA](#workflow-3)
4. [Workflow 4 : Notification, Contrat & QR Code de Réservation](#workflow-4)

---

<a name="workflow-1"></a>
## 🛠️ Workflow 1 : Tri & Assignation des Réclamations par IA

Ce workflow intercepte la déclaration d'une réclamation d'un voyageur (ex: *"Climatiseur en panne"*, *"WiFi inaccessible"*), appelle Hugging Face pour classifier le problème, puis met à jour le ticket en l'assignant à l'agent compétent.

### Structure des Nœuds n8n
1. **Webhook Trigger Node** :
   * **Path** : `webhooks/complaints`
   * **Method** : `POST`
   * **JSON Response** : `{"message": "Complaint received"}`
2. **HTTP Request Node (Hugging Face Inference)** :
   * **URL** : `https://api-inference.huggingface.co/models/facebook/bart-large-mnli`
   * **Headers** : `Authorization: Bearer {{ $env.HUGGING_FACE_API_KEY }}`
   * **Method** : `POST`
   * **Body** :
     ```json
     {
       "inputs": "{{ $json.body.description }}",
       "parameters": {
         "candidate_labels": ["NETWORK", "PLUMBING", "ELECTRICITY", "CLEANLINESS", "LOCKER", "NOISE", "OTHER"]
       }
     }
     ```
3. **HTTP Request Node (API Patch Callback)** :
   * **URL** : `http://localhost:5000/api/complaints/{{ $json.body.complaintId }}/auto-assign`
   * **Method** : `PATCH`
   * **Body** :
     ```json
     {
       "category": "{{ $json.labels[0] }}",
       "priority": "{{ $json.scores[0] > 0.8 ? 'HIGH' : 'MEDIUM' }}"
     }
     ```
4. **Nodemailer Node (Email de confirmation)** :
   * **To** : `{{ $json.body.guestEmail }}`
   * **Subject** : `Votre réclamation n°{{ $json.body.complaintId }} a été prise en compte`
   * **HTML Body** :
     ```html
     Bonjour {{ $json.body.guestName }},<br><br>
     Votre problème concernant "<b>{{ $json.body.title }}</b>" a été catégorisé comme <b>{{ $json.labels[0] }}</b>.<br>
     Un agent de maintenance a été automatiquement assigné pour résoudre le problème rapidement.<br><br>
     Cordialement,<br>L'équipe Smart Hostel
     ```

---

<a name="workflow-2"></a>
## 🛠️ Workflow 2 : Relance des Factures & Extras Impayés

Ce workflow tourne en tâche de fond pour détecter les factures de dortoirs ou extras (bars, excursions) en retard afin de relancer les voyageurs par email avant leur arrivée ou départ.

### Structure des Nœuds n8n
1. **Cron Trigger Node** :
   * **Schedule** : Every day at 08:00 AM
2. **HTTP Request Node (Get Overdue Payments)** :
   * **URL** : `http://localhost:5000/api/payments/overdue`
   * **Method** : `GET`
   * **Headers** : `Authorization: Bearer <Cron-Service-Token>`
3. **Loop Over Items (Loop Node)** :
   * Loops through `overduePayments` array
4. **Nodemailer Node (Email de Relance)** :
   * **To** : `{{ $json.booking.guest.user.email }}`
   * **Subject** : `⚠️ ALERTE : Paiement en retard - Facture n°{{ $json.invoiceNumber }}`
   * **HTML Body** :
     ```html
     Bonjour {{ $json.booking.guest.user.firstName }},<br><br>
     Sauf erreur de notre part, la facture n°<b>{{ $json.invoiceNumber }}</b> d'un montant de <b>{{ $json.amount }} EUR</b> est en retard de paiement.<br>
     Veuillez régulariser votre situation en réglant en ligne via le lien suivant : <br>
     <a href="http://localhost:3000/checkout/pay?paymentId={{ $json.id }}">Régler ma facture en ligne</a><br><br>
     Cordialement,<br>La Comptabilité Smart Hostel
     ```

---

<a name="workflow-3"></a>
## 🛠️ Workflow 3 : Rapport Financier Mensuel Généré par IA

Ce workflow génère automatiquement au format PDF un rapport de performances de l'auberge le premier jour de chaque mois, incluant un résumé analytique généré par LLM.

### Structure des Nœuds n8n
1. **Cron Trigger Node** :
   * **Schedule** : 1st day of the month at 00:05 AM
2. **HTTP Request Node (Fetch monthly stats)** :
   * **URL** : `http://localhost:5000/api/analytics/monthly-stats`
   * **Method** : `GET`
3. **HTTP Request Node (Hugging Face LLM Prompt)** :
   * **URL** : `https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct`
   * **Method** : `POST`
   * **Body** :
     ```json
     {
       "inputs": "Compile et analyse les statistiques mensuelles suivantes de notre auberge de jeunesse pour le manager. Fais une analyse professionnelle des forces, faiblesses, et donne 3 recommandations d'optimisation des tarifs Dortoirs vs Privés :\n{{ $json.stats }}"
     }
     ```
4. **Generate PDF Node (Carbone.io or HTML-to-PDF)** :
   * **Template HTML** containing statistical values, income graphs, and the LLM analysis response.
   * Outputs a PDF binary file.
5. **Nodemailer Node (Send Email to Admins)** :
   * **To** : `manager@smarthostel.com, admin@smarthostel.com`
   * **Subject** : `📊 Bilan Mensuel de Performance - Smart Hostel`
   * **Attachments** : Attach generated PDF binary.

---

<a name="workflow-4"></a>
## 🛠️ Workflow 4 : Notification, Contrat & QR Code de Réservation

Ce workflow intercepte la confirmation de réservation (paiement validé), génère le QR Code de Check-in, puis transmet le reçu de paiement par email.

### Structure des Nœuds n8n
1. **Webhook Trigger Node** :
   * **Path** : `webhooks/bookings`
   * **Method** : `POST`
2. **Conditional (Switch Node)** :
   * Check if event type is `BOOKING_CONFIRMED`.
3. **Nodemailer Node (Email de Confirmation avec QR Code)** :
   * **To** : `{{ $json.guestEmail }}`
   * **Subject** : `Votre séjour chez Smart Hostel est validé ! 🎉`
   * **HTML Body** :
     ```html
     Bonjour {{ $json.guestName }},<br><br>
     Votre réservation de lit dans la chambre <b>{{ $json.roomNumber }}</b> de l'établissement <b>{{ $json.hostelName }}</b> est confirmée.<br>
     Présentez simplement le QR Code ci-dessous à l'accueil lors de votre arrivée pour un enregistrement rapide :<br><br>
     <img src="{{ $json.qrCodeDataUrl }}" alt="QR Check-in"><br><br>
     A très bientôt !
     ```

---

## 📥 Comment importer ces workflows dans n8n
1. Créez un nouveau workflow sur votre interface n8n.
2. Cliquez sur les trois petits points en haut à droite, puis sur **"Import from File"** ou copiez directement le contenu JSON d'un nœud et faites un Ctrl+V sur la grille de n8n.
