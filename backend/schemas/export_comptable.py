from pydantic import BaseModel


class ResumeComptable(BaseModel):
    date_debut: str
    date_fin: str
    revenus_payes: float
    revenus_en_attente: float
    revenus_annules: float
    tps_collectee: float
    tvq_collectee: float
    taxes_totales: float
    depenses_fournisseurs_payees: float
    depenses_fournisseurs_dues: float
    profit_net_approximatif: float
    comptes_a_recevoir: float
    comptes_a_payer: float
    nombre_factures: int
    nombre_commandes_fournisseur: int
