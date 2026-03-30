# Progression – Application Web Gestion de Garage

## Statut général

| Couche | Statut |
|---|---|
| Frontend (Next.js) | ✅ Terminé |
| Backend (FastAPI) | ✅ Terminé |
| Base de données (Firestore) | ✅ Terminé |
| Déploiement | ⏳ À faire |

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

### Layout
- [x] Sidebar avec navigation (`src/components/layout/Sidebar.tsx`)
- [x] Header avec email utilisateur (`src/components/layout/Header.tsx`)
- [x] Layout protégé réutilisable (`src/components/layout/AppLayout.tsx`)

### Routes et pages (15 routes)

| Route | Fichier | Description |
|---|---|---|
| `/` | `app/page.tsx` | Redirection auto login/dashboard |
| `/login` | `app/login/page.tsx` | Connexion Firebase |
| `/dashboard` | `app/dashboard/page.tsx` | Stats + factures récentes + accès rapide |
| `/clients` | `app/clients/page.tsx` | Liste + recherche nom/téléphone + désactivation |
| `/clients/nouveau` | `app/clients/nouveau/page.tsx` | Formulaire d'ajout |
| `/clients/[id]` | `app/clients/[id]/page.tsx` | Fiche client + section véhicules + historique groupé par véhicule |
| `/clients/[id]/modifier` | `app/clients/[id]/modifier/page.tsx` | Formulaire de modification |
| `/pieces` | `app/pieces/page.tsx` | Liste pièces + désactivation |
| `/pieces/nouvelle` | `app/pieces/nouvelle/page.tsx` | Formulaire d'ajout |
| `/pieces/[id]/modifier` | `app/pieces/[id]/modifier/page.tsx` | Formulaire de modification |
| `/services` | `app/services/page.tsx` | Liste services + désactivation |
| `/services/nouveau` | `app/services/nouveau/page.tsx` | Formulaire d'ajout |
| `/services/[id]/modifier` | `app/services/[id]/modifier/page.tsx` | Formulaire de modification |
| `/factures` | `app/factures/page.tsx` | Liste + filtres (tous / en cours / prêts) |
| `/factures/nouvelle` | `app/factures/nouvelle/page.tsx` | Création : client + véhicule (dropdown) + pièces + services + taxes TPS+TVQ |
| `/factures/[id]` | `app/factures/[id]/page.tsx` | Détail + changement statut + lien PDF |
| `/notifications` | `app/notifications/page.tsx` | Historique + stats envoyé/reçu/échoué |

### Composants réutilisables

| Composant | Fichier |
|---|---|
| Formulaire client | `src/components/clients/ClientForm.tsx` |
| Formulaire véhicule | `src/components/vehicules/VehiculeForm.tsx` |
| Formulaire pièce | `src/components/pieces/PieceForm.tsx` |
| Formulaire service | `src/components/services/ServiceForm.tsx` |

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
│   ├── vehicule.py                  # Pydantic : VehiculeCreate/Update/Out
│   ├── piece.py                     # Pydantic : PieceCreate/Update/Patch/Out
│   ├── service.py                   # Pydantic : ServiceCreate/Update/Patch/Out
│   ├── facture.py                   # Pydantic : FactureCreate/Patch/Out + lignes + vehicule_info
│   └── notification.py              # Pydantic : NotificationOut
├── routers/
│   ├── clients.py                   # CRUD + historique factures
│   ├── vehicules.py                 # CRUD véhicules par client (suppression bloquée si factures)
│   ├── pieces.py                    # CRUD + filtre active_only
│   ├── services.py                  # CRUD + filtre active_only
│   ├── factures.py                  # CRUD + vehicule_id + calcul TPS/TVQ + PDF + notification
│   ├── notifications.py             # Historique notifications
│   └── dashboard.py                 # Stats (en_cours, prêts, clients, factures/jour)
└── services/
    ├── pdf_service.py               # Génération PDF ReportLab + upload Firebase Storage (plaque incluse)
    └── notification_service.py      # SMS/WhatsApp Twilio + enregistrement Firestore
```

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
- [x] `POST /pieces`
- [x] `GET /pieces/{id}`
- [x] `PUT /pieces/{id}`
- [x] `PATCH /pieces/{id}` — désactiver/réactiver

#### Services `/services`
- [x] `GET /services` — liste (filtre `active_only`)
- [x] `POST /services`
- [x] `GET /services/{id}`
- [x] `PUT /services/{id}`
- [x] `PATCH /services/{id}` — désactiver/réactiver

#### Factures `/factures`
- [x] `GET /factures` — liste (filtre `statut`) + enrichissement `vehicule_info`
- [x] `POST /factures` — création avec `vehicule_id` + calcul TPS (5%) + TVQ (9,975%) + génération PDF
- [x] `GET /factures/{id}` — enrichi avec `vehicule_info`
- [x] `PATCH /factures/{id}` — mise à jour statut + déclenchement notification si → prêt

#### Notifications `/notifications`
- [x] `GET /notifications` — historique avec statut envoyé/reçu/échoué
- [x] Déclenchement automatique SMS/WhatsApp (Twilio) quand statut → prêt

#### Dashboard `/dashboard`
- [x] `GET /dashboard/stats` — véhicules en_cours, prêts, clients actifs, factures du jour

### Librairies
- `fastapi` + `uvicorn` — serveur
- `firebase-admin` — Firestore + Auth + Storage
- `reportlab` — génération PDF
- `twilio` — SMS/WhatsApp
- `python-dotenv` — variables d'environnement
- `pydantic` v2 — validation

---

## Base de données — Firestore ✅ Terminé

### Collections actives
- [x] `clients`
- [x] `vehicules` — nouvelle collection (client_id, marque_modele, annee, taille_moteur, plaque, notes)
- [x] `pieces`
- [x] `services`
- [x] `factures` — champ `vehicule_id` ajouté (les anciennes factures conservent les champs texte legacy)
- [x] `notifications`

### Corrections apportées en session
- [x] Bug `load_dotenv()` manquant dans `main.py` → ajouté avec `override=True`
- [x] Bucket Firebase Storage corrigé : `garage-solution.firebasestorage.app`
- [x] Import Twilio rendu lazy (serveur démarre sans Twilio installé)
- [x] Génération PDF : URL publique (`blob.make_public()`) au lieu d'URL signée (évite les permissions IAM)
- [x] Couleur texte inputs frontend : ajout `text-gray-900 bg-white` sur tous les formulaires
- [x] Fix 403 au rechargement direct d'une page : `api.ts` attend maintenant que Firebase Auth soit prêt avant d'envoyer les requêtes (`waitForAuth()`)
- [x] Multi-véhicules par client : collection `vehicules` séparée, factures liées par `vehicule_id`, historique groupé par véhicule sur la fiche client

---

## Déploiement (à faire)
- [ ] Frontend sur Vercel
- [ ] Backend sur Cloud Run ou Railway
- [ ] Variables d'environnement de production
- [ ] Documentation technique
- [ ] Manuel utilisateur simplifié
