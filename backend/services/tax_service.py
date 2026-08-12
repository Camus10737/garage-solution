"""Calcul des taxes québécoises (TPS + TVQ), partagé entre factures et devis."""

TPS_RATE = 0.05       # 5%
TVQ_RATE = 0.09975    # 9.975%


def calculer_taxes(sous_total_1: float, sous_total_2: float) -> dict:
    sous_total = sous_total_1 + sous_total_2
    taxes = round(sous_total * (TPS_RATE + TVQ_RATE), 2)
    total = round(sous_total + taxes, 2)
    return {"taxes": taxes, "total": total}
