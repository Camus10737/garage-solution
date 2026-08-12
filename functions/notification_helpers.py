"""
Helpers d'envoi partagés entre les modules de logique planifiée (`rappel_logic.py`, `rdv_logic.py`).
Contrairement à la duplication assumée avec `backend/services/`, ce partage est sûr : tous les fichiers
de ce dossier `functions/` sont déployés ensemble dans le même paquet Cloud Function.
"""
import os
import re
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage

from firebase_admin import firestore

GARAGE_NOM_DEFAUT = "Mon Garage"


def db():
    return firestore.client()


def nom_garage(db_, garage_id: str) -> str:
    doc = db_.collection("garages").document(garage_id).get()
    if not doc.exists:
        return GARAGE_NOM_DEFAUT
    return doc.to_dict().get("nom") or GARAGE_NOM_DEFAUT


def _get_twilio_client():
    from twilio.rest import Client as TwilioClient
    return TwilioClient(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))


def normaliser_telephone(telephone: str) -> str:
    chiffres = re.sub(r"\D", "", telephone or "")
    if len(chiffres) == 10:
        return f"+1{chiffres}"
    if len(chiffres) == 11 and chiffres.startswith("1"):
        return f"+{chiffres}"
    return f"+{chiffres}"


def log_notification(db_, garage_id, client_id, type_notification, message, canal, statut, doc_refs):
    ref = db_.collection("notifications").document()
    ref.set({
        "garage_id": garage_id,
        "client_id": client_id,
        "type": type_notification,
        "message": message,
        "canal": canal,
        "statut": statut,
        "date_envoi": datetime.now(timezone.utc).isoformat(),
        **doc_refs,
    })


def envoyer_sms(db_, garage_id, client_id, client_telephone, message_body, type_notification, doc_refs):
    statut = "echoue"
    from_number = os.getenv("TWILIO_FROM_NUMBER", "")
    to_number = normaliser_telephone(client_telephone)
    try:
        client = _get_twilio_client()
        message = client.messages.create(body=message_body, from_=from_number, to=to_number)
        statut = "envoye" if message.status in ("queued", "sent", "delivered") else "echoue"
    except Exception as e:
        print(f"[TWILIO ERROR] {e}")
    log_notification(db_, garage_id, client_id, type_notification, message_body, "sms", statut, doc_refs)


def envoyer_email(db_, garage_id, client_id, client_email, sujet, corps, type_notification, doc_refs):
    statut = "echoue"
    try:
        if not client_email:
            raise RuntimeError("Aucune adresse email pour ce client")
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        msg = EmailMessage()
        msg["Subject"] = sujet
        msg["From"] = f"{nom_garage(db_, garage_id)} <{os.getenv('EMAIL_FROM', smtp_user)}>"
        msg["To"] = client_email
        msg.set_content(corps)
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        statut = "envoye"
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
    log_notification(db_, garage_id, client_id, type_notification, corps, "email", statut, doc_refs)


def resoudre_canal(db_, garage_id, type_notification: str) -> str:
    doc = db_.collection("parametres").document(garage_id).get()
    if not doc.exists:
        return "sms"
    return doc.to_dict().get("canaux_notification", {}).get(type_notification, "sms")


def envoyer_selon_canal(db_, garage_id, canal, client_id, client_telephone, client_email, message_body, sujet_email, type_notification, doc_refs):
    email_ok = canal in ("email", "les_deux") and bool(client_email)
    sms_ok = canal in ("sms", "les_deux")
    if not sms_ok and not email_ok:
        sms_ok = True  # filet de sécurité, comme dans notification_service.py
    if sms_ok:
        envoyer_sms(db_, garage_id, client_id, client_telephone, message_body, type_notification, doc_refs)
    if email_ok:
        envoyer_email(db_, garage_id, client_id, client_email, sujet_email, message_body, type_notification, doc_refs)
