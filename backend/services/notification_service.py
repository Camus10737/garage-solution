"""
Service de notifications (Module 12) — moteur central pour les envois SMS/WhatsApp (Twilio) et
email (SMTP). Toute notification, quel que soit le canal, est enregistrée dans Firestore
(collection `notifications`) avec son canal et son statut, pour l'historique et le signalement
des échecs au garage.
"""
import os
import re
from datetime import datetime, timezone

from services.email_service import envoyer_email_texte

GARAGE_NOM_DEFAUT = "Mon Garage"


def _nom_garage(db, garage_id: str) -> str:
    doc = db.collection("garages").document(garage_id).get()
    if not doc.exists:
        return GARAGE_NOM_DEFAUT
    return doc.to_dict().get("nom") or GARAGE_NOM_DEFAUT


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


def _log_notification(
    db,
    garage_id: str,
    client_id: str,
    type_notification: str,
    message: str,
    canal: str,
    statut: str,
    doc_refs: dict,
) -> str:
    """Enregistrement Firestore pur — utilisé par tous les envois, SMS ou email."""
    notif_data = {
        "garage_id": garage_id,
        "client_id": client_id,
        "type": type_notification,
        "message": message,
        "canal": canal,
        "statut": statut,
        "date_envoi": datetime.now(timezone.utc).isoformat(),
        **doc_refs,
    }
    ref = db.collection("notifications").document()
    ref.set(notif_data)
    return ref.id


def _envoyer_sms(
    db,
    garage_id: str,
    client_id: str,
    client_telephone: str,
    message_body: str,
    type_notification: str,
    doc_refs: dict,
) -> str:
    """Envoie un SMS ou WhatsApp au client et enregistre la notification."""
    statut = "echoue"
    canal_twilio = os.getenv("NOTIF_CANAL", "sms")  # "sms" ou "whatsapp" (transport Twilio)
    from_number = os.getenv("TWILIO_FROM_NUMBER", "")
    to_number = _normaliser_telephone(client_telephone)

    try:
        client = _get_twilio_client()

        if canal_twilio == "whatsapp":
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

    return _log_notification(db, garage_id, client_id, type_notification, message_body, canal_twilio, statut, doc_refs)


def _envoyer_email_notification(
    db,
    garage_id: str,
    client_id: str,
    client_email: str | None,
    sujet: str,
    corps: str,
    type_notification: str,
    doc_refs: dict,
) -> str:
    """Envoie un email texte simple (sans pièce jointe) et enregistre la notification."""
    statut = "echoue"
    try:
        if not client_email:
            raise RuntimeError("Aucune adresse email pour ce client")
        envoyer_email_texte(destinataire=client_email, sujet=sujet, corps=corps, garage_nom=_nom_garage(db, garage_id))
        statut = "envoye"
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        statut = "echoue"

    return _log_notification(db, garage_id, client_id, type_notification, corps, "email", statut, doc_refs)


def _resoudre_canal(db, garage_id: str, type_notification: str) -> str:
    """Lit le canal configuré par le garage pour ce type ('sms' par défaut)."""
    doc = db.collection("parametres").document(garage_id).get()
    if not doc.exists:
        return "sms"
    canaux = doc.to_dict().get("canaux_notification", {})
    return canaux.get(type_notification, "sms")


def _envoyer_selon_canal(
    db,
    garage_id: str,
    canal_configure: str,
    client_id: str,
    client_telephone: str,
    client_email: str | None,
    message_sms: str,
    sujet_email: str,
    type_notification: str,
    doc_refs: dict,
) -> None:
    envoyer_sms = canal_configure in ("sms", "les_deux")
    envoyer_email = canal_configure in ("email", "les_deux") and bool(client_email)
    if not envoyer_sms and not envoyer_email:
        # Filet de sécurité : ne jamais perdre silencieusement une notification
        # (ex. canal "email" configuré mais client sans adresse courriel).
        envoyer_sms = True

    if envoyer_sms:
        _envoyer_sms(db, garage_id, client_id, client_telephone, message_sms, type_notification, doc_refs)
    if envoyer_email:
        _envoyer_email_notification(db, garage_id, client_id, client_email, sujet_email, message_sms, type_notification, doc_refs)


_MESSAGES_STATUT_REPARATION = {
    "en_attente": "Bonjour {nom}, votre véhicule a été pris en charge et est en attente de traitement.",
    "en_attente_piece": "Bonjour {nom}, votre réparation est en attente d'une pièce commandée. Nous vous recontacterons dès sa réception.",
    "en_cours": "Bonjour {nom}, la réparation de votre véhicule est en cours.",
    "fini": "Bonjour {nom}, votre véhicule est prêt ! Vous pouvez venir le récupérer à votre convenance. Merci de nous faire confiance.",
}


def envoyer_notification_statut_reparation(
    db,
    garage_id: str,
    facture_id: str,
    client_id: str,
    client_nom: str,
    client_telephone: str,
    client_email: str | None,
    statut: str,
) -> None:
    message_body = _MESSAGES_STATUT_REPARATION.get(statut, "").format(nom=client_nom)
    canal = _resoudre_canal(db, garage_id, "statut_reparation")
    _envoyer_selon_canal(
        db, garage_id, canal, client_id, client_telephone, client_email,
        message_sms=message_body,
        sujet_email=f"Mise à jour de votre réparation — {_nom_garage(db, garage_id)}",
        type_notification="statut_reparation",
        doc_refs={"facture_id": facture_id},
    )


