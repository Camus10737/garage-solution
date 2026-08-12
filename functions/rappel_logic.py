"""
Version autonome (Firestore direct, sans FastAPI) de la logique "calculer les rappels dus / envoyer
un rappel", pour la Cloud Function planifiée (Module 10 — rappels d'entretien automatiques).

Dupliquée intentionnellement depuis backend/services/rappel_service.py : le paquet de déploiement
Firebase Functions ne contient que ce dossier `functions/`, donc un import direct du backend n'y est
pas fiable. Garder les deux fichiers synchronisés en cas de changement de la logique de déclenchement
ou des messages. Les helpers d'envoi bas niveau, eux, sont partagés via `notification_helpers.py`
(sûr : même paquet de déploiement).
"""
from datetime import datetime, timezone

from notification_helpers import db as get_db, envoyer_selon_canal, nom_garage, resoudre_canal


def _dernieres_visites(db, garage_id: str) -> dict:
    dernieres = {}
    for doc in db.collection("factures").where("garage_id", "==", garage_id).stream():
        d = doc.to_dict()
        vid = d.get("vehicule_id")
        date = d.get("date_creation", "")
        if vid and date > dernieres.get(vid, ""):
            dernieres[vid] = date
    return dernieres


def _derniers_rappels(db, garage_id: str) -> dict:
    derniers = {}
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


def _est_du(modele: dict, vehicule: dict, dernier_rappel, derniere_visite) -> bool:
    type_decl = modele.get("type_declencheur")
    du = False
    if type_decl in ("km", "les_deux") and modele.get("valeur_km"):
        km_actuel = vehicule.get("kilometrage_actuel")
        km_reference = (dernier_rappel or {}).get("kilometrage") or 0
        if km_actuel is not None and (km_actuel - km_reference) >= modele["valeur_km"]:
            du = True
    if type_decl in ("date", "les_deux") and modele.get("valeur_mois"):
        date_reference = (dernier_rappel or {}).get("date_envoi") or derniere_visite or vehicule.get("date_creation")
        if date_reference and _mois_ecoules(date_reference) >= modele["valeur_mois"]:
            du = True
    return du


def _verifier_et_envoyer_rappels_dus_garage(db, garage_id: str) -> int:
    modeles = [
        {**doc.to_dict(), "modele_id": doc.id}
        for doc in db.collection("modeles_rappel")
        .where("garage_id", "==", garage_id)
        .where("actif", "==", True)
        .stream()
    ]
    if not modeles:
        return 0

    vehicules = list(db.collection("vehicules").where("garage_id", "==", garage_id).stream())
    client_ids = list({v.to_dict().get("client_id") for v in vehicules if v.to_dict().get("client_id")})
    clients = {}
    if client_ids:
        for cdoc in db.get_all([db.collection("clients").document(cid) for cid in client_ids]):
            if cdoc.exists and cdoc.to_dict().get("active"):
                clients[cdoc.id] = cdoc.to_dict()

    dernieres_visites = _dernieres_visites(db, garage_id)
    derniers_rappels = _derniers_rappels(db, garage_id)

    nb_envoyes = 0
    for vdoc in vehicules:
        vehicule = vdoc.to_dict()
        client = clients.get(vehicule.get("client_id"))
        if not client:
            continue

        for modele in modeles:
            dernier = derniers_rappels.get((vdoc.id, modele["modele_id"]))
            visite = dernieres_visites.get(vdoc.id)
            if not _est_du(modele, vehicule, dernier, visite):
                continue

            texte_promo = None
            if modele.get("promotion_id"):
                promo_doc = db.collection("promotions").document(modele["promotion_id"]).get()
                if promo_doc.exists:
                    promo = promo_doc.to_dict()
                    texte_promo = f"Profitez-en : {promo.get('titre', '')} — {promo.get('description', '')}"

            message_body = modele.get("message", "").format(nom=client.get("nom", ""), entretien=modele.get("nom", ""))
            if texte_promo:
                message_body += f" {texte_promo}"

            canal = resoudre_canal(db, garage_id, "rappel_entretien")
            envoyer_selon_canal(
                db, garage_id, canal, vehicule["client_id"], client.get("telephone", ""), client.get("email"),
                message_body, f"Rappel d'entretien — {nom_garage(db, garage_id)}", "rappel_entretien", {"vehicule_id": vdoc.id},
            )

            db.collection("rappels_envoyes").document().set({
                "garage_id": garage_id,
                "vehicule_id": vdoc.id,
                "modele_id": modele["modele_id"],
                "date_envoi": datetime.now(timezone.utc).isoformat(),
                "kilometrage": vehicule.get("kilometrage_actuel"),
            })
            nb_envoyes += 1

    return nb_envoyes


def verifier_et_envoyer_rappels_dus() -> int:
    """Calcule les rappels dus et les envoie, pour tous les garages. Retourne le nombre de rappels envoyés."""
    db = get_db()
    nb_envoyes = 0
    for garage_doc in db.collection("garages").stream():
        nb_envoyes += _verifier_et_envoyer_rappels_dus_garage(db, garage_doc.id)
    return nb_envoyes
