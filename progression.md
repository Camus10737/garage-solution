# Progression – Application Web Gestion de Garage

## Statut général

| Couche | Statut |
|---|---|
| Frontend (Next.js) | ✅ Terminé |
| Backend (FastAPI) | ✅ Terminé |
| Base de données (Firestore) | ✅ Terminé |
| Déploiement | 🔄 Cloud Functions en ligne, hébergement web à faire |

---

## Frontend — Next.js 16 + React + Tailwind CSS

### Configuration
- [x] Projet Next.js initialisé (`frontend/`)
- [x] Firebase configuré (`src/lib/firebase.ts`) — Auth, Firestore, Storage
- [x] Client API Axios avec token Firebase (`src/lib/api.ts`)
- [x] Variables d'environnement (`.env.local`)
- [x] Types TypeScript partagés (`src/types/index.ts`) — Client, Pièce, Service, Facture, Notification

### Authentification
- [x] Contexte Auth Firebase (`src/contexts/AuthContext.tsx`) — login, logout, signup
- [x] Redirection automatique vers `/login` si non connecté
- [x] Page de connexion (`/login`)
- [x] (P9b) `signup(nomUtilisateur, nomGarage, email, password)` : Firebase puis `POST /garages`
      (bootstrap garage + Admin) ; page `/inscription`
- [x] (P9b) `AuthContext` expose `role`/`roleLoading`/`garageNom` — un seul `GET /auth/moi` par
      session, une fois l'utilisateur Firebase résolu

### Layout
- [x] Sidebar avec navigation (`src/components/layout/Sidebar.tsx`)
- [x] Header avec email utilisateur (`src/components/layout/Header.tsx`)
- [x] Layout protégé réutilisable (`src/components/layout/AppLayout.tsx`)
- [x] (P9b) `src/lib/permissions.ts` — table `ROUTE_ROLES` unique consultée par `Sidebar` (items
      masqués) et `AppLayout` (redirection si la route courante n'est pas permise pour le rôle ;
      atterrissage par défaut `/export-comptable` pour Comptable, `/dashboard` pour les autres)

### Routes et pages (32 routes, dont 1 publique)

Les anciennes pages `/[entité]/[id]/modifier` ont été remplacées par des drawers de modification
inline (voir composants réutilisables) et supprimées.

