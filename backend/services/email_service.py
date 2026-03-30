"""
Service d'envoi de factures par email via SMTP.
"""
import os
import smtplib
import urllib.request
from email.message import EmailMessage

GARAGE_NOM = "KAMI AUTO GARAGE"


def envoyer_facture_par_email(
    destinataire: str,
    client_nom: str,
    numero_facture: str,
    pdf_url: str,
) -> None:
    """
    Envoie la facture PDF par email au destinataire.
    Lève une exception si l'envoi échoue.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    email_from = os.getenv("EMAIL_FROM", smtp_user)

    if not smtp_user or not smtp_password:
        raise RuntimeError("Configuration SMTP manquante (SMTP_USER / SMTP_PASSWORD)")

    # Télécharger le PDF
    with urllib.request.urlopen(pdf_url) as response:
        pdf_bytes = response.read()

    msg = EmailMessage()
    msg["Subject"] = f"Votre facture {numero_facture} — {GARAGE_NOM}"
    msg["From"] = f"{GARAGE_NOM} <{email_from}>"
    msg["To"] = destinataire
    msg.set_content(
        f"Bonjour {client_nom},\n\n"
        f"Veuillez trouver ci-joint votre facture {numero_facture}.\n\n"
        f"Merci de votre confiance,\n{GARAGE_NOM}"
    )
    msg.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=f"{numero_facture}.pdf",
    )

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
