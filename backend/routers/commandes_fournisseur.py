from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from core.firebase import get_db
from core.permissions import require_roles
from core.tenant import verifier_appartenance
from routers.factures import _recalculer_paiement
from schemas.commande_fournisseur import (
    CommandeFournisseurCreate,
    CommandeFournisseurOut,
    PaiementFournisseurCreate,
    ReceptionCreate,
)

router = APIRouter(prefix="/commandes-fournisseur", tags=["Commandes fournisseur"])


def _enrich_commande(data: dict, fournisseur_nom: str = "") -> CommandeFournisseurOut:
    data["fournisseur_nom"] = fournisseur_nom
    paiements = data.get("paiements", [])
    data["paiements"] = paiements
    data.update(_recalculer_paiement(data.get("montant_total", 0), paiements))
    return CommandeFournisseurOut(**data)


@router.get("", response_model=List[CommandeFournisseurOut])
async def list_commandes(
    fournisseur_id: str = "",
    statut: str = "",
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    query = (
        db.collection("commandes_fournisseur")
        .where("garage_id", "==", _user["garage_id"])
        .order_by("date_commande", direction="DESCENDING")
    )
    if fournisseur_id:
        query = query.where("fournisseur_id", "==", fournisseur_id)
    if statut in ("commandee", "partiellement_recue", "recue"):
        query = query.where("statut", "==", statut)
    docs = list(query.stream())

    fournisseur_ids = list({d.to_dict().get("fournisseur_id") for d in docs if d.to_dict().get("fournisseur_id")})
    noms: dict[str, str] = {}
    if fournisseur_ids:
        for fdoc in db.get_all([db.collection("fournisseurs").document(fid) for fid in fournisseur_ids]):
            if fdoc.exists:
                noms[fdoc.id] = fdoc.to_dict().get("nom", "")

    commandes = []
    for doc in docs:
        data = doc.to_dict()
        data["commande_id"] = doc.id
        commandes.append(_enrich_commande(data, noms.get(data.get("fournisseur_id", ""), "")))
    return commandes


@router.post("", response_model=CommandeFournisseurOut, status_code=status.HTTP_201_CREATED)
async def create_commande(
    body: CommandeFournisseurCreate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    fournisseur_doc = db.collection("fournisseurs").document(body.fournisseur_id).get()
    fournisseur_data = verifier_appartenance(fournisseur_doc, _user["garage_id"], "Fournisseur introuvable")
    fournisseur_nom = fournisseur_data.get("nom", "")

    montant_total = round(sum(l.quantite_commandee * l.prix_achat for l in body.lignes), 2)
    year = datetime.now(timezone.utc).year
    count = int(
        db.collection("commandes_fournisseur")
        .where("garage_id", "==", _user["garage_id"])
        .count()
        .get()[0][0]
        .value
    ) + 1
    numero_commande = f"CF-{year}-{count:03d}"

    data = {
        "garage_id": _user["garage_id"],
        "fournisseur_id": body.fournisseur_id,
        "numero_commande": numero_commande,
        "lignes": [l.model_dump() for l in body.lignes],
        "montant_total": montant_total,
        "paiements": [],
        "montant_paye": 0,
        "solde_restant": montant_total,
        "statut_paiement": "non_paye",
        "statut": "commandee",
        "commande_speciale_id": body.commande_speciale_id,
        "notes": body.notes,
        "date_commande": datetime.now(timezone.utc).isoformat(),
        "date_derniere_reception": None,
    }
    ref = db.collection("commandes_fournisseur").document()
    ref.set(data)
    data["commande_id"] = ref.id
    return _enrich_commande(data, fournisseur_nom)


@router.get("/{commande_id}", response_model=CommandeFournisseurOut)
async def get_commande(
    commande_id: str,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    doc = db.collection("commandes_fournisseur").document(commande_id).get()
    data = verifier_appartenance(doc, _user["garage_id"], "Commande introuvable")
    data["commande_id"] = doc.id
    fournisseur_doc = db.collection("fournisseurs").document(data["fournisseur_id"]).get()
    fournisseur_nom = fournisseur_doc.to_dict().get("nom", "") if fournisseur_doc.exists else ""
    return _enrich_commande(data, fournisseur_nom)


@router.post("/{commande_id}/reception", response_model=CommandeFournisseurOut)
async def recevoir_commande(
    commande_id: str,
    body: ReceptionCreate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("commandes_fournisseur").document(commande_id)
    doc = ref.get()
    data = verifier_appartenance(doc, _user["garage_id"], "Commande introuvable")
    if data.get("statut") == "recue":
        raise HTTPException(status_code=400, detail="Cette commande a déjà été entièrement reçue")

    lignes = data.get("lignes", [])
    quantites_par_piece = {l.piece_id: l.quantite for l in body.lignes}

    now = datetime.now(timezone.utc).isoformat()
    for ligne in lignes:
        recue_maintenant = quantites_par_piece.get(ligne["piece_id"])
        if not recue_maintenant:
            continue
        ligne["quantite_recue"] = ligne.get("quantite_recue", 0) + recue_maintenant

        piece_ref = db.collection("pieces").document(ligne["piece_id"])
        piece_doc = piece_ref.get()
        if piece_doc.exists:
            stock_actuel = piece_doc.to_dict().get("quantite")
            if stock_actuel is not None:
                piece_ref.update({"quantite": stock_actuel + recue_maintenant})
        db.collection("mouvements_stock").document().set({
            "garage_id": _user["garage_id"],
            "piece_id": ligne["piece_id"],
            "type": "entree",
            "quantite": recue_maintenant,
            "source": "reception_fournisseur",
            "reference_id": commande_id,
            "date": now,
        })

    statut = "recue" if all(l.get("quantite_recue", 0) >= l["quantite_commandee"] for l in lignes) else "partiellement_recue"

    updates = {"lignes": lignes, "statut": statut, "date_derniere_reception": now}
    ref.update(updates)

    if statut == "recue" and data.get("commande_speciale_id"):
        from routers.commandes_speciales import _marquer_recue
        try:
            _marquer_recue(db, data["commande_speciale_id"], incrementer_stock=False)
        except Exception:
            pass

    fournisseur_doc = db.collection("fournisseurs").document(data["fournisseur_id"]).get()
    fournisseur_nom = fournisseur_doc.to_dict().get("nom", "") if fournisseur_doc.exists else ""

    result = {**data, **updates, "commande_id": commande_id}
    return _enrich_commande(result, fournisseur_nom)


@router.post("/{commande_id}/paiements", response_model=CommandeFournisseurOut)
async def ajouter_paiement_commande(
    commande_id: str,
    body: PaiementFournisseurCreate,
    _user: dict = Depends(require_roles("admin", "gestionnaire")),
):
    db = get_db()
    ref = db.collection("commandes_fournisseur").document(commande_id)
    doc = ref.get()
    data = verifier_appartenance(doc, _user["garage_id"], "Commande introuvable")
    paiements = data.get("paiements", [])
    recalc_avant = _recalculer_paiement(data.get("montant_total", 0), paiements)
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
    recalc = _recalculer_paiement(data.get("montant_total", 0), paiements)
    ref.update({"paiements": paiements, **recalc})

    fournisseur_doc = db.collection("fournisseurs").document(data["fournisseur_id"]).get()
    fournisseur_nom = fournisseur_doc.to_dict().get("nom", "") if fournisseur_doc.exists else ""

    result = {**data, "paiements": paiements, "commande_id": commande_id}
    return _enrich_commande(result, fournisseur_nom)
