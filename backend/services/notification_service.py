"""
Service de notifications SMS/WhatsApp via Twilio.
Enregistre aussi la notification dans Firestore pour l'historique.
"""
import os
import re
from datetime import datetime, timezone

def _get_twilio_client():
    try:
        from twilio.rest import Client as TwilioClient
    except ImportError:
        raise RuntimeError("Twilio n'est pas installé : pip install twilio")
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    return TwilioClient(account_sid, auth_token)


def _normaliser_telephone(telephone: str) -> str:
    """Convertit un numéro canadien en format E.164 (+1XXXXXXXXXX)."""
    chiffres = re.sub(r"\D", "", telephone)
    if len(chiffres) == 10:
        return f"+1{chiffres}"
    if len(chiffres) == 11 and chiffres.startswith("1"):
        return f"+{chiffres}"
    return f"+{chiffres}"


def envoyer_notification_vehicule_pret(
    db,
    facture_id: str,
    client_id: str,
    client_nom: str,
    client_telephone: str,
) -> str:
    """
    Envoie un SMS ou WhatsApp au client et enregistre la notification.
    Retourne l'ID de la notification créée dans Firestore.
    """
    message_body = (
        f"Bonjour {client_nom}, votre véhicule est prêt ! "
        "Vous pouvez venir le récupérer à votre convenance. Merci de nous faire confiance."
    )

    statut = "echoue"
    canal = os.getenv("NOTIF_CANAL", "sms")  # "sms" ou "whatsapp"
    from_number = os.getenv("TWILIO_FROM_NUMBER", "")
    to_number = _normaliser_telephone(client_telephone)

    try:
        client = _get_twilio_client()

        if canal == "whatsapp":
            message = client.messages.create(
                body=message_body,
                from_=f"whatsapp:{from_number}",
                to=f"whatsapp:{to_number}",
            )
        else:
            message = client.messages.create(
                body=message_body,
                from_=from_number,
                to=to_number,
            )

        statut = "envoye" if message.status in ("queued", "sent", "delivered") else "echoue"
    except Exception as e:
        print(f"[TWILIO ERROR] {e}")
        statut = "echoue"

    # Enregistrer dans Firestore
    notif_data = {
        "client_id": client_id,
        "facture_id": facture_id,
        "type": "vehicule_pret",
        "message": message_body,
        "statut": statut,
        "date_envoi": datetime.now(timezone.utc).isoformat(),
    }
    ref = db.collection("notifications").document()
    ref.set(notif_data)

    return ref.id
