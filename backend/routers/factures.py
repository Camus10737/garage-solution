from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.auth import verify_token
from core.firebase import get_db
from schemas.facture import FactureCreate, FactureOut, FacturePatch
from schemas.vehicule import VehiculeOut
from services.email_service import envoyer_facture_par_email
from services.notification_service import envoyer_notification_vehicule_pret
from services.pdf_service import generer_pdf_facture

# Taxes Québec
TPS_RATE = 0.05       # 5%
TVQ_RATE = 0.09975    # 9.975%

router = APIRouter(prefix="/factures", tags=["Factures"])


def _calculer_taxes(total_pieces: float, total_services: float) -> dict:
    sous_total = total_pieces + total_services
    taxes = round(sous_total * (TPS_RATE + TVQ_RATE), 2)
    total_facture = round(sous_total + taxes, 2)
    return {"taxes": taxes, "total_facture": total_facture}


def _vehicule_doc_to_out(doc) -> VehiculeOut:
    data = doc.to_dict()
    data["vehicule_id"] = doc.id
    return VehiculeOut(**data)


def _enrich_facture(data: dict, client_nom: str = "", vehicule_info: VehiculeOut | None = None) -> FactureOut:
    data["client_nom"] = client_nom
    data["vehicule_info"] = vehicule_info
    return FactureOut(**data)


@router.get("", response_model=List[FactureOut])
async def list_factures(
    statut: str = "",
    _user: dict = Depends(verify_token),
):
    db = get_db()
    query = db.collection("factures").order_by("date_creation", direction="DESCENDING")
    if statut in ("en_cours", "pret"):
        query = query.where("statut_vehicule", "==", statut)
    docs = list(query.stream())

    # Batch fetch clients
    client_ids = list({d.to_dict()["client_id"] for d in docs if d.to_dict().get("client_id")})
    client_names: dict[str, str] = {}
    if client_ids:
        for cdoc in db.get_all([db.collection("clients").document(cid) for cid in client_ids]):
            if cdoc.exists:
                client_names[cdoc.id] = cdoc.to_dict().get("nom", "")

    # Batch fetch vehicules
    vehicule_ids = list({d.to_dict()["vehicule_id"] for d in docs if d.to_dict().get("vehicule_id")})
    vehicule_map: dict[str, VehiculeOut] = {}
    if vehicule_ids:
        for vdoc in db.get_all([db.collection("vehicules").document(vid) for vid in vehicule_ids]):
            if vdoc.exists:
                vehicule_map[vdoc.id] = _vehicule_doc_to_out(vdoc)

    factures = []
    for doc in docs:
        data = doc.to_dict()
        data["facture_id"] = doc.id
        vehicule_info = vehicule_map.get(data.get("vehicule_id", ""))
        factures.append(_enrich_facture(data, client_names.get(data.get("client_id", ""), ""), vehicule_info))

    return factures


@router.post("", response_model=FactureOut, status_code=status.HTTP_201_CREATED)
async def create_facture(
    body: FactureCreate,
    _user: dict = Depends(verify_token),
):
    db = get_db()

    # Vérifier le client
    client_doc = db.collection("clients").document(body.client_id).get()
    if not client_doc.exists:
        raise HTTPException(status_code=404, detail="Client introuvable")
    client_data = client_doc.to_dict()
    client_nom = client_data.get("nom", "")

    # Vérifier le véhicule
    vehicule_doc = db.collection("vehicules").document(body.vehicule_id).get()
    if not vehicule_doc.exists:
        raise HTTPException(status_code=404, detail="Véhicule introuvable")
    vehicule_data = vehicule_doc.to_dict()
    vehicule_info = _vehicule_doc_to_out(vehicule_doc)

    # Calcul totaux
    total_pieces = sum(
        (0 if p.fournie_par_client else p.prix * p.quantite)
        for p in body.pieces
    )
    total_services = sum(s.prix for s in body.services)
    totaux = _calculer_taxes(total_pieces, total_services)

    year = datetime.now(timezone.utc).year
    count = int(db.collection("factures").count().get()[0][0].value) + 1
    numero_facture = f"F-{year}-{count:03d}"

    data = {
        "client_id": body.client_id,
        "vehicule_id": body.vehicule_id,
        "numero_facture": numero_facture,
        "pieces": [p.model_dump() for p in body.pieces],
        "services": [s.model_dump() for s in body.services],
        "total_pieces": round(total_pieces, 2),
        "total_services": round(total_services, 2),
        "taxes": totaux["taxes"],
        "total_facture": totaux["total_facture"],
        "date_creation": datetime.now(timezone.utc).isoformat(),
        "statut_vehicule": "en_cours",
        "notes": body.notes,
        "pdf_url": None,
    }

    ref = db.collection("factures").document()
    ref.set(data)
    facture_id = ref.id

    # Génération PDF — on enrichit data avec les infos véhicule pour le template
    pdf_data = {
        **data,
        "vehicule": vehicule_data.get("marque_modele", ""),
        "annee": vehicule_data.get("annee"),
        "taille_moteur": vehicule_data.get("taille_moteur"),
        "plaque": vehicule_data.get("plaque"),
    }
    try:
        pdf_url = generer_pdf_facture(
            facture_id=facture_id,
            client_nom=client_nom,
            client_telephone=client_data.get("telephone", ""),
            data=pdf_data,
        )
        ref.update({"pdf_url": pdf_url})
        data["pdf_url"] = pdf_url
    except Exception as e:
        print(f"[PDF ERROR] {e}")

    data["facture_id"] = facture_id
    return _enrich_facture(data, client_nom, vehicule_info)


