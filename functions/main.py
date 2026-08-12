"""
Cloud Functions planifiées — Module 10 (rappels d'entretien) et Module 11 (rappel de rendez-vous).

Déploiement : `firebase deploy --only functions` depuis la racine du projet. Nécessite le forfait
Blaze (payant à l'usage) sur le projet Firebase pour les fonctions planifiées (Cloud Scheduler) —
l'utilisation réelle reste à 0 $ dans les limites gratuites pour deux jobs peu fréquents, mais une
carte de paiement doit être attachée au projet.

Variables d'environnement à définir (fichier `.env` dans ce dossier, non commité) :
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, SMTP_HOST, SMTP_PORT, SMTP_USER,
SMTP_PASSWORD, EMAIL_FROM — mêmes valeurs que `backend/.env`.
"""
from firebase_admin import initialize_app
from firebase_functions import scheduler_fn

from rappel_logic import verifier_et_envoyer_rappels_dus
from rdv_logic import verifier_et_envoyer_rappels_rdv

initialize_app()


@scheduler_fn.on_schedule(schedule="every day 08:00", timezone="America/Toronto")
def verifier_rappels_entretien(event: scheduler_fn.ScheduledEvent) -> None:
    nb = verifier_et_envoyer_rappels_dus()
    print(f"[rappels-entretien] {nb} rappel(s) envoyé(s)")


@scheduler_fn.on_schedule(schedule="every 60 minutes", timezone="America/Toronto")
def verifier_rappels_rendez_vous(event: scheduler_fn.ScheduledEvent) -> None:
    nb = verifier_et_envoyer_rappels_rdv()
    print(f"[rappels-rendez-vous] {nb} rappel(s) envoyé(s)")
