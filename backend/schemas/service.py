from typing import Optional

from pydantic import BaseModel, Field


class ServiceCreate(BaseModel):
    nom: str = Field(..., min_length=1)
    prix: float = Field(..., ge=0)


class ServiceUpdate(BaseModel):
    nom: Optional[str] = None
    prix: Optional[float] = Field(None, ge=0)


class ServicePatch(BaseModel):
    active: bool


class ServiceOut(BaseModel):
    service_id: str
    nom: str
    prix: float
    active: bool
