Cahier des charges complet - Application Web Gestion de Garage
1. Présentation du projet
Nom du projet : à définir
Objectif : Développer une application web permettant aux garages de gérer :
- clients, pièces et services, factures, statuts véhicules, notifications automatiques.
Public cible : Garages traditionnels au Québec, peu technophiles.
2. Fonctionnalités principales (MVP)
2.1 Clients
- Ajouter / modifier / désactiver
- Rechercher par nom/téléphone
- Historique complet des réparations/factures
- Archivage
2.2 Pièces
- Ajouter / modifier / désactiver
- Prix configurable
- Option "fournie par le client"
- Quantité en stock (optionnel)
- Historique utilisation
2.3 Services
- Ajouter / modifier / désactiver
- Prix configurable
- Historique utilisation
2.4 Factures
- Sélection client
- Sélection pièces et services séparément
- Calcul total automatique + taxes
- Gestion pièces fournies par client
- PDF imprimable + stockage automatique
- Statut véhicule (En cours / Prêt)
2.5 Notifications automatiques
- Message client "voiture prête"
3. Fonctionnalités évolutives (V2+)
- Rappels entretien
- Gestion stock
- Suivi financier
- Statistiques avancées
- Notifications SMS/WhatsApp
4. Architecture technique
Backend : FastAPI, Firebase Auth, Firestore, génération PDF, notifications
Frontend : Next.js + React, Dashboard, Clients, Pièces, Services, Factures, Notifications
5. Base de données (Firestore)
Clients: client_id, nom, téléphone, historique, date_creation
Pièces: piece_id, nom, prix, active, quantite, fournie_par_client
Services: service_id, nom, prix, active
Factures: facture_id, client_id, pieces, services, total_pieces, total_services, taxes, total_facture,
date_creation, statut_vehicule, PDF_url
6. Endpoints API
Auth, Clients, Pièces, Services, Factures, Notifications (CRUD + spécifiques)
7. Génération PDF
- Clair et lisible, pièces/services séparés, mention pièces fournies
- Stockage Firebase
8. Contraintes
- Interface simple
- Sécurité Firebase + validation FastAPI
- Responsive
- Modularité pour V2
9. Livrables
- Application web MVP
- Base Firestore
- Documentation technique
- Manuel utilisateur simplifié