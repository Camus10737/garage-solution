Liste de tâches – Application Web Gestion de Garage (SAAS)
Légende : ✅ Fait | 🔄 En cours | ⬜ À faire

---

## Roadmap (cahier des charges SAAS v1.0, juin 2026)

Le projet a évolué d'un MVP mono-garage vers une cible SAAS multi-tenant à 14 modules
(voir `cahier-de-charges.md`). Décisions actées :
- VIN ajouté en champ optionnel sur le véhicule, en plus de la plaque (les deux restent optionnels).
- Multi-tenant + rôles/permissions complets (Modules 13/14) repoussés en toute fin de roadmap.
- Modules métier construits en premier, un par un, chacun revu avant de passer au suivant.

| Phase | Contenu | Modules cahier | Statut |
|---|---|---|---|
| P0 | VIN optionnel sur véhicule | Module 2 | ✅ |
| P1 | Devis + Paramètres minimal (taux horaire) | Module 4 (+ bout Module 14) | ✅ |
| P2 | Facturation avancée : paiements partiels, statut annulé, lien devis→facture | Module 5 | ✅ |
| P3 | Suivi réparations 4 statuts + historique horodaté + mécanicien assigné | Module 6 | ✅ |
| P4 | Fournisseurs + Inventaire avancé (fournisseurs multiples/marge, stock bas, commande spéciale) | Modules 3 + 7 | ✅ |
| P5 | Centralisation notifications (moteur unique, config canal, échecs signalés) | Module 12 | ✅ |
| P6 | Export comptable (résumé + CSV/PDF/Excel par période) | Module 8 | ✅ |
| P7 | Promotions + Rappels d'entretien automatiques | Modules 9 + 10 | ✅ |
| P8 | Prise de rendez-vous en ligne | Module 11 | ✅ |
| P9a | Isolation multi-tenant (garage_id partout, migration des données existantes) | Architecture | ✅ |
| P9b | Rôles/permissions + gestion utilisateurs + Paramètres garage complet | Modules 13 + 14 | ✅ |

**Roadmap complète.** Les 14 modules du cahier des charges SAAS sont implémentés. Cloud Functions
planifiées déployées le 2026-08-11 (voir note en fin de section P8). Reste hors code : le déploiement
de production du site (frontend + backend, voir section 9 plus bas, jamais démarré).

---

## P1 — Module Devis (fait)

