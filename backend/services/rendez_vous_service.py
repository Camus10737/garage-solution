"""
Prise de rendez-vous en ligne (Module 11) — source de vérité.

Deux endpoints du router associé sont publics (pas d'authentification) : le calcul des créneaux et la
création d'un rendez-vous. Ce module ne renvoie jamais de données sur d'autres clients — la résolution
client/véhicule se fait uniquement par correspondance téléphone/marque, côté serveur.

Simplification assumée : les heures (`horaires_ouverture`, `date_heure`) sont traitées comme des
datetimes naïfs représentant l'heure locale du garage, cohérent avec le reste de l'app qui ne gère pas
la conversion de fuseau horaire ailleurs non plus.

Une version autonome de `verifier_et_envoyer_rappels_rdv` est dupliquée dans `functions/rdv_logic.py`
pour la Cloud Function planifiée (même compromis qu'en P7, voir `services/rappel_service.py`).
"""
from datetime import datetime, timedelta, timezone

from schemas.rendez_vous import RendezVousCreate
from services.notification_service import (
    _normaliser_telephone,
    envoyer_notification_rdv_confirme,
    envoyer_notification_rdv_rappel,
)

JOURS_SEMAINE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]


def _parametres(db, garage_id: str) -> dict:
    doc = db.collection("parametres").document(garage_id).get()
    return doc.to_dict() if doc.exists else {}


def _dans_plage_bloquee(jour_iso: str, plages: list) -> bool:
    return any(p.get("date_debut", "") <= jour_iso <= p.get("date_fin", "") for p in plages)


def _rendez_vous_confirmes_par_creneau(db, garage_id: str) -> dict:
    compteur: dict = {}
    for doc in (
        db.collection("rendez_vous")
        .where("garage_id", "==", garage_id)
        .where("statut", "==", "confirme")
        .stream()
    ):
        dh = doc.to_dict().get("date_heure", "")
        compteur[dh] = compteur.get(dh, 0) + 1
    return compteur


def calculer_creneaux_disponibles(db, garage_id: str, date_debut: str, date_fin: str) -> list:
    params = _parametres(db, garage_id)
    horaires = params.get("horaires_ouverture", {})
    plages_bloquees = params.get("plages_bloquees", [])
    nombre_baies = params.get("nombre_baies", 1)
    duree = params.get("duree_rdv_minutes", 60)
    if not horaires or nombre_baies < 1 or duree < 1:
        return []

    occupation = _rendez_vous_confirmes_par_creneau(db, garage_id)
    maintenant = datetime.now()

    creneaux = []
    jour = datetime.fromisoformat(date_debut).date()
    fin = datetime.fromisoformat(date_fin).date()
    while jour <= fin:
        jour_iso = jour.isoformat()
        horaire = horaires.get(JOURS_SEMAINE[jour.weekday()], {})
        if (
            horaire.get("ouvert")
            and horaire.get("heure_debut")
            and horaire.get("heure_fin")
            and not _dans_plage_bloquee(jour_iso, plages_bloquees)
        ):
            heure_debut = datetime.strptime(horaire["heure_debut"], "%H:%M").time()
            heure_fin = datetime.strptime(horaire["heure_fin"], "%H:%M").time()
            courant = datetime.combine(jour, heure_debut)
            borne = datetime.combine(jour, heure_fin)
            while courant + timedelta(minutes=duree) <= borne:
                if courant > maintenant and occupation.get(courant.isoformat(), 0) < nombre_baies:
                    creneaux.append({"date_heure": courant.isoformat()})
                courant += timedelta(minutes=duree)
        jour += timedelta(days=1)

    return creneaux


