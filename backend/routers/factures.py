from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.auth import verify_token
from core.firebase import get_db
from core.permissions import require_roles
from core.tenant import verifier_appartenance
from schemas.facture import (
    FactureAnnuler,
    FactureCreate,
    FactureOut,
    FacturePatch,
    LigneFacturePiece,
    LigneFactureService,
    MecanicienPatch,
    PaiementCreate,
)
from schemas.vehicule import VehiculeOut
from services.email_service import envoyer_facture_par_email
from services.notification_service import (
    _log_notification,
    envoyer_notification_rappel_paiement,
    envoyer_notification_statut_reparation,
)
from services.pdf_service import _infos_garage, generer_pdf_facture
from services.tax_service import calculer_taxes

router = APIRouter(prefix="/factures", tags=["Factures"])


def _decrementer_stock(db, garage_id: str, pieces: list, source: str, reference_id: str) -> None:
    """Décrémente le stock des pièces suivies (quantite non None) et non fournies par le client,
    et journalise chaque sortie dans `mouvements_stock`. `pieces` : liste de LigneFacturePiece ou dicts.
    """
    def _get(item, field):
        return getattr(item, field) if hasattr(item, field) else item[field]

    now = datetime.now(timezone.utc).isoformat()
    for ligne in pieces:
        if _get(ligne, "fournie_par_client"):
            continue
        piece_id = _get(ligne, "piece_id")
        quantite = _get(ligne, "quantite")
        piece_ref = db.collection("pieces").document(piece_id)
        piece_doc = piece_ref.get()
        if not piece_doc.exists:
            continue
        stock_actuel = piece_doc.to_dict().get("quantite")
        if stock_actuel is None:
            continue
        piece_ref.update({"quantite": stock_actuel - quantite})
        db.collection("mouvements_stock").document().set({
            "garage_id": garage_id,
            "piece_id": piece_id,
            "type": "sortie",
            "quantite": quantite,
            "source": source,
            "reference_id": reference_id,
            "date": now,
        })


def _vehicule_doc_to_out(doc) -> VehiculeOut:
    data = doc.to_dict()
    data["vehicule_id"] = doc.id
    return VehiculeOut(**data)


def _recalculer_paiement(total_facture: float, paiements: list[dict]) -> dict:
    montant_paye = round(sum(p["montant"] for p in paiements), 2)
    solde_restant = round(total_facture - montant_paye, 2)
    if montant_paye <= 0:
        statut_paiement = "non_paye"
    elif solde_restant <= 0:
        statut_paiement = "paye"
    else:
        statut_paiement = "partiellement_paye"
    return {
        "montant_paye": montant_paye,
        "solde_restant": solde_restant,
        "statut_paiement": statut_paiement,
    }


def _recalculer_totaux(pieces: list, services: list) -> dict:
    """Accepte des listes de LigneFacturePiece/LigneFactureService (modèles ou dicts)."""
    def _get(item, field):
        return getattr(item, field) if hasattr(item, field) else item[field]

    total_pieces = sum(
        (0 if _get(p, "fournie_par_client") else _get(p, "prix") * _get(p, "quantite"))
        for p in pieces
    )
    total_services = sum(_get(s, "prix") for s in services)
    totaux_taxes = calculer_taxes(total_pieces, total_services)
    return {
        "total_pieces": round(total_pieces, 2),
        "total_services": round(total_services, 2),
        "taxes": totaux_taxes["taxes"],
        "total_facture": totaux_taxes["total"],
    }


def _enrich_facture(data: dict, client_nom: str = "", vehicule_info: VehiculeOut | None = None) -> FactureOut:
    data["client_nom"] = client_nom
    data["vehicule_info"] = vehicule_info
    # Recalculé à la volée (pas seulement lu tel quel) pour rester correct même sur
    # les anciennes factures créées avant l'ajout du suivi des paiements.
    paiements = data.get("paiements", [])
    data["paiements"] = paiements
    data.update(_recalculer_paiement(data.get("total_facture", 0), paiements))
    # Normalisation rétrocompatible : anciennes factures avec seulement `statut_vehicule`.
    if "statut_reparation" not in data:
        data["statut_reparation"] = "fini" if data.get("statut_vehicule") == "pret" else "en_cours"
    data.setdefault("historique_statuts", [])
    return FactureOut(**data)


