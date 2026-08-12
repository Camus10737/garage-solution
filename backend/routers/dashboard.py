from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.firebase import get_db
from core.permissions import require_roles

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class DashboardStats(BaseModel):
    vehicules_en_cours: int
    vehicules_prets: int
    total_clients_actifs: int
    factures_aujourd_hui: int
    pieces_stock_bas: int
    notifications_echouees_7j: int


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()

    aujourd_hui = datetime.now(timezone.utc).date().isoformat()

    # Un seul scan pour toutes les stats sur les factures
    en_cours = prets = factures_aujourd_hui = 0
    for doc in db.collection("factures").where("garage_id", "==", _user["garage_id"]).stream():
        d = doc.to_dict()
        statut = d.get("statut_reparation") or (
            "fini" if d.get("statut_vehicule") == "pret" else "en_cours"
        )
        if statut == "fini":
            prets += 1
        else:
            en_cours += 1
        if d.get("date_creation", "").startswith(aujourd_hui):
            factures_aujourd_hui += 1

    vehicules_en_cours = en_cours
    vehicules_prets = prets

    total_clients_actifs = len(
        list(
            db.collection("clients")
            .where("garage_id", "==", _user["garage_id"])
            .where("active", "==", True)
            .stream()
        )
    )

    pieces_stock_bas = 0
    for doc in (
        db.collection("pieces")
        .where("garage_id", "==", _user["garage_id"])
        .where("active", "==", True)
        .stream()
    ):
        p = doc.to_dict()
        quantite = p.get("quantite")
        seuil = p.get("seuil_alerte")
        if quantite is not None and seuil is not None and quantite <= seuil:
            pieces_stock_bas += 1

    il_y_a_7_jours = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    notifications_echouees_7j = 0
    for doc in (
        db.collection("notifications")
        .where("garage_id", "==", _user["garage_id"])
        .where("statut", "==", "echoue")
        .stream()
    ):
        if doc.to_dict().get("date_envoi", "") >= il_y_a_7_jours:
            notifications_echouees_7j += 1

    return DashboardStats(
        vehicules_en_cours=vehicules_en_cours,
        vehicules_prets=vehicules_prets,
        total_clients_actifs=total_clients_actifs,
        factures_aujourd_hui=factures_aujourd_hui,
        pieces_stock_bas=pieces_stock_bas,
        notifications_echouees_7j=notifications_echouees_7j,
    )
