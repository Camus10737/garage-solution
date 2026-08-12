import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

from .firebase import get_db, get_firebase_app

security = HTTPBearer()

_token_cache: dict[str, tuple[dict, float]] = {}
_TOKEN_TTL = 300  # 5 minutes


def _decode_token(token: str) -> dict:
    get_firebase_app()
    try:
        return auth.verify_id_token(token)
    except auth.ExpiredIdTokenError:
        _token_cache.pop(token, None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expiré",
        )
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification échouée",
        )


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Vérifie le token Firebase, résout le garage/rôle de l'utilisateur et retourne le tout."""
    token = credentials.credentials

    now = time.monotonic()
    cached = _token_cache.get(token)
    if cached and now < cached[1]:
        return cached[0]

    decoded = _decode_token(token)

    user_doc = get_db().collection("users").document(decoded["uid"]).get()
    if not user_doc.exists or not user_doc.to_dict().get("actif", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte non provisionné ou inactif",
        )

    user_data = user_doc.to_dict()
    decoded["garage_id"] = user_data["garage_id"]
    decoded["role"] = user_data.get("role", "admin")

    _token_cache[token] = (decoded, now + _TOKEN_TTL)
    return decoded


async def verify_token_raw(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Décode le token Firebase sans exiger de users/{uid} existant.

    Réservé au bootstrap (POST /garages) : le tout premier appel authentifié d'un
    compte Firebase fraîchement créé, avant qu'il ait un document users/{uid}.
    """
    return _decode_token(credentials.credentials)
