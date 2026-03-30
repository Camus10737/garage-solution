from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import clients, dashboard, factures, notifications, pieces, services, vehicules

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
app.include_router(clients.router)
app.include_router(vehicules.router)
app.include_router(pieces.router)
app.include_router(services.router)
app.include_router(factures.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
