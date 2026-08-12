"""
Rappels d'entretien automatiques (Module 10).

Source de vérité pour la logique "calculer les rappels dus / envoyer un rappel". Une version
autonome (Firestore direct, sans dépendance à FastAPI) est dupliquée intentionnellement dans
`functions/rappel_logic.py` pour la Cloud Function planifiée — le paquet de déploiement Firebase ne
contient que le dossier `functions/`, donc un import direct de ce module n'y est pas fiable. Garder
les deux synchronisés en cas de changement de la logique de déclenchement.
"""
from datetime import datetime, timezone

from schemas.rappel import RappelDu
from services.notification_service import envoyer_notification_rappel_entretien


def _dernieres_visites(db, garage_id: str) -> dict[str, str]:
    """vehicule_id -> date_creation de la facture la plus récente pour ce véhicule."""
    dernieres: dict[str, str] = {}
    for doc in db.collection("factures").where("garage_id", "==", garage_id).stream():
        d = doc.to_dict()
        vid = d.get("vehicule_id")
        date = d.get("date_creation", "")
        if vid and date > dernieres.get(vid, ""):
            dernieres[vid] = date
    return dernieres


def _derniers_rappels(db, garage_id: str) -> dict[tuple, dict]:
    """(vehicule_id, modele_id) -> dernier envoi {date_envoi, kilometrage}."""
    derniers: dict[tuple, dict] = {}
    for doc in db.collection("rappels_envoyes").where("garage_id", "==", garage_id).stream():
        d = doc.to_dict()
        cle = (d.get("vehicule_id"), d.get("modele_id"))
        if cle not in derniers or d.get("date_envoi", "") > derniers[cle].get("date_envoi", ""):
            derniers[cle] = d
    return derniers


def _mois_ecoules(date_iso: str) -> float:
    try:
        date = datetime.fromisoformat(date_iso)
    except (TypeError, ValueError):
        return 0.0
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - date).days / 30.44


def _est_du(modele: dict, vehicule: dict, dernier_rappel: dict | None, derniere_visite: str | None) -> tuple:
    type_decl = modele.get("type_declencheur")
    du = False
    raisons = []

    if type_decl in ("km", "les_deux") and modele.get("valeur_km"):
        km_actuel = vehicule.get("kilometrage_actuel")
        km_reference = (dernier_rappel or {}).get("kilometrage") or 0
        if km_actuel is not None and (km_actuel - km_reference) >= modele["valeur_km"]:
            du = True
            raisons.append(f"{km_actuel} km (seuil {modele['valeur_km']} km depuis {km_reference} km)")

    if type_decl in ("date", "les_deux") and modele.get("valeur_mois"):
        date_reference = (dernier_rappel or {}).get("date_envoi") or derniere_visite or vehicule.get("date_creation")
        if date_reference:
            mois = _mois_ecoules(date_reference)
            if mois >= modele["valeur_mois"]:
                du = True
                raisons.append(f"{mois:.0f} mois écoulés (seuil {modele['valeur_mois']} mois)")

    return du, " · ".join(raisons)


def calculer_rappels_dus(db, garage_id: str) -> list[RappelDu]:
    modeles = [
        {**doc.to_dict(), "modele_id": doc.id}
        for doc in db.collection("modeles_rappel")
        .where("garage_id", "==", garage_id)
        .where("actif", "==", True)
        .stream()
    ]
    if not modeles:
        return []

    vehicules = list(db.collection("vehicules").where("garage_id", "==", garage_id).stream())
    client_ids = list({v.to_dict().get("client_id") for v in vehicules if v.to_dict().get("client_id")})
    clients: dict[str, dict] = {}
    if client_ids:
        for cdoc in db.get_all([db.collection("clients").document(cid) for cid in client_ids]):
            if cdoc.exists and cdoc.to_dict().get("active"):
                clients[cdoc.id] = cdoc.to_dict()

    dernieres_visites = _dernieres_visites(db, garage_id)
    derniers_rappels = _derniers_rappels(db, garage_id)

    resultats: list[RappelDu] = []
    for vdoc in vehicules:
        vehicule = vdoc.to_dict()
        client = clients.get(vehicule.get("client_id"))
        if not client:
            continue  # client inactif ou introuvable

        for modele in modeles:
            dernier = derniers_rappels.get((vdoc.id, modele["modele_id"]))
            visite = dernieres_visites.get(vdoc.id)
            du, raison = _est_du(modele, vehicule, dernier, visite)
            if du:
                resultats.append(RappelDu(
                    vehicule_id=vdoc.id,
                    vehicule_label=vehicule.get("marque_modele", ""),
                    client_id=vehicule["client_id"],
                    client_nom=client.get("nom", ""),
                    client_telephone=client.get("telephone", ""),
                    modele_id=modele["modele_id"],
                    modele_nom=modele.get("nom", ""),
                    raison=raison,
                ))
    return resultats


def envoyer_rappel(db, garage_id: str, vehicule_id: str, modele_id: str) -> None:
    vehicule_doc = db.collection("vehicules").document(vehicule_id).get()
    if not vehicule_doc.exists or vehicule_doc.to_dict().get("garage_id") != garage_id:
        return
    vehicule = vehicule_doc.to_dict()

    modele_doc = db.collection("modeles_rappel").document(modele_id).get()
    if not modele_doc.exists or modele_doc.to_dict().get("garage_id") != garage_id:
        return
    modele = modele_doc.to_dict()

    client_doc = db.collection("clients").document(vehicule["client_id"]).get()
    if not client_doc.exists:
        return
    client = client_doc.to_dict()

    texte_promo = None
    if modele.get("promotion_id"):
        promo_doc = db.collection("promotions").document(modele["promotion_id"]).get()
        if promo_doc.exists:
            promo = promo_doc.to_dict()
            texte_promo = f"Profitez-en : {promo.get('titre', '')} — {promo.get('description', '')}"

    envoyer_notification_rappel_entretien(
        db=db,
        garage_id=garage_id,
        vehicule_id=vehicule_id,
        client_id=vehicule["client_id"],
        client_nom=client.get("nom", ""),
        client_telephone=client.get("telephone", ""),
        client_email=client.get("email"),
        modele_nom=modele.get("nom", ""),
        message=modele.get("message", ""),
        texte_promo=texte_promo,
    )

    db.collection("rappels_envoyes").document().set({
        "garage_id": garage_id,
        "vehicule_id": vehicule_id,
        "modele_id": modele_id,
        "date_envoi": datetime.now(timezone.utc).isoformat(),
        "kilometrage": vehicule.get("kilometrage_actuel"),
    })
