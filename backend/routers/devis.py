from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.auth import verify_token
from core.firebase import get_db
from core.permissions import require_roles
from core.tenant import verifier_appartenance
from routers.factures import _creer_facture, _vehicule_doc_to_out
from schemas.devis import DevisCreate, DevisOut, DevisPatch, StatutDevis
from schemas.facture import LigneFacturePiece, LigneFactureService
from schemas.vehicule import VehiculeOut
from services.email_service import envoyer_devis_par_email
from services.notification_service import _log_notification, envoyer_notification_devis
from services.pdf_service import _infos_garage, generer_pdf_devis
from services.tax_service import calculer_taxes

router = APIRouter(prefix="/devis", tags=["Devis"])

# Transitions de statut autorisées
_TRANSITIONS: dict[StatutDevis, set[StatutDevis]] = {
    "brouillon": {"en_attente", "accepte", "refuse"},
    "en_attente": {"accepte", "refuse"},
    "accepte": set(),
    "refuse": set(),
}


def _enrich_devis(data: dict, client_nom: str = "", vehicule_info: VehiculeOut | None = None) -> DevisOut:
    data["client_nom"] = client_nom
    data["vehicule_info"] = vehicule_info
    return DevisOut(**data)


@router.get("", response_model=List[DevisOut])
async def list_devis(
    statut: str = "",
    client_id: str = "",
    _user: dict = Depends(verify_token),
):
    db = get_db()
    query = (
        db.collection("devis")
        .where("garage_id", "==", _user["garage_id"])
        .order_by("date_creation", direction="DESCENDING")
    )
    if statut in ("brouillon", "en_attente", "accepte", "refuse"):
        query = query.where("statut", "==", statut)
    if client_id:
        query = query.where("client_id", "==", client_id)
    docs = list(query.stream())

    client_ids = list({d.to_dict()["client_id"] for d in docs if d.to_dict().get("client_id")})
    client_names: dict[str, str] = {}
    if client_ids:
        for cdoc in db.get_all([db.collection("clients").document(cid) for cid in client_ids]):
            if cdoc.exists:
                client_names[cdoc.id] = cdoc.to_dict().get("nom", "")

    vehicule_ids = list({d.to_dict()["vehicule_id"] for d in docs if d.to_dict().get("vehicule_id")})
    vehicule_map: dict[str, VehiculeOut] = {}
    if vehicule_ids:
        for vdoc in db.get_all([db.collection("vehicules").document(vid) for vid in vehicule_ids]):
            if vdoc.exists:
                vehicule_map[vdoc.id] = _vehicule_doc_to_out(vdoc)

    result = []
    for doc in docs:
        data = doc.to_dict()
        data["devis_id"] = doc.id
        vehicule_info = vehicule_map.get(data.get("vehicule_id", ""))
        result.append(_enrich_devis(data, client_names.get(data.get("client_id", ""), ""), vehicule_info))

    return result


