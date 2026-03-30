from typing import List

from fastapi import APIRouter, Depends

from core.auth import verify_token
from core.firebase import get_db
from schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationOut])
async def list_notifications(
    _user: dict = Depends(verify_token),
):
    db = get_db()
    docs = (
        db.collection("notifications")
        .order_by("date_envoi", direction="DESCENDING")
        .stream()
    )

    notifications = []
    for doc in docs:
        data = doc.to_dict()
        data["notification_id"] = doc.id
        # Enrichir avec le nom du client
        client_doc = db.collection("clients").document(data["client_id"]).get()
        data["client_nom"] = client_doc.to_dict().get("nom", "") if client_doc.exists else ""
        notifications.append(NotificationOut(**data))

    return notifications
