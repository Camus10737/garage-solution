from typing import List

from fastapi import APIRouter, Depends

from core.firebase import get_db
from core.permissions import require_roles
from schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationOut])
async def list_notifications(
    client_id: str = "",
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    query = (
        db.collection("notifications")
        .where("garage_id", "==", _user["garage_id"])
        .order_by("date_envoi", direction="DESCENDING")
    )
    if client_id:
        query = query.where("client_id", "==", client_id)
    docs = query.stream()

    notifications = []
    for doc in docs:
        data = doc.to_dict()
        data["notification_id"] = doc.id
        # Enrichir avec le nom du client
        client_doc = db.collection("clients").document(data["client_id"]).get()
        data["client_nom"] = client_doc.to_dict().get("nom", "") if client_doc.exists else ""
        notifications.append(NotificationOut(**data))

    return notifications
