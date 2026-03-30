Liste de tâches – Application Web Gestion de Garage
Légende : ✅ Fait | 🔄 En cours | ⬜ À faire

---

1. Configuration projet

✅ 1.1 Créer le dépôt Git / versioning
✅ 1.2 Initialiser projet Next.js pour le front
✅ 1.3 Initialiser projet FastAPI pour le backend
✅ 1.4 Configurer Firebase (Auth, Firestore, Storage)
✅ 1.5 Installer librairies nécessaires (reportlab, react-select, axios, etc.)

---

2. Authentification (Firebase Auth)

✅ 2.1 Sign-up utilisateur (garagiste / admin)
✅ 2.2 Login utilisateur
⬜ 2.3 Gestion des rôles et permissions
✅ 2.4 Sécuriser routes API backend avec tokens Firebase

---

3. Module Clients

✅ 3.1.1 Ajouter client (drawer, sans quitter la page)
✅ 3.1.2 Modifier client
✅ 3.1.3 Désactiver / Réactiver client
✅ 3.1.4 Rechercher client par nom/téléphone
✅ 3.1.5 Champs véhicule et notes internes ajoutés
✅ 3.2.1 Afficher toutes les factures liées au client
⬜ 3.2.2 Filtrer historique par date / type de service / pièces

---

4. Module Pièces

✅ 4.1.1 Ajouter pièce (drawer, sans quitter la page)
✅ 4.1.2 Modifier pièce
✅ 4.1.3 Désactiver / Réactiver pièce
✅ 4.1.4 Liste des pièces
⬜ 4.2.1 Alertes stock bas (V2)
⬜ 4.2.2 Historique mouvement stock (V2)

---

5. Module Services

✅ 5.1.1 Ajouter service (drawer, sans quitter la page)
✅ 5.1.2 Modifier service
✅ 5.1.3 Désactiver / Réactiver service
✅ 5.1.4 Liste des services

---

6. Module Factures

✅ 6.1.1 Sélection client (react-select recherchable + ajout rapide)
✅ 6.1.2 Sélection pièces (react-select recherchable + ajout rapide)
✅ 6.1.3 Sélection services (react-select recherchable + ajout rapide)
✅ 6.1.4 Calcul total pièces, services et taxes (TPS+TVQ Québec)
✅ 6.1.5 Génération PDF imprimable (ReportLab)
✅ 6.1.6 Stockage PDF dans Firebase
✅ 6.1.7 Numéro de facture lisible (F-2026-001)
✅ 6.1.8 Champ véhicule sur la facture (affiché sur fiche + PDF)
✅ 6.1.9 Notes internes mécanicien (non visibles sur PDF client)
✅ 6.2.1 Statut véhicule : En cours
✅ 6.2.2 Statut véhicule : Prêt
✅ 6.3.1 Historique factures par client
⬜ 6.3.2 Filtrer par date / type de service / pièce

---

7. Notifications et rappels

✅ 7.1.1 Détecter changement statut véhicule → prêt
✅ 7.1.2 Envoyer message automatique (SMS / WhatsApp) au client (Twilio)
⬜ 7.2.1 Rappels entretien – détecter type (V2)
⬜ 7.2.2 Rappels entretien – calculer date (V2)
⬜ 7.2.3 Rappels entretien – envoyer notification (V2)
✅ 7.3.1 Historique notifications envoyées
✅ 7.3.2 Statut message (envoyé / reçu / échoué)

---

8. Frontend – Pages & UX

✅ 8.1.1 Dashboard : stats véhicules en cours / prêts / clients / factures du jour
✅ 8.1.2 Dashboard : accès rapide avec drawers (client, facture, pièce, service)
✅ 8.2.1 Clients : ajouter / modifier via drawer
✅ 8.2.2 Clients : historique factures sur la fiche
✅ 8.3.1 Pièces & Services : ajouter / modifier / désactiver / réactiver
✅ 8.3.2 Pièces & Services : sélection via react-select dans formulaire facture
✅ 8.4.1 Factures : formulaire création via drawer
✅ 8.4.2 Factures : affichage PDF
✅ 8.4.3 Factures : mise à jour statut véhicule
✅ 8.5.1 Notifications : messages automatiques (déclenchés auto au statut prêt)
✅ 8.5.2 Notifications : historique

---

9. Tests & Déploiement

⬜ 9.1 Tests unitaires backend
⬜ 9.2 Tests front-end
⬜ 9.3 Tests intégration
⬜ 9.4 Déploiement (Vercel / Firebase)
⬜ 9.5 Documentation technique

---

Bugs corrigés en cours de route :
✅ Stats dashboard : mismatch snake_case / camelCase
✅ Réactivation impossible après désactivation (clients, pièces, services)
✅ Notes visibles sur PDF client → rendues internes uniquement