@router.post("", response_model=DevisOut, status_code=status.HTTP_201_CREATED)
async def create_devis(
    body: DevisCreate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()

    client_doc = db.collection("clients").document(body.client_id).get()
    client_data = verifier_appartenance(client_doc, _user["garage_id"], "Client introuvable")
    client_nom = client_data.get("nom", "")

    vehicule_doc = db.collection("vehicules").document(body.vehicule_id).get()
    vehicule_data = verifier_appartenance(vehicule_doc, _user["garage_id"], "Véhicule introuvable")
    vehicule_info = _vehicule_doc_to_out(vehicule_doc)

    total_pieces = sum(
        (0 if p.fournie_par_client else p.prix * p.quantite)
        for p in body.pieces
    )
    total_services = sum(s.prix for s in body.services)
    total_main_oeuvre = sum(m.heures * m.taux_horaire for m in body.main_oeuvre)
    totaux = calculer_taxes(total_pieces, total_services + total_main_oeuvre)

    year = datetime.now(timezone.utc).year
    count = int(
        db.collection("devis").where("garage_id", "==", _user["garage_id"]).count().get()[0][0].value
    ) + 1
    numero_devis = f"D-{year}-{count:03d}"

    data = {
        "garage_id": _user["garage_id"],
        "client_id": body.client_id,
        "vehicule_id": body.vehicule_id,
        "numero_devis": numero_devis,
        "pieces": [p.model_dump() for p in body.pieces],
        "services": [s.model_dump() for s in body.services],
        "main_oeuvre": [m.model_dump() for m in body.main_oeuvre],
        "total_pieces": round(total_pieces, 2),
        "total_services": round(total_services, 2),
        "total_main_oeuvre": round(total_main_oeuvre, 2),
        "taxes": totaux["taxes"],
        "total_devis": totaux["total"],
        "date_creation": datetime.now(timezone.utc).isoformat(),
        "statut": "brouillon",
        "converti": False,
        "facture_id": None,
        "notes": body.notes,
        "pdf_url": None,
    }

    ref = db.collection("devis").document()
    ref.set(data)
    devis_id = ref.id

    pdf_data = {
        **data,
        "vehicule": vehicule_data.get("marque_modele", ""),
        "annee": vehicule_data.get("annee"),
        "taille_moteur": vehicule_data.get("taille_moteur"),
        "plaque": vehicule_data.get("plaque"),
        "vin": vehicule_data.get("vin"),
    }
    try:
        pdf_url = generer_pdf_devis(
            devis_id=devis_id,
            client_nom=client_nom,
            client_telephone=client_data.get("telephone", ""),
            data=pdf_data,
        )
        ref.update({"pdf_url": pdf_url})
        data["pdf_url"] = pdf_url
    except Exception as e:
        print(f"[PDF ERROR] {e}")

    data["devis_id"] = devis_id
    return _enrich_devis(data, client_nom, vehicule_info)


@router.get("/{devis_id}", response_model=DevisOut)
async def get_devis(
    devis_id: str,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    doc = db.collection("devis").document(devis_id).get()
    data = verifier_appartenance(doc, _user["garage_id"], "Devis introuvable")
    data["devis_id"] = doc.id

    client_doc = db.collection("clients").document(data["client_id"]).get()
    client_nom = client_doc.to_dict().get("nom", "") if client_doc.exists else ""

    vehicule_info = None
    if data.get("vehicule_id"):
        vdoc = db.collection("vehicules").document(data["vehicule_id"]).get()
        if vdoc.exists:
            vehicule_info = _vehicule_doc_to_out(vdoc)

    return _enrich_devis(data, client_nom, vehicule_info)


@router.patch("/{devis_id}", response_model=DevisOut)
async def patch_devis(
    devis_id: str,
    body: DevisPatch,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("devis").document(devis_id)
    doc = ref.get()
    devis_data = verifier_appartenance(doc, _user["garage_id"], "Devis introuvable")
    statut_actuel: StatutDevis = devis_data.get("statut", "brouillon")

    if body.statut not in _TRANSITIONS.get(statut_actuel, set()):
        raise HTTPException(
            status_code=400,
            detail=f"Transition invalide : {statut_actuel} → {body.statut}",
        )

    ref.update({"statut": body.statut})

    client_doc = db.collection("clients").document(devis_data["client_id"]).get()
    client_nom = client_doc.to_dict().get("nom", "") if client_doc.exists else ""

    vehicule_info = None
    if devis_data.get("vehicule_id"):
        vdoc = db.collection("vehicules").document(devis_data["vehicule_id"]).get()
        if vdoc.exists:
            vehicule_info = _vehicule_doc_to_out(vdoc)

    data = {**devis_data, "statut": body.statut, "devis_id": devis_id}
    return _enrich_devis(data, client_nom, vehicule_info)


@router.post("/{devis_id}/convertir", response_model=DevisOut)
async def convertir_devis(
    devis_id: str,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("devis").document(devis_id)
    doc = ref.get()
    devis_data = verifier_appartenance(doc, _user["garage_id"], "Devis introuvable")
    if devis_data.get("statut") != "accepte":
        raise HTTPException(status_code=400, detail="Seul un devis accepté peut être converti en facture")
    if devis_data.get("converti"):
        raise HTTPException(status_code=400, detail="Ce devis a déjà été converti en facture")

    pieces = [LigneFacturePiece(**p) for p in devis_data.get("pieces", [])]
    services = [LigneFactureService(**s) for s in devis_data.get("services", [])]
    # La main d'œuvre du devis est reprise comme des lignes de service à prix fixe sur la facture
    for m in devis_data.get("main_oeuvre", []):
        services.append(LigneFactureService(
            service_id="main_oeuvre",
            nom=m["description"],
            prix=round(m["heures"] * m["taux_horaire"], 2),
        ))

    facture_data = _creer_facture(
        db,
        garage_id=_user["garage_id"],
        client_id=devis_data["client_id"],
        vehicule_id=devis_data["vehicule_id"],
        pieces=pieces,
        services=services,
        notes=devis_data.get("notes"),
        devis_id=devis_id,
    )

    ref.update({"converti": True, "facture_id": facture_data["facture_id"]})

    client_nom = facture_data.pop("_client_nom")
    vehicule_info = facture_data.pop("_vehicule_info")
    data = {**devis_data, "devis_id": devis_id, "converti": True, "facture_id": facture_data["facture_id"]}
    return _enrich_devis(data, client_nom, vehicule_info)


@router.post("/{devis_id}/envoyer", status_code=status.HTTP_204_NO_CONTENT)
async def envoyer_devis(
    devis_id: str,
    canal: str = "email",
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    doc = db.collection("devis").document(devis_id).get()
    devis_data = verifier_appartenance(doc, _user["garage_id"], "Devis introuvable")
    client_doc = db.collection("clients").document(devis_data["client_id"]).get()
    if not client_doc.exists:
        raise HTTPException(status_code=404, detail="Client introuvable")
    client_data = client_doc.to_dict()

    if canal == "sms":
        try:
            envoyer_notification_devis(
                db=db,
                garage_id=_user["garage_id"],
                devis_id=devis_id,
                client_id=devis_data["client_id"],
                client_nom=client_data.get("nom", ""),
                client_telephone=client_data.get("telephone", ""),
                numero_devis=devis_data.get("numero_devis", devis_id[:8].upper()),
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'envoi du SMS : {e}")
    else:
        pdf_url = devis_data.get("pdf_url")
        if not pdf_url:
            raise HTTPException(status_code=400, detail="Aucun PDF généré pour ce devis")
        email = client_data.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Ce client n'a pas d'adresse email enregistrée")
        numero_devis = devis_data.get("numero_devis", devis_id[:8].upper())
        try:
            envoyer_devis_par_email(
                destinataire=email,
                client_nom=client_data.get("nom", ""),
                numero_devis=numero_devis,
                pdf_url=pdf_url,
                garage_nom=_infos_garage(_user["garage_id"])[0],
            )
        except Exception as e:
            _log_notification(
                db, _user["garage_id"], devis_data["client_id"], "devis_envoye",
                f"Devis {numero_devis} envoyé par courriel", "email", "echoue",
                {"devis_id": devis_id},
            )
            raise HTTPException(status_code=500, detail=f"Erreur lors de l'envoi de l'email : {e}")

        _log_notification(
            db, _user["garage_id"], devis_data["client_id"], "devis_envoye",
            f"Devis {numero_devis} envoyé par courriel", "email", "envoye",
            {"devis_id": devis_id},
        )