@router.get("", response_model=List[FactureOut])
async def list_factures(
    statut: str = "",
    _user: dict = Depends(verify_token),
):
    db = get_db()
    query = (
        db.collection("factures")
        .where("garage_id", "==", _user["garage_id"])
        .order_by("date_creation", direction="DESCENDING")
    )
    if statut in ("en_attente", "en_attente_piece", "en_cours", "fini"):
        query = query.where("statut_reparation", "==", statut)
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


def _creer_facture(
    db,
    garage_id: str,
    client_id: str,
    vehicule_id: str,
    pieces: List[LigneFacturePiece],
    services: List[LigneFactureService],
    notes: str | None,
    devis_id: str | None = None,
    kilometrage: int | None = None,
) -> dict:
    """Crée une facture (Firestore + PDF) et retourne ses données enrichies.

    Réutilisé par POST /factures et par la conversion d'un devis accepté.
    """
    # Vérifier le client
    client_doc = db.collection("clients").document(client_id).get()
    client_data = verifier_appartenance(client_doc, garage_id, "Client introuvable")
    client_nom = client_data.get("nom", "")

    # Vérifier le véhicule
    vehicule_ref = db.collection("vehicules").document(vehicule_id)
    vehicule_doc = vehicule_ref.get()
    verifier_appartenance(vehicule_doc, garage_id, "Véhicule introuvable")
    if kilometrage is not None:
        vehicule_ref.update({"kilometrage_actuel": kilometrage})
        vehicule_doc = vehicule_ref.get()
    vehicule_data = vehicule_doc.to_dict()
    vehicule_info = _vehicule_doc_to_out(vehicule_doc)

    totaux = _recalculer_totaux(pieces, services)

    year = datetime.now(timezone.utc).year
    count = int(
        db.collection("factures").where("garage_id", "==", garage_id).count().get()[0][0].value
    ) + 1
    numero_facture = f"F-{year}-{count:03d}"
    now = datetime.now(timezone.utc).isoformat()

    data = {
        "garage_id": garage_id,
        "client_id": client_id,
        "vehicule_id": vehicule_id,
        "devis_id": devis_id,
        "numero_facture": numero_facture,
        "pieces": [p.model_dump() for p in pieces],
        "services": [s.model_dump() for s in services],
        **totaux,
        "date_creation": now,
        "statut_reparation": "en_cours",
        "historique_statuts": [{"statut": "en_cours", "date": now}],
        "mecanicien_nom": None,
        "paiements": [],
        "montant_paye": 0,
        "solde_restant": totaux["total_facture"],
        "statut_paiement": "non_paye",
        "annulee": False,
        "raison_annulation": None,
        "date_annulation": None,
        "notes": notes,
        "pdf_url": None,
    }

    ref = db.collection("factures").document()
    ref.set(data)
    facture_id = ref.id

    _decrementer_stock(db, garage_id, pieces, source="facture", reference_id=facture_id)

    pdf_url = _regenerer_pdf(ref, facture_id, data, client_nom, client_data.get("telephone", ""), vehicule_data)
    data["pdf_url"] = pdf_url

    data["facture_id"] = facture_id
    data["_client_nom"] = client_nom
    data["_vehicule_info"] = vehicule_info
    return data


def _regenerer_pdf(ref, facture_id: str, data: dict, client_nom: str, client_telephone: str, vehicule_data: dict) -> str | None:
    """Génère (ou régénère) le PDF d'une facture et persiste son URL. Retourne l'URL ou None si échec."""
    pdf_data = {
        **data,
        "vehicule": vehicule_data.get("marque_modele", ""),
        "annee": vehicule_data.get("annee"),
        "taille_moteur": vehicule_data.get("taille_moteur"),
        "plaque": vehicule_data.get("plaque"),
        "vin": vehicule_data.get("vin"),
    }
    try:
        pdf_url = generer_pdf_facture(
            facture_id=facture_id,
            client_nom=client_nom,
            client_telephone=client_telephone,
            data=pdf_data,
        )
        ref.update({"pdf_url": pdf_url})
        return pdf_url
    except Exception as e:
        print(f"[PDF ERROR] {e}")
        return data.get("pdf_url")