| Route | Fichier | Description |
|---|---|---|
| `/` | `app/page.tsx` | Redirection auto login/dashboard |
| `/login` | `app/login/page.tsx` | Connexion Firebase |
| `/inscription` | `app/inscription/page.tsx` | (P9b) Création de compte : nom, nom du garage, email, mot de passe → bootstrap `POST /garages` |
| `/dashboard` | `app/dashboard/page.tsx` | Stats (stock bas, notifications échouées) + factures récentes + accès rapide |
| `/clients` | `app/clients/page.tsx` | Liste + recherche nom/téléphone + désactivation |
| `/clients/nouveau` | `app/clients/nouveau/page.tsx` | Formulaire d'ajout |
| `/clients/[id]` | `app/clients/[id]/page.tsx` | Fiche client + section véhicules + historique factures + notifications envoyées |
| `/pieces` | `app/pieces/page.tsx` | Liste pièces + alerte stock bas + désactivation |
| `/pieces/nouvelle` | `app/pieces/nouvelle/page.tsx` | Formulaire d'ajout |
| `/pieces/[id]` | `app/pieces/[id]/page.tsx` | Fiche pièce : fournisseurs liés + marge, historique mouvements de stock |
| `/services` | `app/services/page.tsx` | Liste services + désactivation |
| `/services/nouveau` | `app/services/nouveau/page.tsx` | Formulaire d'ajout |
| `/fournisseurs` | `app/fournisseurs/page.tsx` | Liste + recherche + désactivation |
| `/fournisseurs/[id]` | `app/fournisseurs/[id]/page.tsx` | Fiche fournisseur + historique commandes + solde dû |
| `/commandes-fournisseur` | `app/commandes-fournisseur/page.tsx` | Liste + filtres statut + création multi-lignes |
| `/commandes-fournisseur/[id]` | `app/commandes-fournisseur/[id]/page.tsx` | Détail + réception (partielle/complète) + paiements |
| `/commandes-speciales` | `app/commandes-speciales/page.tsx` | Liste + filtres statut + création (client→véhicule→pièce→fournisseur) + changement statut |
| `/devis` | `app/devis/page.tsx` | Liste + filtres par statut (brouillon/en attente/accepté/refusé) |
| `/devis/[id]` | `app/devis/[id]/page.tsx` | Détail + envoyer (email/SMS) + accepter/refuser + convertir en facture |
| `/factures` | `app/factures/page.tsx` | Liste + filtres 4 statuts réparation + badge statut paiement |
| `/factures/nouvelle` | `app/factures/nouvelle/page.tsx` | Création : client + véhicule (dropdown) + pièces + services + taxes TPS+TVQ |
| `/factures/[id]` | `app/factures/[id]/page.tsx` | Détail complet : statut réparation, historique, mécanicien, paiements, rappel de paiement, annulation, ajout de ligne |
| `/reserver/[garageId]` | `app/reserver/[garageId]/page.tsx` | **Publique, sans authentification** — page de réservation en ligne, un lien par garage (P9a : route dynamique, était `/reserver` statique) |
| `/rendez-vous` | `app/rendez-vous/page.tsx` | Gestion authentifiée : compléter/annuler/reprogrammer + créer un devis pré-rempli |
| `/rappels-entretien` | `app/rappels-entretien/page.tsx` | Modèles de rappel (CRUD + modèles standards) + rappels dus (calcul en direct) avec envoi sélectif/groupé |
| `/promotions` | `app/promotions/page.tsx` | Liste + filtres statut + création (ciblage tous/manuel) + envoyer/annuler |
| `/notifications` | `app/notifications/page.tsx` | Historique (avec canal) + stats envoyé/reçu/échoué |
| `/parametres` | `app/parametres/page.tsx` | (Admin) Infos du garage (nom/adresse/tél/email/province/logo/taxes en lecture seule) + taux horaire par défaut + canal de notification par type |
| `/utilisateurs` | `app/utilisateurs/page.tsx` | (P9b, Admin) Gestion des utilisateurs : tableau + tiroir de création/édition, rôle, actif/inactif |
| `/export-comptable` | `app/export-comptable/page.tsx` | Période (rapide ou libre) + résumé financier + export CSV/Excel/PDF |

### Composants réutilisables