@router.get("/{facture_id}", response_model=FactureOut)
async def get_facture(
    facture_id: str,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    doc = db.collection("factures").document(facture_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    data = doc.to_dict()
    data["facture_id"] = doc.id

    client_doc = db.collection("clients").document(data["client_id"]).get()
    client_nom = client_doc.to_dict().get("nom", "") if client_doc.exists else ""

    vehicule_info = None
    if data.get("vehicule_id"):
        vdoc = db.collection("vehicules").document(data["vehicule_id"]).get()
        if vdoc.exists:
            vehicule_info = _vehicule_doc_to_out(vdoc)

    return _enrich_facture(data, client_nom, vehicule_info)


@router.patch("/{facture_id}", response_model=FactureOut)
async def patch_facture(
    facture_id: str,
    body: FacturePatch,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    ref = db.collection("factures").document(facture_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    facture_data = doc.to_dict()
    ancien_statut = facture_data.get("statut_vehicule")
    ref.update({"statut_vehicule": body.statut_vehicule})

    client_doc = db.collection("clients").document(facture_data["client_id"]).get()
    client_nom = client_doc.to_dict().get("nom", "") if client_doc.exists else ""

    vehicule_info = None
    if facture_data.get("vehicule_id"):
        vdoc = db.collection("vehicules").document(facture_data["vehicule_id"]).get()
        if vdoc.exists:
            vehicule_info = _vehicule_doc_to_out(vdoc)

    # Déclencher notification si passage à "pret"
    if body.statut_vehicule == "pret" and ancien_statut != "pret" and client_doc.exists:
        client_data = client_doc.to_dict()
        try:
            envoyer_notification_vehicule_pret(
                db=db,
                facture_id=facture_id,
                client_id=facture_data["client_id"],
                client_nom=client_data.get("nom", ""),
                client_telephone=client_data.get("telephone", ""),
            )
        except Exception:
            pass

    data = {**facture_data, "statut_vehicule": body.statut_vehicule, "facture_id": facture_id}
    return _enrich_facture(data, client_nom, vehicule_info)


@router.post("/{facture_id}/envoyer-email", status_code=status.HTTP_204_NO_CONTENT)
async def envoyer_email_facture(
    facture_id: str,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    doc = db.collection("factures").document(facture_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Facture introuvable")

    facture_data = doc.to_dict()
    pdf_url = facture_data.get("pdf_url")
    if not pdf_url:
        raise HTTPException(status_code=400, detail="Aucun PDF généré pour cette facture")

    client_doc = db.collection("clients").document(facture_data["client_id"]).get()
    if not client_doc.exists:
        raise HTTPException(status_code=404, detail="Client introuvable")

    client_data = client_doc.to_dict()
    email = client_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Ce client n'a pas d'adresse email enregistrée")

    try:
        envoyer_facture_par_email(
            destinataire=email,
            client_nom=client_data.get("nom", ""),
            numero_facture=facture_data.get("numero_facture", facture_id[:8].upper()),
            pdf_url=pdf_url,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'envoi de l'email : {e}")
