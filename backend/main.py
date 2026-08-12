from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import (
    auth,
    clients,
    commandes_fournisseur,
    commandes_speciales,
    dashboard,
    devis,
    export_comptable,
    factures,
    fournisseurs,
    garage,
    modeles_rappel,
    notifications,
    parametres,
    pieces,
    promotions,
    rappels_entretien,
    rendez_vous,
    services,
    users,
    vehicules,
)

app = FastAPI(
    title="Garage Solution API",
    description="Backend FastAPI pour la gestion de garage — Québec",
    version="1.0.0",
)

# CORS : autoriser le frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(vehicules.router)
app.include_router(pieces.router)
app.include_router(services.router)
app.include_router(factures.router)
app.include_router(devis.router)
app.include_router(notifications.router)
app.include_router(parametres.router)
app.include_router(fournisseurs.router)
app.include_router(commandes_fournisseur.router)
app.include_router(commandes_speciales.router)
app.include_router(export_comptable.router)
app.include_router(modeles_rappel.router)
app.include_router(rappels_entretien.router)
app.include_router(promotions.router)
app.include_router(rendez_vous.router)
app.include_router(dashboard.router)
app.include_router(garage.router)
app.include_router(users.router)


@app.get("/health")
def health():
    return {"status": "ok"}
