from fastapi import Depends, HTTPException, status

from .auth import verify_token


def require_roles(*roles: str):
    """Dépendance FastAPI : exige que l'utilisateur authentifié ait l'un des rôles donnés."""

    async def checker(user: dict = Depends(verify_token)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Action non autorisée pour votre rôle",
            )
        return user

    return checker