def envoyer_notification_piece_recue(
    db,
    garage_id: str,
    commande_speciale_id: str,
    client_id: str,
    client_nom: str,
    client_telephone: str,
    client_email: str | None,
    piece_nom: str,
) -> None:
    message_body = (
        f"Bonjour {client_nom}, la pièce « {piece_nom} » que vous attendiez est arrivée. "
        "Contactez-nous pour planifier l'installation. Merci de votre confiance."
    )
    canal = _resoudre_canal(db, garage_id, "piece_recue")
    _envoyer_selon_canal(
        db, garage_id, canal, client_id, client_telephone, client_email,
        message_sms=message_body,
        sujet_email=f"Votre pièce est arrivée — {_nom_garage(db, garage_id)}",
        type_notification="piece_recue",
        doc_refs={"commande_speciale_id": commande_speciale_id},
    )


def envoyer_notification_rappel_paiement(
    db,
    garage_id: str,
    facture_id: str,
    client_id: str,
    client_nom: str,
    client_telephone: str,
    client_email: str | None,
    numero_facture: str,
    solde_restant: float,
) -> None:
    message_body = (
        f"Bonjour {client_nom}, un solde de {solde_restant:.2f} $ reste à payer sur votre facture "
        f"{numero_facture}. Merci de communiquer avec nous pour régulariser. — {_nom_garage(db, garage_id)}"
    )
    canal = _resoudre_canal(db, garage_id, "rappel_paiement")
    _envoyer_selon_canal(
        db, garage_id, canal, client_id, client_telephone, client_email,
        message_sms=message_body,
        sujet_email=f"Rappel de paiement — Facture {numero_facture}",
        type_notification="rappel_paiement",
        doc_refs={"facture_id": facture_id},
    )


def envoyer_notification_rappel_entretien(
    db,
    garage_id: str,
    vehicule_id: str,
    client_id: str,
    client_nom: str,
    client_telephone: str,
    client_email: str | None,
    modele_nom: str,
    message: str,
    texte_promo: str | None = None,
) -> None:
    message_body = message.format(nom=client_nom, entretien=modele_nom)
    if texte_promo:
        message_body += f" {texte_promo}"
    canal = _resoudre_canal(db, garage_id, "rappel_entretien")
    _envoyer_selon_canal(
        db, garage_id, canal, client_id, client_telephone, client_email,
        message_sms=message_body,
        sujet_email=f"Rappel d'entretien — {_nom_garage(db, garage_id)}",
        type_notification="rappel_entretien",
        doc_refs={"vehicule_id": vehicule_id},
    )


def envoyer_notification_rdv_confirme(
    db,
    garage_id: str,
    rendez_vous_id: str,
    client_id: str,
    client_nom: str,
    client_telephone: str,
    client_email: str | None,
    date_heure: str,
) -> None:
    message_body = (
        f"Bonjour {client_nom}, votre rendez-vous au {_nom_garage(db, garage_id)} est confirmé pour le "
        f"{date_heure}. À bientôt !"
    )
    canal = _resoudre_canal(db, garage_id, "rdv_confirme")
    _envoyer_selon_canal(
        db, garage_id, canal, client_id, client_telephone, client_email,
        message_sms=message_body,
        sujet_email=f"Rendez-vous confirmé — {_nom_garage(db, garage_id)}",
        type_notification="rdv_confirme",
        doc_refs={"rendez_vous_id": rendez_vous_id},
    )


def envoyer_notification_rdv_rappel(
    db,
    garage_id: str,
    rendez_vous_id: str,
    client_id: str,
    client_nom: str,
    client_telephone: str,
    client_email: str | None,
    date_heure: str,
) -> None:
    message_body = (
        f"Bonjour {client_nom}, rappel : vous avez rendez-vous au {_nom_garage(db, garage_id)} le {date_heure}. "
        "À demain !"
    )
    canal = _resoudre_canal(db, garage_id, "rdv_rappel")
    _envoyer_selon_canal(
        db, garage_id, canal, client_id, client_telephone, client_email,
        message_sms=message_body,
        sujet_email=f"Rappel de rendez-vous — {_nom_garage(db, garage_id)}",
        type_notification="rdv_rappel",
        doc_refs={"rendez_vous_id": rendez_vous_id},
    )


def envoyer_notification_promotion(
    db,
    garage_id: str,
    promotion_id: str,
    client_id: str,
    client_nom: str,
    client_telephone: str,
    client_email: str | None,
    titre: str,
    description: str,
    methode_envoi: str,
) -> None:
    """Envoi de promotion — méthode choisie explicitement à la création, pas résolue via parametres."""
    garage_nom = _nom_garage(db, garage_id)
    message_body = f"Bonjour {client_nom}, {titre} : {description} — {garage_nom}"
    doc_refs = {"promotion_id": promotion_id}

    if methode_envoi in ("sms", "les_deux"):
        _envoyer_sms(db, garage_id, client_id, client_telephone, message_body, "promotion", doc_refs)
    if methode_envoi in ("email", "les_deux"):
        _envoyer_email_notification(
            db, garage_id, client_id, client_email, f"{titre} — {garage_nom}", message_body, "promotion", doc_refs,
        )


def envoyer_notification_devis(
    db,
    garage_id: str,
    devis_id: str,
    client_id: str,
    client_nom: str,
    client_telephone: str,
    numero_devis: str,
) -> str:
    """Envoi manuel (bouton "Envoyer par SMS" sur la fiche devis) — canal explicite, pas configurable."""
    message_body = (
        f"Bonjour {client_nom}, votre devis {numero_devis} est prêt à consulter. "
        "Contactez-nous pour toute question. Merci de votre confiance."
    )
    return _envoyer_sms(
        db, garage_id, client_id, client_telephone, message_body,
        type_notification="devis_envoye",
        doc_refs={"devis_id": devis_id},
    )