def resoudre_client_et_vehicule(
    db,
    garage_id: str,
    client_nom: str,
    client_telephone: str,
    client_email: str | None,
    vehicule_marque_modele: str,
    vehicule_annee: str | None,
) -> tuple:
    tel_normalise = _normaliser_telephone(client_telephone)

    client_id = None
    for doc in db.collection("clients").where("garage_id", "==", garage_id).stream():
        if _normaliser_telephone(doc.to_dict().get("telephone", "")) == tel_normalise:
            client_id = doc.id
            break

    now = datetime.now(timezone.utc).isoformat()
    if not client_id:
        ref = db.collection("clients").document()
        ref.set({
            "garage_id": garage_id,
            "nom": client_nom,
            "telephone": client_telephone,
            "email": client_email,
            "notes": None,
            "active": True,
            "date_creation": now,
        })
        client_id = ref.id

    vehicule_id = None
    for doc in db.collection("vehicules").where("client_id", "==", client_id).stream():
        if doc.to_dict().get("marque_modele", "").strip().lower() == vehicule_marque_modele.strip().lower():
            vehicule_id = doc.id
            break

    if not vehicule_id:
        ref = db.collection("vehicules").document()
        ref.set({
            "garage_id": garage_id,
            "client_id": client_id,
            "marque_modele": vehicule_marque_modele,
            "annee": vehicule_annee,
            "taille_moteur": None,
            "plaque": None,
            "vin": None,
            "kilometrage_actuel": None,
            "notes": None,
            "date_creation": now,
        })
        vehicule_id = ref.id

    return client_id, vehicule_id


def creer_rendez_vous(db, garage_id: str, body: RendezVousCreate) -> dict:
    params = _parametres(db, garage_id)
    nombre_baies = params.get("nombre_baies", 1)

    # Revalide la disponibilité pour éviter une double réservation concurrente sur le même créneau.
    occupation = _rendez_vous_confirmes_par_creneau(db, garage_id)
    if occupation.get(body.date_heure, 0) >= nombre_baies:
        raise ValueError("Ce créneau n'est plus disponible")

    client_id, vehicule_id = resoudre_client_et_vehicule(
        db, garage_id, body.client_nom, body.client_telephone, body.client_email,
        body.vehicule_marque_modele, body.vehicule_annee,
    )

    data = {
        "garage_id": garage_id,
        "client_id": client_id,
        "client_nom": body.client_nom,
        "client_telephone": body.client_telephone,
        "client_email": body.client_email,
        "vehicule_id": vehicule_id,
        "vehicule_marque_modele": body.vehicule_marque_modele,
        "vehicule_annee": body.vehicule_annee,
        "type_service": body.type_service,
        "description": body.description,
        "date_heure": body.date_heure,
        "statut": "confirme",
        "rappel_envoye": False,
        "date_creation": datetime.now(timezone.utc).isoformat(),
    }
    ref = db.collection("rendez_vous").document()
    ref.set(data)
    data["rendez_vous_id"] = ref.id

    try:
        envoyer_notification_rdv_confirme(
            db=db,
            garage_id=garage_id,
            rendez_vous_id=ref.id,
            client_id=client_id,
            client_nom=body.client_nom,
            client_telephone=body.client_telephone,
            client_email=body.client_email,
            date_heure=body.date_heure,
        )
    except Exception:
        pass

    return data


def verifier_et_envoyer_rappels_rdv(db) -> int:
    """Envoie un rappel aux rendez-vous confirmés entre 23h et 25h avant l'heure prévue, pour tous les garages."""
    maintenant = datetime.now()
    fenetre_debut = maintenant + timedelta(hours=23)
    fenetre_fin = maintenant + timedelta(hours=25)

    nb = 0
    for garage_doc in db.collection("garages").stream():
        garage_id = garage_doc.id
        for doc in (
            db.collection("rendez_vous")
            .where("garage_id", "==", garage_id)
            .where("statut", "==", "confirme")
            .stream()
        ):
            d = doc.to_dict()
            if d.get("rappel_envoye"):
                continue
            try:
                dh = datetime.fromisoformat(d["date_heure"])
            except (KeyError, ValueError, TypeError):
                continue
            if not (fenetre_debut <= dh <= fenetre_fin):
                continue

            try:
                envoyer_notification_rdv_rappel(
                    db=db,
                    garage_id=garage_id,
                    rendez_vous_id=doc.id,
                    client_id=d.get("client_id", ""),
                    client_nom=d.get("client_nom", ""),
                    client_telephone=d.get("client_telephone", ""),
                    client_email=d.get("client_email"),
                    date_heure=d["date_heure"],
                )
            except Exception:
                pass
            db.collection("rendez_vous").document(doc.id).update({"rappel_envoye": True})
            nb += 1

    return nb