| Composant | Fichier |
|---|---|
| Formulaire client | `src/components/clients/ClientForm.tsx` |
| Formulaire véhicule | `src/components/vehicules/VehiculeForm.tsx` (dont VIN et kilométrage optionnels) |
| Formulaire pièce | `src/components/pieces/PieceForm.tsx` (dont numéro d'item, catégorie, emplacement, seuil d'alerte, fournisseurs liés) |
| Formulaire service | `src/components/services/ServiceForm.tsx` |
| Formulaire fournisseur | `src/components/fournisseurs/FournisseurForm.tsx` |
| Formulaire commande fournisseur | `src/components/commandes-fournisseur/CommandeFournisseurForm.tsx` (multi-lignes pièces + prix d'achat) |
| Formulaire devis | `src/components/devis/DevisForm.tsx` (pièces + services + lignes main d'œuvre libres) |
| Formulaire modèle de rappel | `src/components/rappels/ModeleRappelForm.tsx` |

### Librairies installées
- `firebase` — Auth + Firestore + Storage
- `axios` — appels API backend
- `react-hook-form` + `@hookform/resolvers` + `zod` — formulaires avec validation
- `lucide-react` — icônes

### Build
- [x] `npm run build` — ✅ 0 erreur TypeScript, 0 warning

---

## Backend — FastAPI ✅ Terminé

### Structure (`backend/`)
```
backend/
├── main.py                          # Point d'entrée FastAPI + CORS
├── requirements.txt                 # Dépendances Python
├── .env.example                     # Template variables d'environnement
├── core/
│   ├── firebase.py                  # Init Firebase Admin SDK
│   └── auth.py                      # Middleware vérification token Firebase
├── schemas/
│   ├── client.py                    # Pydantic : ClientCreate/Update/Patch/Out
│   ├── vehicule.py                  # Pydantic : VehiculeCreate/Update/Out (dont vin, kilometrage_actuel optionnels)
│   ├── piece.py                     # Pydantic : PieceCreate/Update/Patch/Out + numero_item/categorie/emplacement/seuil_alerte/fournisseurs
│   ├── service.py                   # Pydantic : ServiceCreate/Update/Patch/Out
│   ├── fournisseur.py               # Pydantic : FournisseurCreate/Update/Patch/Out
│   ├── commande_fournisseur.py      # Pydantic : CommandeFournisseurCreate/Out + lignes + réception + paiements
│   ├── commande_speciale.py         # Pydantic : CommandeSpecialeCreate/Patch/Out
│   ├── mouvement_stock.py           # Pydantic : MouvementStockOut
│   ├── facture.py                   # Pydantic : FactureCreate/Patch/Out + lignes + vehicule_info + devis_id + statut_reparation/paiements/annulation
│   ├── devis.py                     # Pydantic : DevisCreate/Patch/Out + lignes pièces/services/main d'œuvre
│   ├── parametre.py                 # Pydantic : ParametresOut/Update (taux horaire, canaux, horaires d'ouverture, baies, durée rdv, plages bloquées)
│   ├── notification.py              # Pydantic : NotificationOut (dont canal, types "promotion"/"rdv_confirme"/"rdv_rappel")
│   ├── export_comptable.py          # Pydantic : ResumeComptable
│   ├── rappel.py                    # Pydantic : ModeleRappelCreate/Update/Patch/Out, RappelDu (calculé), EnvoyerRappelsBody
│   ├── promotion.py                 # Pydantic : PromotionCreate/Update/Out
│   └── rendez_vous.py               # Pydantic : RendezVousCreate/Out/Patch/Reprogrammer, CreneauDisponible
├── routers/
│   ├── clients.py                   # CRUD + historique factures
│   ├── vehicules.py                 # CRUD véhicules par client (suppression bloquée si factures)
│   ├── pieces.py                    # CRUD + filtre active_only + unicité numero_item + historique mouvements
│   ├── services.py                  # CRUD + filtre active_only
│   ├── fournisseurs.py              # CRUD + historique commandes fournisseur
│   ├── commandes_fournisseur.py     # CRUD + réception (partielle/complète) + paiements
│   ├── commandes_speciales.py       # CRUD + changement de statut (incrémente stock + notifie à la réception)
│   ├── factures.py                  # CRUD + vehicule_id + calcul TPS/TVQ + PDF + notification + _creer_facture/_decrementer_stock réutilisables
│   ├── devis.py                     # CRUD + transitions de statut + conversion en facture + envoi email/SMS
│   ├── notifications.py             # Historique notifications (filtre client_id)
│   ├── parametres.py                # GET/PUT taux horaire par défaut + canaux de notification
│   ├── export_comptable.py          # Résumé financier + export CSV/Excel/PDF par période
│   ├── modeles_rappel.py            # CRUD modèles de rappel d'entretien
│   ├── rappels_entretien.py         # GET rappels dus (calcul en direct) + POST envoyer
│   ├── promotions.py                # CRUD + envoyer (groupé) + annuler
│   ├── rendez_vous.py               # 2 routes PUBLIQUES (creneaux-disponibles, création) + gestion authentifiée (liste, statut, reprogrammer)
│   └── dashboard.py                 # Stats (en_cours, prêts, clients, factures/jour, pièces stock bas)
└── services/
    ├── pdf_service.py               # Génération PDF ReportLab (factures ET devis) + upload Firebase Storage
    ├── notification_service.py      # Moteur central notifications (Module 12) : SMS/WhatsApp Twilio + email, canal résolu depuis parametres, _log_notification unique
    ├── email_service.py             # Envoi email SMTP : PDF (factures/devis) + texte simple (notifications automatiques)
    ├── tax_service.py               # Calcul TPS/TVQ partagé (factures + devis)
    ├── export_comptable_service.py  # Résumé + génération CSV/Excel (openpyxl)/PDF (réutilise les styles de pdf_service.py)
    ├── rappel_service.py            # Calcul des rappels dus (km/date) + envoi — source de vérité, dupliquée dans functions/rappel_logic.py
    └── rendez_vous_service.py       # Créneaux disponibles, résolution client/véhicule par téléphone, création + rappel 24h — dupliquée dans functions/rdv_logic.py
```

### Cloud Functions planifiées (`functions/`, Modules 10 + 11)
Firebase Functions Python 2ᵉ génération, hors du serveur FastAPI, pour un déclenchement vraiment
automatique des rappels. Code livré et prêt, **pas déployé** — nécessite le forfait Blaze et l'accès
Firebase de l'utilisateur (`firebase deploy --only functions` depuis la racine).
- `functions/main.py` — deux fonctions planifiées : rappels d'entretien (`@scheduler_fn.on_schedule`,
  tous les jours 8h America/Toronto) et rappels de rendez-vous (toutes les 60 minutes)
- `functions/rappel_logic.py` / `functions/rdv_logic.py` — versions autonomes (Firestore direct, sans
  FastAPI) de `backend/services/rappel_service.py` / `rendez_vous_service.py`, dupliquées
  intentionnellement (le paquet de déploiement ne contient que `functions/` — voir commentaires des
  fichiers)
- `functions/notification_helpers.py` — helpers d'envoi SMS/email/canal **partagés** entre les deux
  (sûr : même paquet de déploiement, contrairement à la frontière backend/functions)
- `functions/requirements.txt`, `functions/.env.example`, `functions/.gitignore`
- `firebase.json` et `.firebaserc` (racine du repo) — projet Firebase `garage-solution`

### Endpoints implémentés

#### Auth
- [x] Middleware `verify_token` — vérification token Firebase sur toutes les routes

#### Clients `/clients`
- [x] `GET /clients` — liste + recherche nom/téléphone
- [x] `POST /clients` — créer (sans champs véhicule, gérés séparément)
- [x] `GET /clients/{id}` — détail
- [x] `PUT /clients/{id}` — modifier
- [x] `PATCH /clients/{id}` — désactiver/réactiver
- [x] `GET /clients/{id}/factures` — historique factures du client

#### Véhicules `/vehicules`
- [x] `GET /vehicules?client_id=X` — liste des véhicules d'un client
- [x] `POST /vehicules` — créer (marque_modele, annee, taille_moteur, plaque, notes)
- [x] `PUT /vehicules/{id}` — modifier
- [x] `DELETE /vehicules/{id}` — supprimer (bloqué si factures liées)

#### Pièces `/pieces`
- [x] `GET /pieces` — liste (filtre `active_only`)
- [x] `POST /pieces` — refuse si `numero_item` déjà utilisé par une autre pièce active
- [x] `GET /pieces/{id}`
- [x] `PUT /pieces/{id}` — idem contrôle d'unicité `numero_item`
- [x] `PATCH /pieces/{id}` — désactiver/réactiver
- [x] `GET /pieces/{id}/mouvements` — historique des mouvements de stock (entrées/sorties)
- [x] Champs : `numero_item`, `categorie`, `emplacement`, `seuil_alerte`, `fournisseurs: [{fournisseur_id, prix_achat, delai_livraison}]`

#### Fournisseurs `/fournisseurs`
- [x] `GET /fournisseurs` — liste + recherche par nom
- [x] `POST /fournisseurs` / `GET /fournisseurs/{id}` / `PUT /fournisseurs/{id}` / `PATCH /fournisseurs/{id}` — CRUD + désactiver/réactiver
- [x] `GET /fournisseurs/{id}/commandes` — historique des commandes fournisseur

#### Commandes fournisseur `/commandes-fournisseur`
- [x] `GET /commandes-fournisseur` (filtres `fournisseur_id`, `statut`) / `POST` (multi-lignes, numérotation `CF-2026-001`)
- [x] `GET /commandes-fournisseur/{id}`
- [x] `POST /commandes-fournisseur/{id}/reception` — réception partielle ou complète par ligne, incrémente le stock des pièces reçues, journalise chaque entrée dans `mouvements_stock`, recalcule le statut (`commandee`/`partiellement_recue`/`recue`), complète automatiquement la commande spéciale liée si applicable (sans double incrément de stock)
- [x] `POST /commandes-fournisseur/{id}/paiements` — réutilise `_recalculer_paiement` de `routers/factures.py`

#### Commandes spéciales `/commandes-speciales`
- [x] `GET /commandes-speciales` (filtres `client_id`, `statut`) / `POST` (client + véhicule + devis optionnel + pièce + fournisseur + prix d'achat)
- [x] `PATCH /commandes-speciales/{id}` — statut `commandee` → `en_transit` → `recue` ; passage à `recue` incrémente le stock, journalise le mouvement, notifie le client par SMS (type `piece_recue`)

#### Services `/services`
- [x] `GET /services` — liste (filtre `active_only`)
- [x] `POST /services`
- [x] `GET /services/{id}`
- [x] `PUT /services/{id}`
- [x] `PATCH /services/{id}` — désactiver/réactiver

#### Factures `/factures`
- [x] `GET /factures` — liste (filtre `statut` : en_attente/en_attente_piece/en_cours/fini) + enrichissement `vehicule_info`
- [x] `POST /factures` — création avec `vehicule_id` + calcul TPS (5%) + TVQ (9,975%) + génération PDF
- [x] `GET /factures/{id}` — enrichi avec `vehicule_info`
- [x] `PATCH /factures/{id}` — met à jour `statut_reparation` (en_attente/en_attente_piece/en_cours/fini, transitions libres), ajoute une entrée à `historique_statuts`, notifie le client par SMS à chaque changement réel (refusé si facture annulée)
- [x] `PATCH /factures/{id}/mecanicien` — assigne/retire un mécanicien (champ texte libre pour l'instant, deviendra une vraie relation utilisateur en P9)
- [x] `POST /factures/{id}/pieces` / `POST /factures/{id}/services` — ajoute une ligne à une facture existante (pièce additionnelle découverte en cours de réparation), recalcule totaux/taxes/solde et régénère le PDF ; décrémente aussi le stock de la pièce ajoutée
- [x] Décrément automatique du stock à la création (`_creer_facture`) et à l'ajout d'une pièce (ignore `fournie_par_client=true` et les pièces au stock non suivi), journalisé dans `mouvements_stock`
- [x] Champ `devis_id` optionnel — renseigné automatiquement si la facture provient d'un devis converti
- [x] `POST /factures/{id}/paiements` — enregistre un paiement (montant + méthode comptant/carte/virement/chèque), recalcule `montant_paye`/`solde_restant`/`statut_paiement`, refuse si le montant dépasse le solde restant ou si la facture est annulée
- [x] `POST /factures/{id}/annuler` — annule la facture (raison optionnelle) ; aucune suppression possible, la facture reste visible et verrouillée (plus de paiement, de changement de statut, de mécanicien ni d'ajout de ligne)
- [x] `statut_paiement` et `statut_reparation` toujours recalculés/normalisés à la lecture (depuis `paiements`/`total_facture`, et depuis l'ancien `statut_vehicule` si absent) — robuste même pour les factures créées avant ces ajouts, sans script de migration

#### Devis `/devis`
- [x] `GET /devis` — liste (filtres `statut`, `client_id`) + enrichissement `vehicule_info`
- [x] `POST /devis` — création avec pièces + services (prix fixe) + main d'œuvre (heures × taux horaire), numérotation `D-2026-001`, génération PDF
- [x] `GET /devis/{id}`
- [x] `PATCH /devis/{id}` — changement de statut avec transitions validées (brouillon→en_attente→{accepté,refusé})
- [x] `POST /devis/{id}/convertir` — crée une facture à partir d'un devis accepté (lignes/totaux repris, jamais de ressaisie), devis marqué `converti` + `facture_id`, jamais supprimé
- [x] `POST /devis/{id}/envoyer?canal=email|sms` — envoi au client

#### Notifications `/notifications` — moteur central (Module 12)
- [x] `GET /notifications` (filtre `client_id` optionnel) — historique avec `canal` (sms/whatsapp/email) et statut envoyé/reçu/échoué
- [x] **Tous** les envois transitent maintenant par ce module et sont journalisés, y compris les envois par courriel (facture, devis) qui ne l'étaient pas avant cette phase
- [x] Canal résolu dynamiquement pour les notifications automatiques (`statut_reparation`, `piece_recue`, `rappel_paiement`) via `parametres.canaux_notification` — repli sur SMS si le client n'a pas d'email et que le courriel est configuré
- [x] `POST /factures/{id}/rappel-paiement` — nouveau, notifie le client du solde restant dû

#### Paramètres `/parametres`
- [x] `GET /parametres` — taux horaire par défaut (valeur par défaut si non configuré) + `canaux_notification`
- [x] `PUT /parametres` — mise à jour (remplace tout le document)

#### Dashboard `/dashboard`
- [x] `GET /dashboard/stats` — véhicules en_cours (en_attente + en_attente_piece + en_cours), prêts (fini), clients actifs, factures du jour, `pieces_stock_bas`, `notifications_echouees_7j` (échecs signalés proactivement)

#### Export comptable `/export-comptable` (Module 8)
- [x] `GET /export-comptable/resume?date_debut=&date_fin=` — revenus payés/en attente/annulés, TPS et TVQ collectées séparément (recalculées depuis le sous-total stocké — `Facture.taxes` ne garde que le total combiné), dépenses fournisseurs payées/dues, profit net approximatif, comptes à recevoir/à payer, tout calculé sur la période
- [x] `GET /export-comptable/export?date_debut=&date_fin=&format=csv|xlsx|pdf` — export détaillé (factures + commandes fournisseur de la période), en pièce jointe téléchargeable
- [x] CSV : données tabulaires pures (stdlib `csv`). Excel (`openpyxl`) : feuilles Résumé/Factures/Fournisseurs. PDF : page résumé + tableaux détaillés, réutilise les styles de `pdf_service.py`
- [x] Restriction au rôle Comptable/Admin appliquée (P9b) : `require_roles("admin", "comptable")` sur les deux endpoints, Gestionnaire exclu

#### Modèles de rappel `/modeles-rappel` + Rappels d'entretien `/rappels-entretien` (Module 10)
- [x] `GET/POST /modeles-rappel`, `PUT/PATCH /modeles-rappel/{id}` — CRUD (nom, déclencheur km/date/les deux, valeurs, message, promotion liée, actif)
- [x] `GET /rappels-entretien/dus` — calcule en direct les véhicules dus (kilométrage et/ou mois écoulés depuis le dernier rappel ou la dernière visite), avec la raison affichée
- [x] `POST /rappels-entretien/envoyer` (liste de `{vehicule_id, modele_id}`) — envoie et journalise dans `rappels_envoyes` (anti-doublon) et `notifications`
- [x] Champ `kilometrage` optionnel sur `POST /factures` — met à jour `vehicules/{id}.kilometrage_actuel` à la création

#### Promotions `/promotions` (Module 9)
- [x] CRUD (titre, description, période, ciblage tous/manuel via `client_ids`, méthode d'envoi)
- [x] `POST /promotions/{id}/envoyer` — envoi groupé (réutilise le moteur central de notifications), verrouille en statut `envoyee`
- [x] `POST /promotions/{id}/annuler` — uniquement si `brouillon`

#### Rendez-vous `/rendez-vous` (Module 11)
- [x] `GET /rendez-vous/creneaux-disponibles?date_debut=&date_fin=` — **public, sans authentification** ; ne renvoie que des créneaux horaires (aucune donnée client)
- [x] `POST /rendez-vous` — **public** ; résout/crée le client et le véhicule par correspondance téléphone/marque côté serveur (jamais de recherche publique de clients existants), revalide la disponibilité du créneau, confirme automatiquement, envoie la confirmation
- [x] `GET /rendez-vous` (filtre `statut`), `PATCH /rendez-vous/{id}` (statut), `POST /rendez-vous/{id}/reprogrammer` — authentifiés
- [x] `horaires_ouverture`, `nombre_baies`, `duree_rdv_minutes`, `plages_bloquees` ajoutés à `parametres/general`

#### Rôles & permissions, Utilisateurs, Garage (Modules 13 + 14, P9b)
- [x] `core/permissions.py::require_roles(*roles)` — dépendance FastAPI (`Depends(verify_token)` en
      interne, 403 si le rôle de l'utilisateur n'est pas dans la liste), remplace `Depends(verify_token)`
      sur les endpoints restreints des 15 routers concernés selon la matrice exacte du cahier
- [x] `core/auth.py::verify_token_raw` — décode le token Firebase sans exiger de `users/{uid}` existant,
      réservé au bootstrap (`POST /garages`, seul endroit où l'utilisateur n'en a par définition pas encore)
- [x] `GET/POST /utilisateurs`, `PATCH /utilisateurs/{uid}` (`routers/users.py`, Admin uniquement) — email
      jamais dupliqué dans Firestore, toujours lu à la volée via `firebase_admin.auth.get_user(uid)` ;
      garde-fou : impossible de désactiver/rétrograder le dernier Admin actif d'un garage
- [x] `POST /garages` (`routers/garage.py`, bootstrap avec `verify_token_raw`) — crée le garage et
      provisionne l'inscrit comme Admin ; 400 si l'appelant a déjà un `users/{uid}`
- [x] `GET/PUT /garage` (lecture tout rôle, écriture Admin), `POST /garage/logo` (upload Storage, Admin),
      `GET /garage/{garage_id}/public` (public, sans auth, pour `/reserver`) — `garages/{garage_id}`
      étendu avec adresse/téléphone/email/province/logo_url/numero_tps/numero_tvq ; les numéros de taxes
      sont stockés mais **absents de `GarageUpdate`** (aucun chemin d'écriture exposé au garage,
      conforme au cahier — "configurés par le support")
- [x] Constantes `GARAGE_NOM`/`GARAGE_ADRESSE`/`GARAGE_TEL` héritées du MVP mono-garage (5 fichiers :
      `pdf_service.py`, `export_comptable_service.py`, `email_service.py`, `notification_service.py`,
      `functions/notification_helpers.py`) remplacées par une lecture dynamique de `garages/{garage_id}`
      avec repli sur des valeurs par défaut — PDF, emails, SMS et `/reserver` affichent les vraies infos
      de chaque garage
- [x] Vérifié bout en bout avec de vrais tokens Firebase (Gestionnaire + Comptable créés via
      `POST /utilisateurs`, matrice testée exhaustivement, flux de bootstrap testé, garde-fou dernier
      Admin confirmé, données de test nettoyées après coup)

### Librairies
- `fastapi` + `uvicorn` — serveur
- `firebase-admin` — Firestore + Auth + Storage
- `reportlab` — génération PDF
- `openpyxl` — génération Excel (export comptable)
- `twilio` — SMS/WhatsApp
- `python-dotenv` — variables d'environnement
- `pydantic` v2 — validation

---

## Base de données — Firestore ✅ Terminé

### Multi-tenant (P9a)
Toutes les collections métier ci-dessous portent désormais un champ `garage_id`, filtré sur toute
liste et vérifié sur tout accès individuel (`core/tenant.py::verifier_appartenance`). Deux nouvelles
collections racines :
- [x] `garages/{garage_id}` (nom, date_creation) — infos complètes du garage (adresse, logo, taxes) en P9b
- [x] `users/{uid}` (garage_id, role, actif, date_creation) — clé = UID Firebase, lu par `verify_token` à
      chaque requête (caché 5 min avec le token) ; `role` stocké mais pas encore appliqué (P9b)

### Collections actives
- [x] `clients` — `garage_id`
- [x] `vehicules` — `garage_id` (client_id, marque_modele, annee, taille_moteur, plaque, vin, kilometrage_actuel, notes)
- [x] `pieces` — `garage_id` (numero_item, categorie, emplacement, seuil_alerte, fournisseurs: [{fournisseur_id, prix_achat, delai_livraison}])
- [x] `services` — `garage_id`
- [x] `fournisseurs` — `garage_id` (nom, telephone, email, notes, active, date_creation)
- [x] `commandes_fournisseur` — `garage_id` (fournisseur_id, numero_commande, lignes, montant_total, paiements, statut, commande_speciale_id) — numérotation CF-AAAA-### désormais scopée par garage
- [x] `commandes_speciales` — `garage_id` (client_id, vehicule_id, devis_id, piece_id, quantite, fournisseur_id, prix_achat, statut)
- [x] `mouvements_stock` — `garage_id` (piece_id, type entree/sortie, quantite, source, reference_id, date) — historique complet des entrées/sorties de stock
- [x] `factures` — `garage_id` (vehicule_id, devis_id, paiements/montant_paye/solde_restant/statut_paiement, annulee/raison_annulation/date_annulation, statut_reparation/historique_statuts/mecanicien_nom) — numérotation F-AAAA-### scopée par garage
- [x] `devis` — `garage_id` (client_id, vehicule_id, pieces, services, main_oeuvre, statut, converti, facture_id) — numérotation D-AAAA-### scopée par garage
- [x] `notifications` — `garage_id`, champ `canal` (sms/whatsapp/email), types promotion/rdv_confirme/rdv_rappel
- [x] `parametres` — doc renommé de `general` à `{garage_id}` (un jeu de paramètres par garage) : taux horaire par défaut, canaux_notification, horaires_ouverture, nombre_baies, duree_rdv_minutes, plages_bloquees
- [x] `modeles_rappel` — `garage_id` (nom, type_declencheur, valeur_km, valeur_mois, message, promotion_id, actif)
- [x] `rappels_envoyes` — `garage_id` (vehicule_id, modele_id, date_envoi, kilometrage) — historique anti-doublon
- [x] `promotions` — `garage_id` (titre, description, date_debut, date_fin, cible_tous, client_ids, methode_envoi, statut, date_envoi)
- [x] `rendez_vous` — `garage_id` (client_id, vehicule_id, type_service, description, date_heure, statut, rappel_envoye, date_creation) — les 2 endpoints publics prennent désormais `garage_id` en paramètre explicite

### Index composites Firestore (P9a)
- [x] `firestore.indexes.json` (nouveau, référencé dans `firebase.json`) — 19 index composites ajoutés
      pour les requêtes combinant `garage_id` avec un filtre et/ou un tri (`order_by`), découverts en
      testant empiriquement chaque nouvelle forme de requête contre le vrai projet Firestore
- [x] Déployés (`firebase deploy --only firestore:indexes`) et confirmés construits (re-testés après coup)

### Corrections apportées en session
- [x] Bug `load_dotenv()` manquant dans `main.py` → ajouté avec `override=True`
- [x] Bucket Firebase Storage corrigé : `garage-solution.firebasestorage.app`
- [x] Import Twilio rendu lazy (serveur démarre sans Twilio installé)
- [x] Génération PDF : URL publique (`blob.make_public()`) au lieu d'URL signée (évite les permissions IAM)
- [x] Couleur texte inputs frontend : ajout `text-gray-900 bg-white` sur tous les formulaires
- [x] Fix 403 au rechargement direct d'une page : `api.ts` attend maintenant que Firebase Auth soit prêt avant d'envoyer les requêtes (`waitForAuth()`)
- [x] Multi-véhicules par client : collection `vehicules` séparée, factures liées par `vehicule_id`, historique groupé par véhicule sur la fiche client
- [x] VIN optionnel ajouté sur véhicule, en complément de la plaque (P0, cahier des charges SAAS)
- [x] Suppression de `app/clients/[id]/modifier/page.tsx` — fichier orphelin corrompu (import invalide), déjà remplacé par le drawer de modification
- [x] Bug corrigé (P4) : `GET /clients/{id}/factures` plantait pour les anciennes factures depuis le renommage `statut_reparation` (P3) — contournait la normalisation ; corrigé en réutilisant `_enrich_facture`
- [x] Bug corrigé (P5) : les envois de facture/devis par courriel n'étaient jamais journalisés dans l'historique des notifications — corrigé
- [x] Page `/parametres` finalement construite (P5) — prévue dès P1, jamais faite jusqu'ici
- [x] Migration multi-tenant (P9a) : `backend/scripts/migrate_multitenant.py` exécuté sur les données
      réelles — garage "Mon Garage" créé, compte `test@gmail.com` provisionné Admin, toutes les données
      existantes rattachées (4 clients, 6 factures, 1 devis, 1 fournisseur, 1 commande fournisseur,
      1 commande spéciale, 2 mouvements de stock, 13 notifications, 3 pièces, 3 services, 2 véhicules)
- [x] Vérification bout en bout (P9a) : token Firebase réel obtenu pour `test@gmail.com`, appels
      authentifiés confirmant que toutes les données migrées restent visibles via les endpoints
      tenant-scopés (`/auth/moi`, `/clients`, `/factures`, `/devis`, `/dashboard/stats`, `/parametres`)
- [x] Inscription d'un nouveau garage temporairement indisponible (P9a → corrigé en P9b) : un compte
      Firebase créé hors du script de migration n'a pas de `users/{uid}` et est bloqué (403) au login

---

## Déploiement

- [x] Cloud Functions planifiées (2026-08-11) — `verifier_rappels_entretien` (quotidien 08h00
      America/Toronto) et `verifier_rappels_rendez_vous` (toutes les 60 min), projet Firebase
      `garage-solution`, région `us-central1`, Python 3.12 (2ᵉ génération). Prérequis réglés :
      environnement virtuel `functions/venv` (Python 3.12 installé via pyenv), dépendances
      installées, `functions/.env` créé (gitignored) avec les identifiants Twilio/SMTP copiés de
      `backend/.env`, politique de nettoyage des images de conteneur configurée (suppression après
      1 jour, évite une facturation de stockage qui s'accumule)
- [ ] Frontend sur Vercel
- [ ] Backend sur Cloud Run ou Railway
- [ ] Variables d'environnement de production
- [ ] Documentation technique
- [ ] Manuel utilisateur simplifié
