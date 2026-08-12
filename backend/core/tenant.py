from fastapi import HTTPException


def verifier_appartenance(doc, garage_id: str, detail: str = "Ressource introuvable") -> dict:
    """Vérifie qu'un document Firestore existe et appartient au garage donné.

    Retourne 404 (pas 403) si le document appartient à un autre garage, pour ne
    pas révéler son existence à un tenant qui n'y a pas droit.
    """
    if not doc.exists or doc.to_dict().get("garage_id") != garage_id:
        raise HTTPException(status_code=404, detail=detail)
    return doc.to_dict()
