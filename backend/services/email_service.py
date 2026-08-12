"""
Service d'envoi de factures par email via SMTP.
"""
import os
import smtplib
import urllib.request
from email.message import EmailMessage


def _envoyer_email(msg: EmailMessage) -> None:
    """Ouvre la connexion SMTP et envoie le message. Lève une exception si l'envoi échoue."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user or not smtp_password:
        raise RuntimeError("Configuration SMTP manquante (SMTP_USER / SMTP_PASSWORD)")

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)


def _construire_message(destinataire: str, sujet: str, corps: str, garage_nom: str) -> EmailMessage:
    email_from = os.getenv("EMAIL_FROM", os.getenv("SMTP_USER", ""))
    msg = EmailMessage()
    msg["Subject"] = sujet
    msg["From"] = f"{garage_nom} <{email_from}>"
    msg["To"] = destinataire
    msg.set_content(corps)
    return msg


def _envoyer_pdf_par_email(
    destinataire: str,
    sujet: str,
    corps: str,
    pdf_url: str,
    nom_fichier: str,
    garage_nom: str,
) -> None:
    """Télécharge le PDF à `pdf_url` et l'envoie en pièce jointe par email."""
    with urllib.request.urlopen(pdf_url) as response:
        pdf_bytes = response.read()

    msg = _construire_message(destinataire, sujet, corps, garage_nom)
    msg.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=nom_fichier,
    )
    _envoyer_email(msg)


def envoyer_email_texte(destinataire: str, sujet: str, corps: str, garage_nom: str) -> None:
    """Envoie un email simple sans pièce jointe (notifications automatiques)."""
    _envoyer_email(_construire_message(destinataire, sujet, corps, garage_nom))


def envoyer_facture_par_email(
    destinataire: str,
    client_nom: str,
    numero_facture: str,
    pdf_url: str,
    garage_nom: str,
) -> None:
    _envoyer_pdf_par_email(
        destinataire=destinataire,
        sujet=f"Votre facture {numero_facture} — {garage_nom}",
        corps=(
            f"Bonjour {client_nom},\n\n"
            f"Veuillez trouver ci-joint votre facture {numero_facture}.\n\n"
            f"Merci de votre confiance,\n{garage_nom}"
        ),
        pdf_url=pdf_url,
        nom_fichier=f"{numero_facture}.pdf",
        garage_nom=garage_nom,
    )


def envoyer_devis_par_email(
    destinataire: str,
    client_nom: str,
    numero_devis: str,
    pdf_url: str,
    garage_nom: str,
) -> None:
    _envoyer_pdf_par_email(
        destinataire=destinataire,
        sujet=f"Votre devis {numero_devis} — {garage_nom}",
        corps=(
            f"Bonjour {client_nom},\n\n"
            f"Veuillez trouver ci-joint votre devis {numero_devis}.\n\n"
            f"N'hésitez pas à nous contacter pour toute question.\n\n"
            f"Merci de votre confiance,\n{garage_nom}"
        ),
        pdf_url=pdf_url,
        nom_fichier=f"{numero_devis}.pdf",
        garage_nom=garage_nom,
    )
