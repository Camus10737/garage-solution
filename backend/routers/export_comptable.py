from fastapi import APIRouter, Depends, HTTPException, Response

from core.firebase import get_db
from core.permissions import require_roles
from schemas.export_comptable import ResumeComptable
from services.export_comptable_service import (
    _commandes_fournisseur_periode,
    _factures_periode,
    calculer_resume,
    generer_csv,
    generer_excel,
    generer_pdf,
)

router = APIRouter(prefix="/export-comptable", tags=["Export comptable"])

_MEDIA_TYPES = {
    "csv": "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
}


def _valider_periode(date_debut: str, date_fin: str) -> None:
    if not date_debut or not date_fin:
        raise HTTPException(status_code=400, detail="date_debut et date_fin sont requis (format AAAA-MM-JJ)")
    if date_debut > date_fin:
        raise HTTPException(status_code=400, detail="date_debut doit précéder date_fin")


@router.get("/resume", response_model=ResumeComptable)
async def get_resume(
    date_debut: str,
    date_fin: str,
    _user: dict = Depends(require_roles("admin", "comptable")),
):
    _valider_periode(date_debut, date_fin)
    db = get_db()
    return calculer_resume(db, _user["garage_id"], date_debut, date_fin)


@router.get("/export")
async def export_donnees(
    date_debut: str,
    date_fin: str,
    format: str = "csv",
    _user: dict = Depends(require_roles("admin", "comptable")),
):
    if format not in _MEDIA_TYPES:
        raise HTTPException(status_code=400, detail="format doit être csv, xlsx ou pdf")
    _valider_periode(date_debut, date_fin)

    db = get_db()
    factures = _factures_periode(db, _user["garage_id"], date_debut, date_fin)
    commandes = _commandes_fournisseur_periode(db, _user["garage_id"], date_debut, date_fin)

    if format == "csv":
        contenu = generer_csv(factures, commandes)
    elif format == "xlsx":
        resume = calculer_resume(db, _user["garage_id"], date_debut, date_fin)
        contenu = generer_excel(resume, factures, commandes)
    else:
        resume = calculer_resume(db, _user["garage_id"], date_debut, date_fin)
        contenu = generer_pdf(resume, factures, commandes, _user["garage_id"])

    nom_fichier = f"export-comptable-{date_debut}-au-{date_fin}.{format}"
    return Response(
        content=contenu,
        media_type=_MEDIA_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{nom_fichier}"'},
    )
