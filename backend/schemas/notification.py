from typing import Literal, Optional

from pydantic import BaseModel

TypeNotification = Literal["vehicule_pret", "rappel_entretien"]
StatutNotification = Literal["envoye", "recu", "echoue"]


class NotificationOut(BaseModel):
    notification_id: str
    client_id: str
    client_nom: Optional[str] = None
    facture_id: str
    type: TypeNotification
    message: str
    statut: StatutNotification
    date_envoi: str
