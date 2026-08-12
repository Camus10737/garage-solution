"""
Version autonome (Firestore direct, sans FastAPI) de `verifier_et_envoyer_rappels_rdv`, pour la
Cloud Function planifiée (Module 11 — rappel de rendez-vous 24h avant).

Dupliquée intentionnellement depuis backend/services/rendez_vous_service.py (même raison que
rappel_logic.py — voir ce fichier). Les helpers d'envoi bas niveau sont partagés via
`notification_helpers.py`.
"""
from datetime import datetime, timedelta

from notification_helpers import db as get_db, envoyer_selon_canal, nom_garage, resoudre_canal


def verifier_et_envoyer_rappels_rdv() -> int:
    """Envoie un rappel aux rendez-vous confirmés entre 23h et 25h avant l'heure prévue, pour tous les garages."""
    db = get_db()

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

            message_body = (
                f"Bonjour {d.get('client_nom', '')}, rappel : vous avez rendez-vous au {nom_garage(db, garage_id)} le "
                f"{d['date_heure']}. À demain !"
            )
            canal = resoudre_canal(db, garage_id, "rdv_rappel")
            envoyer_selon_canal(
                db, garage_id, canal, d.get("client_id", ""), d.get("client_telephone", ""), d.get("client_email"),
                message_body, f"Rappel de rendez-vous — {nom_garage(db, garage_id)}", "rdv_rappel", {"rendez_vous_id": doc.id},
            )

            db.collection("rendez_vous").document(doc.id).update({"rappel_envoye": True})
            nb += 1

    return nb
