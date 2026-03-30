import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

from .firebase import get_firebase_app

security = HTTPBearer()

_token_cache: dict[str, tuple[dict, float]] = {}
_TOKEN_TTL = 300  # 5 minutes


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Vérifie le token Firebase et retourne les claims de l'utilisateur."""
    get_firebase_app()
    token = credentials.credentials

    now = time.monotonic()
    cached = _token_cache.get(token)
    if cached and now < cached[1]:
        return cached[0]

    try:
        decoded = auth.verify_id_token(token)
        _token_cache[token] = (decoded, now + _TOKEN_TTL)
        return decoded
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