@router.post("", response_model=FactureOut, status_code=status.HTTP_201_CREATED)
async def create_facture(
    body: FactureCreate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    data = _creer_facture(
        db,
        garage_id=_user["garage_id"],
        client_id=body.client_id,
        vehicule_id=body.vehicule_id,
        pieces=body.pieces,
        services=body.services,
        notes=body.notes,
        kilometrage=body.kilometrage,
    )
    client_nom = data.pop("_client_nom")
    vehicule_info = data.pop("_vehicule_info")
    return _enrich_facture(data, client_nom, vehicule_info)


@router.get("/{facture_id}", response_model=FactureOut)
async def get_facture(
    facture_id: str,
    _user: dict = Depends(verify_token),
):
    db = get_db()
    doc = db.collection("factures").document(facture_id).get()
    data = verifier_appartenance(doc, _user["garage_id"], "Facture introuvable")
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
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("factures").document(facture_id)
    doc = ref.get()
    facture_data = verifier_appartenance(doc, _user["garage_id"], "Facture introuvable")
    if facture_data.get("annulee"):
        raise HTTPException(status_code=400, detail="Facture annulée : statut verrouillé")

    ancien_statut = facture_data.get("statut_reparation") or (
        "fini" if facture_data.get("statut_vehicule") == "pret" else "en_cours"
    )
    historique = facture_data.get("historique_statuts", [])
    updates: dict = {"statut_reparation": body.statut_reparation}

    client_doc = db.collection("clients").document(facture_data["client_id"]).get()
    client_nom = client_doc.to_dict().get("nom", "") if client_doc.exists else ""

    vehicule_info = None
    if facture_data.get("vehicule_id"):
        vdoc = db.collection("vehicules").document(facture_data["vehicule_id"]).get()
        if vdoc.exists:
            vehicule_info = _vehicule_doc_to_out(vdoc)

    # N'ajouter une entrée d'historique et notifier que si le statut change réellement.
    if body.statut_reparation != ancien_statut:
        now = datetime.now(timezone.utc).isoformat()
        historique = historique + [{"statut": body.statut_reparation, "date": now}]
        updates["historique_statuts"] = historique
        if client_doc.exists:
            client_data = client_doc.to_dict()
            try:
                envoyer_notification_statut_reparation(
                    db=db,
                    garage_id=_user["garage_id"],
                    facture_id=facture_id,
                    client_id=facture_data["client_id"],
                    client_nom=client_data.get("nom", ""),
                    client_telephone=client_data.get("telephone", ""),
                    client_email=client_data.get("email"),
                    statut=body.statut_reparation,
                )
            except Exception:
                pass

    ref.update(updates)

    data = {**facture_data, **updates, "facture_id": facture_id}
    return _enrich_facture(data, client_nom, vehicule_info)


@router.patch("/{facture_id}/mecanicien", response_model=FactureOut)
async def patch_mecanicien(
    facture_id: str,
    body: MecanicienPatch,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("factures").document(facture_id)
    doc = ref.get()
    facture_data = verifier_appartenance(doc, _user["garage_id"], "Facture introuvable")
    if facture_data.get("annulee"):
        raise HTTPException(status_code=400, detail="Facture annulée : verrouillée")

    ref.update({"mecanicien_nom": body.mecanicien_nom})

    client_doc = db.collection("clients").document(facture_data["client_id"]).get()
    client_nom = client_doc.to_dict().get("nom", "") if client_doc.exists else ""

    vehicule_info = None
    if facture_data.get("vehicule_id"):
        vdoc = db.collection("vehicules").document(facture_data["vehicule_id"]).get()
        if vdoc.exists:
            vehicule_info = _vehicule_doc_to_out(vdoc)

    data = {**facture_data, "mecanicien_nom": body.mecanicien_nom, "facture_id": facture_id}
    return _enrich_facture(data, client_nom, vehicule_info)


@router.post("/{facture_id}/envoyer-email", status_code=status.HTTP_204_NO_CONTENT)
async def envoyer_email_facture(
    facture_id: str,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    doc = db.collection("factures").document(facture_id).get()
    facture_data = verifier_appartenance(doc, _user["garage_id"], "Facture introuvable")
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

    numero_facture = facture_data.get("numero_facture", facture_id[:8].upper())
    try:
        envoyer_facture_par_email(
            destinataire=email,
            client_nom=client_data.get("nom", ""),
            numero_facture=numero_facture,
            pdf_url=pdf_url,
            garage_nom=_infos_garage(_user["garage_id"])[0],
        )
    except Exception as e:
        _log_notification(
            db, _user["garage_id"], facture_data["client_id"], "facture_envoyee",
            f"Facture {numero_facture} envoyée par courriel", "email", "echoue",
            {"facture_id": facture_id},
        )
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'envoi de l'email : {e}")

    _log_notification(
        db, _user["garage_id"], facture_data["client_id"], "facture_envoyee",
        f"Facture {numero_facture} envoyée par courriel", "email", "envoye",
        {"facture_id": facture_id},
    )


@router.post("/{facture_id}/rappel-paiement", status_code=status.HTTP_204_NO_CONTENT)
async def rappel_paiement(
    facture_id: str,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    doc = db.collection("factures").document(facture_id).get()
    facture_data = verifier_appartenance(doc, _user["garage_id"], "Facture introuvable")
    if facture_data.get("annulee"):
        raise HTTPException(status_code=400, detail="Facture annulée")

    solde_restant = _recalculer_paiement(
        facture_data.get("total_facture", 0), facture_data.get("paiements", [])
    )["solde_restant"]
    if solde_restant <= 0:
        raise HTTPException(status_code=400, detail="Cette facture n'a pas de solde restant")

    client_doc = db.collection("clients").document(facture_data["client_id"]).get()
    if not client_doc.exists:
        raise HTTPException(status_code=404, detail="Client introuvable")
    client_data = client_doc.to_dict()

    envoyer_notification_rappel_paiement(
        db=db,
        garage_id=_user["garage_id"],
        facture_id=facture_id,
        client_id=facture_data["client_id"],
        client_nom=client_data.get("nom", ""),
        client_telephone=client_data.get("telephone", ""),
        client_email=client_data.get("email"),
        numero_facture=facture_data.get("numero_facture", facture_id[:8].upper()),
        solde_restant=solde_restant,
    )


@router.post("/{facture_id}/paiements", response_model=FactureOut)
async def ajouter_paiement(
    facture_id: str,
    body: PaiementCreate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("factures").document(facture_id)
    doc = ref.get()
    facture_data = verifier_appartenance(doc, _user["garage_id"], "Facture introuvable")
    if facture_data.get("annulee"):
        raise HTTPException(status_code=400, detail="Facture annulée : aucun paiement ne peut être enregistré")

    paiements = facture_data.get("paiements", [])
    recalc_avant = _recalculer_paiement(facture_data.get("total_facture", 0), paiements)
    if body.montant > recalc_avant["solde_restant"]:
        raise HTTPException(
            status_code=400,
            detail=f"Le montant dépasse le solde restant ({recalc_avant['solde_restant']:.2f} $)",
        )

    nouveau_paiement = {
        "montant": round(body.montant, 2),
        "methode": body.methode,
        "date": datetime.now(timezone.utc).isoformat(),
    }
    paiements = paiements + [nouveau_paiement]
    recalc = _recalculer_paiement(facture_data.get("total_facture", 0), paiements)
    ref.update({"paiements": paiements, **recalc})

    client_doc = db.collection("clients").document(facture_data["client_id"]).get()
    client_nom = client_doc.to_dict().get("nom", "") if client_doc.exists else ""

    vehicule_info = None
    if facture_data.get("vehicule_id"):
        vdoc = db.collection("vehicules").document(facture_data["vehicule_id"]).get()
        if vdoc.exists:
            vehicule_info = _vehicule_doc_to_out(vdoc)

    data = {**facture_data, "paiements": paiements, "facture_id": facture_id}
    return _enrich_facture(data, client_nom, vehicule_info)


@router.post("/{facture_id}/annuler", response_model=FactureOut)
async def annuler_facture(
    facture_id: str,
    body: FactureAnnuler,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("factures").document(facture_id)
    doc = ref.get()
    facture_data = verifier_appartenance(doc, _user["garage_id"], "Facture introuvable")
    if facture_data.get("annulee"):
        raise HTTPException(status_code=400, detail="Cette facture est déjà annulée")

    date_annulation = datetime.now(timezone.utc).isoformat()
    ref.update({
        "annulee": True,
        "raison_annulation": body.raison,
        "date_annulation": date_annulation,
    })

    client_doc = db.collection("clients").document(facture_data["client_id"]).get()
    client_nom = client_doc.to_dict().get("nom", "") if client_doc.exists else ""

    vehicule_info = None
    if facture_data.get("vehicule_id"):
        vdoc = db.collection("vehicules").document(facture_data["vehicule_id"]).get()
        if vdoc.exists:
            vehicule_info = _vehicule_doc_to_out(vdoc)

    data = {
        **facture_data,
        "annulee": True,
        "raison_annulation": body.raison,
        "date_annulation": date_annulation,
        "facture_id": facture_id,
    }
    return _enrich_facture(data, client_nom, vehicule_info)


def _ajouter_ligne(db, facture_id: str, facture_data: dict, ref, pieces: list, services: list) -> tuple[dict, str, VehiculeOut | None]:
    """Recalcule les totaux/paiement, régénère le PDF, et retourne (data, client_nom, vehicule_info)."""
    totaux = _recalculer_totaux(pieces, services)
    updates = {
        "pieces": pieces,
        "services": services,
        **totaux,
        **_recalculer_paiement(totaux["total_facture"], facture_data.get("paiements", [])),
    }
    ref.update(updates)

    client_doc = db.collection("clients").document(facture_data["client_id"]).get()
    client_data = client_doc.to_dict() if client_doc.exists else {}
    client_nom = client_data.get("nom", "")

    vehicule_info = None
    vehicule_data: dict = {}
    if facture_data.get("vehicule_id"):
        vdoc = db.collection("vehicules").document(facture_data["vehicule_id"]).get()
        if vdoc.exists:
            vehicule_data = vdoc.to_dict()
            vehicule_info = _vehicule_doc_to_out(vdoc)

    data = {**facture_data, **updates, "facture_id": facture_id}
    pdf_url = _regenerer_pdf(ref, facture_id, data, client_nom, client_data.get("telephone", ""), vehicule_data)
    data["pdf_url"] = pdf_url
    return data, client_nom, vehicule_info


@router.post("/{facture_id}/pieces", response_model=FactureOut)
async def ajouter_piece(
    facture_id: str,
    body: LigneFacturePiece,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("factures").document(facture_id)
    doc = ref.get()
    facture_data = verifier_appartenance(doc, _user["garage_id"], "Facture introuvable")
    if facture_data.get("annulee"):
        raise HTTPException(status_code=400, detail="Facture annulée : impossible d'ajouter une ligne")

    pieces = facture_data.get("pieces", []) + [body.model_dump()]
    data, client_nom, vehicule_info = _ajouter_ligne(
        db, facture_id, facture_data, ref, pieces, facture_data.get("services", [])
    )
    _decrementer_stock(db, _user["garage_id"], [body], source="facture", reference_id=facture_id)
    return _enrich_facture(data, client_nom, vehicule_info)


@router.post("/{facture_id}/services", response_model=FactureOut)
async def ajouter_service(
    facture_id: str,
    body: LigneFactureService,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("factures").document(facture_id)
    doc = ref.get()
    facture_data = verifier_appartenance(doc, _user["garage_id"], "Facture introuvable")
    if facture_data.get("annulee"):
        raise HTTPException(status_code=400, detail="Facture annulée : impossible d'ajouter une ligne")

    services = facture_data.get("services", []) + [body.model_dump()]
    data, client_nom, vehicule_info = _ajouter_ligne(
        db, facture_id, facture_data, ref, facture_data.get("pieces", []), services
    )
    return _enrich_facture(data, client_nom, vehicule_info)
