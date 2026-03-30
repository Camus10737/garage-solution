from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.auth import verify_token
from core.firebase import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardStats(BaseModel):
    vehicules_en_cours: int
    vehicules_prets: int
    total_clients_actifs: int
    factures_aujourd_hui: int


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    _user: dict = Depends(verify_token),
):
    db = get_db()

    aujourd_hui = datetime.now(timezone.utc).date().isoformat()

    # Un seul scan pour toutes les stats sur les factures
    en_cours = prets = factures_aujourd_hui = 0
    for doc in db.collection("factures").stream():
        d = doc.to_dict()
        statut = d.get("statut_vehicule")
        if statut == "en_cours":
            en_cours += 1
        elif statut == "pret":
            prets += 1
        if d.get("date_creation", "").startswith(aujourd_hui):
            factures_aujourd_hui += 1

    vehicules_en_cours = en_cours
    vehicules_prets = prets

    total_clients_actifs = len(
        list(db.collection("clients").where("active", "==", True).stream())
    )

    return DashboardStats(
        vehicules_en_cours=vehicules_en_cours,
        vehicules_prets=vehicules_prets,
        total_clients_actifs=total_clients_actifs,
        factures_aujourd_hui=factures_aujourd_hui,
    )
