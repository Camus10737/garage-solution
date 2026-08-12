from typing import Literal, Optional

from pydantic import BaseModel

TypeNotification = Literal[
    "vehicule_pret", "rappel_entretien", "devis_envoye", "statut_reparation",
    "piece_recue", "facture_envoyee", "rappel_paiement", "promotion",
    "rdv_confirme", "rdv_rappel",
]
StatutNotification = Literal["envoye", "recu", "echoue"]
Canal = Literal["sms", "whatsapp", "email"]


class NotificationOut(BaseModel):
    notification_id: str
    client_id: str
    client_nom: Optional[str] = None
    facture_id: Optional[str] = None
    devis_id: Optional[str] = None
    commande_speciale_id: Optional[str] = None
    vehicule_id: Optional[str] = None
    promotion_id: Optional[str] = None
    rendez_vous_id: Optional[str] = None
    type: TypeNotification
    message: str
    canal: Canal = "sms"
    statut: StatutNotification
    date_envoi: str