✅ Backend : `schemas/devis.py`, `routers/devis.py` (CRUD, transitions de statut brouillon→en_attente→accepté/refusé, conversion en facture, envoi email/SMS)
✅ Numérotation lisible (D-2026-001)
✅ PDF devis (ReportLab, avec section main d'œuvre)
✅ Paramètres minimal : taux horaire par défaut (`GET/PUT /parametres`)
✅ Conversion devis accepté → facture en un clic (réutilise `_creer_facture`, garde `devis_id` sur la facture et `facture_id` sur le devis, devis jamais supprimé)
✅ Frontend : page liste `/devis` avec filtres par statut, page détail `/devis/[id]` avec actions (envoyer, accepter/refuser, convertir), formulaire avec sélection pièces/services + lignes main d'œuvre libres
✅ Nav sidebar : item "Devis"

---

## P2 — Facturation avancée (fait)

✅ Paiements partiels : `POST /factures/{id}/paiements` (montant + méthode comptant/carte/virement/chèque), solde restant recalculé à chaque paiement, refus si le montant dépasse le solde restant
✅ Statut de paiement dérivé automatiquement : non payé → partiellement payé → payé (jamais réglé manuellement)
✅ Annulation de facture : `POST /factures/{id}/annuler` (raison optionnelle), jamais de suppression — facture verrouillée (plus de paiement ni de changement de statut véhicule possible) mais toujours visible avec bandeau "Annulée"
✅ Numérotation séquentielle déjà sans trou (aucun endpoint de suppression n'a jamais existé)
✅ Frontend : carte "Paiements" (solde, historique, formulaire d'ajout) et action "Annuler la facture" sur `/factures/[id]`, badges statut paiement + "Annulée" sur la liste `/factures`

---

## P3 — Suivi de l'état des réparations (fait)

✅ Statut renommé `statut_vehicule` → `statut_reparation`, 4 valeurs : en attente / en attente de pièce / réparation en cours / fini (lecture rétrocompatible pour les anciennes factures, sans migration)
✅ Historique horodaté de chaque changement de statut (`historique_statuts`), affiché sur la fiche facture
✅ Notification SMS automatique à chaque changement de statut (pas seulement à "fini" comme avant)
✅ Mécanicien assigné : champ texte libre éditable sur la fiche facture (deviendra une vraie relation utilisateur en P9)
✅ Ajout d'une pièce ou d'un service à une facture existante (`POST /factures/{id}/pieces`, `POST /factures/{id}/services`) : recalcule totaux/taxes/solde et régénère le PDF, pour le cas d'une pièce additionnelle découverte en cours de réparation
✅ Dashboard : compteurs "Véhicules en cours" / "Véhicules prêts" regroupent maintenant les 4 statuts (en cours = en_attente + en_attente_piece + en_cours)
✅ Frontend : sélecteur de statut (4 valeurs), historique, mécanicien, formulaires d'ajout de ligne sur `/factures/[id]` ; filtres 4 statuts sur `/factures`

---

## P4 — Fournisseurs + Inventaire avancé (fait)

✅ Module Fournisseurs (Module 7) : CRUD complet (`/fournisseurs`), fiche fournisseur avec historique des commandes et solde dû total
✅ Pièce enrichie (Module 3) : `numero_item` (unique, optionnel), `categorie`, `emplacement`, `seuil_alerte`, fournisseurs liés (`fournisseurs: [{fournisseur_id, prix_achat, delai_livraison}]`), marge affichée dans la fiche pièce interne (jamais transmise aux devis/factures)
✅ Fiche pièce `/pieces/[id]` (nouvelle) : fournisseurs liés + marge, historique des mouvements de stock
✅ Alerte stock bas : ligne mise en évidence sur `/pieces` + carte dashboard "Pièces en stock bas"
✅ Historique des mouvements de stock (nouvelle collection `mouvements_stock`) : entrées (réception fournisseur, commande spéciale) et sorties (facture) journalisées automatiquement
✅ Décrément automatique du stock à la création d'une facture ou à l'ajout d'une pièce à une facture existante (jamais à la création d'un devis — décision actée pour ne pas fausser l'inventaire avec des devis non acceptés) ; ignore les pièces fournies par le client et celles dont le stock n'est pas suivi
✅ Commandes fournisseur (`/commandes-fournisseur`) : création multi-lignes, numérotation CF-2026-001, réception partielle ou complète (met à jour le stock + l'historique), paiements partiels au fournisseur (réutilise le modèle paiement de P2)
✅ Commandes spéciales (`/commandes-speciales`) : pièce absente du stock commandée pour un client/véhicule (et devis optionnel), statuts commandée → en transit → reçue, réception incrémente le stock et notifie le client par SMS (sauf si déjà couverte par la réception d'une commande fournisseur liée, pour éviter un double comptage)
✅ Bug corrigé au passage : `GET /clients/{id}/factures` plantait pour d'anciennes factures depuis le renommage `statut_reparation` en P3 (bypassait la normalisation) — corrigé en réutilisant `_enrich_facture`

---

## P5 — Centralisation des notifications (fait)

✅ Champ `canal` (sms/whatsapp/email) ajouté à chaque notification enregistrée — tous les envois, y compris par courriel, passent maintenant par le même point d'enregistrement Firestore
✅ Bug corrigé : les envois de facture et de devis par courriel n'étaient **jamais** enregistrés dans l'historique des notifications (trou net par rapport au cahier) — corrigé, journalisés succès/échec sans changer le comportement existant (erreur HTTP immédiate conservée)
✅ Canal configurable par le garage pour les notifications automatiques (statut réparation, pièce reçue, rappel de paiement) : SMS / Courriel / Les deux, avec repli automatique sur SMS si courriel choisi mais client sans adresse — nouvelle page `/parametres`
✅ Nouveau : rappel de paiement en attente (`POST /factures/{id}/rappel-paiement`, bouton sur la fiche facture si solde restant > 0)
✅ Échecs signalés proactivement : carte "Notifications échouées (7 jours)" sur le dashboard, plutôt que de compter sur une consultation manuelle de l'historique
✅ Historique par client : `GET /notifications?client_id=` + carte "Notifications envoyées" sur la fiche client
✅ **Page `/parametres` enfin construite** (prévue depuis P1, jamais faite) : taux horaire par défaut + canaux de notification par type
✅ Modules 9 (promotions), 10 (rappels d'entretien) et 11 (rendez-vous) pas encore centralisables : ils n'existent pas encore (P7/P8) — le moteur central est prêt à les recevoir

---

## P6 — Export comptable (fait)

✅ Nouvelle page `/export-comptable` : sélection de période (boutons rapides Aujourd'hui/Ce mois/Ce trimestre/Cette année + dates libres), cartes résumé, boutons d'export
✅ Résumé financier (`GET /export-comptable/resume`) : revenus payés/en attente/annulés, TPS et TVQ collectées séparément (recalculées depuis le sous-total stocké, `Facture.taxes` ne gardait que le total combiné), dépenses fournisseurs payées/dues, profit net approximatif, comptes à recevoir, comptes à payer — tout calculé sur la période sélectionnée
✅ Export détaillé en 3 formats (`GET /export-comptable/export?format=csv|xlsx|pdf`) : liste des factures (numéro, date, client, sous-total, TPS, TVQ, total, statut, montant payé) + liste des commandes fournisseur, conçu pour être transmis directement à un comptable
✅ Excel (nouvelle dépendance `openpyxl`) avec feuilles séparées Résumé/Factures/Fournisseurs ; PDF avec page résumé + tableaux détaillés (réutilise les styles de `pdf_service.py`) ; CSV en données tabulaires pures
✅ Restriction d'accès au rôle Comptable/Admin **pas encore appliquée** — les rôles n'existent pas avant P9 ; la page reste accessible à tous pour l'instant, comme le reste de l'app

---

## P7 — Promotions + Rappels d'entretien automatiques (fait)

✅ Lacune comblée : `Vehicule` n'avait aucun champ kilométrage (prévu dès le Module 2, jamais ajouté) — ajouté (`kilometrage_actuel`), mis à jour à la fois via la fiche véhicule et via une saisie optionnelle à la création d'une facture
✅ Modèles de rappel (Module 10) : `/rappels-entretien` — CRUD (nom, déclencheur km/date/les deux, valeurs, message personnalisable, promotion liée optionnelle), 3 modèles standards suggérés en un clic (huile, pneus saisonniers, transmission)
✅ Calcul des rappels dus (`calculer_rappels_dus`) : vérifie kilométrage et/ou mois écoulés depuis le dernier rappel (ou la dernière visite), historique anti-doublon (`rappels_envoyes`), page de revue avec envoi sélectif ou groupé
✅ Promotions (Module 9) : `/promotions` — création en brouillon (titre, description, période, ciblage tous/manuel, méthode d'envoi), envoi groupé, annulation avant envoi ; filtrage avancé (ex. "n'a pas visité depuis 6 mois") volontairement non construit — le cahier le classe lui-même en évolution future
✅ **Nouvelle infrastructure** : Cloud Function Firebase planifiée (`functions/`, 2ᵉ génération, quotidienne) pour un déclenchement vraiment automatique des rappels — **déployée** (voir note de déploiement en fin de section P8). Logique dupliquée intentionnellement (`functions/rappel_logic.py` vs `backend/services/rappel_service.py`) car le paquet de déploiement Firebase ne contient que le dossier `functions/`
✅ Instructions de déploiement dans `functions/main.py` (commentaire d'en-tête) et `functions/.env.example`

---

## P8 — Prise de rendez-vous en ligne (fait)

✅ **Première page publique de l'app** : `/reserver`, sans authentification, en dehors de `AppLayout` — accessible sans compte, comme demandé par le cahier ("aucun site web distinct n'a besoin d'être développé")
✅ Deux endpoints backend publics seulement (`GET /rendez-vous/creneaux-disponibles`, `POST /rendez-vous`), le reste du module reste protégé ; aucune donnée client n'est jamais exposée publiquement — résolution client/véhicule par correspondance téléphone côté serveur uniquement, jamais de recherche publique
✅ Configuration côté garage (extension `/parametres`) : heures d'ouverture par jour, nombre de baies simultanées, durée d'un rendez-vous, plages bloquées (congés/vacances), lien public à copier
✅ Calcul des créneaux disponibles en fonction des horaires, de la capacité et des plages bloquées ; confirmation automatique dès la sélection (aucune validation manuelle requise), avec revalidation serveur contre une double réservation concurrente
✅ Gestion authentifiée (`/rendez-vous`) : marquer complété/annulé, reprogrammer, et créer un devis pré-rempli pour le client en un clic (réutilise `defaultClientId`, déjà supporté par `DevisForm` mais jamais branché nulle part jusqu'ici)
✅ Rappel 24h avant : deuxième fonction planifiée ajoutée à la Cloud Function de P7 (`functions/rdv_logic.py`), helpers d'envoi factorisés (`functions/notification_helpers.py`) entre les deux fonctions — déployée avec la première (voir note ci-dessous)
✅ Écart assumé par rapport au plan initial : le "type de service" utilise une liste prédéfinie codée en dur (huile, pneus, freins, diagnostic...) plutôt que le catalogue `services` — pour ne jamais exposer publiquement une donnée qui exige normalement une authentification

**Déploiement des Cloud Functions (2026-08-11)** : `verifier_rappels_entretien` (quotidien, 08h00
America/Toronto) et `verifier_rappels_rendez_vous` (toutes les 60 min) sont en ligne sur le projet
Firebase `garage-solution`, région `us-central1`, runtime Python 3.12 (2ᵉ génération) — confirmé via
`firebase functions:list`. Prérequis réglés au passage : forfait Blaze déjà actif sur le projet ;
environnement virtuel `functions/venv` créé (Python 3.12 installé via pyenv, absent du système) et
dépendances installées depuis `functions/requirements.txt` ; `functions/.env` créé (gitignored, non
commité) en copiant les identifiants Twilio/SMTP déjà présents dans `backend/.env` ; politique de
nettoyage des images de conteneur configurée (`firebase functions:artifacts:setpolicy`, suppression
après 1 jour) pour éviter une facturation de stockage qui s'accumule inutilement.

---

## P9a — Isolation multi-tenant (fait)

✅ Nouvelles collections `garages/{garage_id}` (nom, date_creation) et `users/{uid}` (garage_id, role, actif) — le rôle est stocké dès maintenant mais **pas encore appliqué** (tout utilisateur d'un garage peut tout faire, comme avant ; l'enforcement des permissions arrive en P9b, Module 13)
✅ `verify_token` (`core/auth.py`) résout désormais `garage_id`/`role` via `users/{uid}` après décodage du token Firebase ; 403 si le document est absent ou `actif=false` — nécessite d'avoir été provisionné via le script de migration
✅ Nouveau helper `core/tenant.py::verifier_appartenance` : vérifie qu'un document appartient au bon garage, 404 sinon (jamais 403, pour ne pas révéler l'existence d'une ressource d'un autre garage) — réutilisé dans les 17 routers
✅ Pattern appliqué mécaniquement partout : tag `garage_id` à la création, filtre `.where("garage_id", "==", ...)` sur toute liste, `verifier_appartenance` sur tout accès par id ; numérotation séquentielle (factures, devis, commandes fournisseur) scopée par garage — chaque garage recommence à 001
✅ `parametres` passe de document unique `("parametres", "general")` à `("parametres", "{garage_id}")` — un jeu de paramètres par garage
✅ Nouveau `GET /auth/moi` (garage_id, garage_nom, role) — utilisé par `/parametres` pour construire le lien public de réservation
✅ `/reserver` devient `/reserver/[garageId]` (route dynamique) : seule exception "visible" à la promesse de cette sous-phase, imposée par la correction technique (une page de réservation publique multi-tenant doit forcément préciser le garage) ; les 2 endpoints publics (`GET /rendez-vous/creneaux-disponibles`, `POST /rendez-vous`) prennent désormais un `garage_id` explicite
✅ Cloud Functions (`functions/rappel_logic.py`, `functions/rdv_logic.py`) mises à jour pour boucler sur chaque garage et scoper leurs requêtes — évite un bug latent silencieux ; déployées depuis (voir note de déploiement en fin de section P8)
✅ Script de migration unique `backend/scripts/migrate_multitenant.py` (aperçu par défaut, `--apply` pour exécuter) : exécuté sur les données réelles — garage "Mon Garage" créé, compte `test@gmail.com` provisionné Admin, toutes les données existantes (4 clients, 6 factures, 1 devis, 1 fournisseur, 1 commande fournisseur, 1 commande spéciale, 2 mouvements de stock, 13 notifications, 3 pièces, 3 services, 2 véhicules) rattachées au nouveau garage — rien n'a été perdu
✅ **Découverte en cours de route** : les nouvelles requêtes combinant `garage_id` avec un tri (`order_by`) nécessitent des index Firestore composites (confirmé empiriquement contre le vrai projet). Ajoutés dans `firestore.indexes.json` (nouveau, référencé dans `firebase.json`) et déployés (`firebase deploy --only firestore:indexes`)
✅ Inscription d'un nouveau garage **temporairement indisponible** (assumé) : un compte Firebase créé sans passer par le script de migration n'a pas de `users/{uid}` et serait bloqué au login — corrigé en P9b avec le flux d'inscription complet
✅ Backend vérifié (import, uvicorn, `/openapi.json`, 403 sans token) ; frontend vérifié (`npm run build` à 0 erreur)

---

## P9b — Rôles/permissions (Module 13) + Infos du garage (Module 14-A) (fait)

✅ Matrice de permissions du cahier appliquée mécaniquement sur les 15 routers concernés via un nouveau `core/permissions.py::require_roles(*roles)` : Admin = accès total ; Gestionnaire = tout sauf Paramètres/Utilisateurs/Export comptable ; Comptable = lecture seule sur Clients/Véhicules/Devis/Factures, aucun accès à l'Inventaire/Fournisseurs/Promotions/Rendez-vous/Dashboard, accès à l'Export comptable
✅ Nouvelle collection `users/{uid}` enrichie (nom, telephone, role, actif — l'email n'y est jamais dupliqué, toujours lu à la volée depuis Firebase Auth, source de vérité unique) ; nouveau router `routers/users.py` (`GET/POST /utilisateurs`, `PATCH /utilisateurs/{uid}`, Admin uniquement)
✅ Garde-fou "dernier Admin" : `PATCH /utilisateurs/{uid}` refuse de désactiver ou rétrograder le dernier Admin actif d'un garage — évite qu'un garage se verrouille lui-même hors de son propre compte
✅ Flux d'inscription d'un nouveau garage débloqué (cassé depuis P9a) : nouveau `POST /garages` (bootstrap) utilisant `verify_token_raw` (décodage Firebase sans exiger de `users/{uid}` existant, seul endpoint où c'est nécessaire) — crée le garage et provisionne l'inscrit comme Admin ; nouvelle page `/inscription` (nom complet, nom du garage, email, mot de passe)
✅ Infos du garage complètes (Module 14-A) : `garages/{garage_id}` étendu (adresse, téléphone, email, province, logo, numéros de taxes) ; `GET/PUT /garage` (lecture tout rôle, écriture Admin), `POST /garage/logo` (upload Storage), `GET /garage/{garage_id}/public` (public, sans auth, pour `/reserver`) — nouvelle carte "Infos du garage" sur `/parametres`
✅ Numéros de taxes **verrouillés** conformément au cahier : stockés sur le garage mais absents de `GarageUpdate`, aucun chemin d'écriture exposé au garage (uniquement visibles en lecture seule s'ils existent, "configurés par le support")
✅ Constantes codées en dur `GARAGE_NOM`/`GARAGE_ADRESSE`/`GARAGE_TEL` (héritées du MVP mono-garage, disséminées dans `pdf_service.py`, `export_comptable_service.py`, `email_service.py`, `notification_service.py`, `functions/notification_helpers.py`, et la page `/reserver`) entièrement remplacées par une lecture dynamique de `garages/{garage_id}` (avec repli sur des valeurs par défaut si le garage n'a pas encore rempli ses infos) — PDF factures/devis/export comptable, emails, SMS et la page de réservation publique affichent désormais les vraies infos de chaque garage
✅ Frontend : `AuthContext` expose `role`/`garageNom` (fetch `GET /auth/moi` une fois authentifié) ; `Sidebar` filtrée par rôle ; `AppLayout` redirige hors des pages non permises (Comptable atterrit sur `/export-comptable`) ; nouvelle page `/utilisateurs` (Admin, tableau + tiroir) ; boutons "+ Nouveau" masqués pour Comptable sur Clients/Devis/Factures — **portée assumée** : pas de masquage exhaustif de chaque contrôle imbriqué (paiement, changement de statut...), le 403 backend reste le filet de sécurité réel pour ces cas résiduels
✅ **Vérification bout en bout avec de vrais tokens Firebase** (comme en P9a) : création réelle d'un utilisateur Gestionnaire et d'un Comptable via `POST /utilisateurs`, connexion réelle de chacun, et test de la matrice complète (11 vérifications Comptable, 7 Gestionnaire, toutes conformes) ; flux de bootstrap testé de bout en bout (403 avant, 201 au bootstrap, 200 après, 400 sur double bootstrap) ; garde-fou dernier Admin confirmé (400) ; toutes les données de test nettoyées après coup (comptes Firebase + documents Firestore supprimés)
✅ Backend vérifié (import, uvicorn, `/openapi.json`) ; frontend vérifié (`npm run build` à 0 erreur, nouvelles routes `/inscription` et `/utilisateurs` présentes)

---

## Legacy — Ancien cahier des charges (mono-garage, avant juin 2026)

Historique conservé à titre de référence ; ces items restent valides dans le nouveau cahier
sauf mention contraire ci-dessus (ex. plaque → VIN ajouté en complément).

### 1. Configuration projet
✅ 1.1 Créer le dépôt Git / versioning
✅ 1.2 Initialiser projet Next.js pour le front
✅ 1.3 Initialiser projet FastAPI pour le backend
✅ 1.4 Configurer Firebase (Auth, Firestore, Storage)
✅ 1.5 Installer librairies nécessaires (reportlab, react-select, axios, etc.)

### 2. Authentification (Firebase Auth)
✅ 2.1 Sign-up utilisateur (garagiste / admin)
✅ 2.2 Login utilisateur
✅ 2.3 Gestion des rôles et permissions (fait en P9b, Module 13)
✅ 2.4 Sécuriser routes API backend avec tokens Firebase

### 3. Module Clients
✅ 3.1.1 à 3.1.5 CRUD, désactiver/réactiver, recherche, champs véhicule/notes
✅ 3.2.1 Afficher toutes les factures liées au client
⬜ 3.2.2 Filtrer historique par date / type de service / pièces (→ P2/P4)

### 4. Module Pièces
✅ 4.1.1 à 4.1.4 CRUD, désactiver/réactiver, liste
✅ 4.2.1 Alertes stock bas (fait en P4, Module 3)
✅ 4.2.2 Historique mouvement stock (fait en P4, Module 3)

### 5. Module Services
✅ 5.1.1 à 5.1.4 CRUD, désactiver/réactiver, liste

### 6. Module Factures
✅ 6.1.1 à 6.1.9 Sélection, calcul taxes, PDF, stockage, numérotation, véhicule, notes
✅ 6.2.1 / 6.2.2 Statut réparation (4 valeurs, ex-statut véhicule en cours/prêt — voir section P3)
✅ 6.3.1 Historique factures par client
⬜ 6.3.2 Filtrer par date / type de service / pièce (→ P4)
✅ Paiements partiels, statut annulé (jamais supprimée)

### 7. Notifications et rappels
✅ 7.1.1 / 7.1.2 Détection + envoi SMS/WhatsApp (Twilio) à chaque changement de statut de réparation
✅ 7.2.x Rappels entretien (fait en P7, Module 10)
✅ 7.3.1 / 7.3.2 Historique + statut notifications
✅ Centralisation en moteur unique (fait en P5, Module 12)

### 8. Frontend – Pages & UX
✅ Dashboard, Clients, Pièces & Services, Factures, Notifications — drawers, react-select

### 9. Tests & Déploiement
⬜ 9.1 Tests unitaires backend
⬜ 9.2 Tests front-end
⬜ 9.3 Tests intégration
🔄 9.4 Déploiement (Cloud Functions en ligne ; Vercel / Cloud Run pour le site restent à faire)
⬜ 9.5 Documentation technique dédiée (taches.md/progression.md en tiennent lieu de façon informelle)

---

Bugs corrigés en cours de route :
✅ Stats dashboard : mismatch snake_case / camelCase
✅ Réactivation impossible après désactivation (clients, pièces, services)
✅ Notes visibles sur PDF client → rendues internes uniquement
✅ Page `/clients/[id]/modifier` orpheline et corrompue (syntaxe invalide) supprimée — remplacée depuis longtemps par le drawer de modification
