'use client';

import { use, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { CommandeFournisseur, MethodePaiement } from '@/types';
import api from '@/lib/api';
import { Plus, PackageCheck } from 'lucide-react';

const LABELS_STATUT: Record<string, string> = {
  commandee: 'Commandée',
  partiellement_recue: 'Partiellement reçue',
  recue: 'Reçue',
};

const COULEURS_STATUT: Record<string, string> = {
  commandee: 'bg-gray-200 text-gray-700',
  partiellement_recue: 'bg-orange-100 text-orange-700',
  recue: 'bg-green-100 text-green-700',
};

const LABELS_STATUT_PAIEMENT: Record<string, string> = {
  non_paye: 'Non payé',
  partiellement_paye: 'Partiellement payé',
  paye: 'Payé',
};

const COULEURS_STATUT_PAIEMENT: Record<string, string> = {
  non_paye: 'bg-red-100 text-red-700',
  partiellement_paye: 'bg-yellow-100 text-yellow-700',
  paye: 'bg-green-100 text-green-700',
};

const LABELS_METHODE: Record<MethodePaiement, string> = {
  comptant: 'Comptant',
  carte: 'Carte',
  virement: 'Virement',
  cheque: 'Chèque',
};

export default function CommandeFournisseurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [commande, setCommande] = useState<CommandeFournisseur | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantitesReception, setQuantitesReception] = useState<Record<string, number>>({});
  const [receiving, setReceiving] = useState(false);
  const [receptionMsg, setReceptionMsg] = useState<string | null>(null);

  const [montantPaiement, setMontantPaiement] = useState('');
  const [methodePaiement, setMethodePaiement] = useState<MethodePaiement>('comptant');
  const [addingPaiement, setAddingPaiement] = useState(false);
  const [paiementMsg, setPaiementMsg] = useState<string | null>(null);

  const reload = () =>
    api.get(`/commandes-fournisseur/${id}`).then((r) => setCommande(r.data)).catch(() => {});

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [id]);

  const handleReception = async (e: React.FormEvent) => {
    e.preventDefault();
    const lignes = Object.entries(quantitesReception)
      .filter(([, q]) => q > 0)
      .map(([piece_id, quantite]) => ({ piece_id, quantite }));
    if (lignes.length === 0) return;
    setReceiving(true);
    setReceptionMsg(null);
    try {
      const res = await api.post(`/commandes-fournisseur/${id}/reception`, { lignes });
      setCommande(res.data);
      setQuantitesReception({});
    } catch (err: any) {
      setReceptionMsg(err?.response?.data?.detail || 'Erreur lors de la réception.');
    } finally {
      setReceiving(false);
    }
  };

  const handleAjouterPaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = Number(montantPaiement);
    if (!montant || montant <= 0) return;
    setAddingPaiement(true);
    setPaiementMsg(null);
    try {
      const res = await api.post(`/commandes-fournisseur/${id}/paiements`, { montant, methode: methodePaiement });
      setCommande(res.data);
      setMontantPaiement('');
    } catch (err: any) {
      setPaiementMsg(err?.response?.data?.detail || "Erreur lors de l'enregistrement du paiement.");
    } finally {
      setAddingPaiement(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Commande fournisseur">
        <div className="text-gray-400 text-sm">Chargement...</div>
      </AppLayout>
    );
  }

  if (!commande) {
    return (
      <AppLayout title="Commande fournisseur">
        <div className="text-red-500 text-sm">Commande introuvable.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Commande ${commande.numero_commande || '#' + commande.commande_id.slice(-6).toUpperCase()}`}>
      <div className="max-w-2xl space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Fournisseur</p>
              <p className="font-bold text-gray-900 text-lg">{commande.fournisseur_nom}</p>
              <p className="text-xs text-gray-400 mt-1">{commande.date_commande}</p>
              {commande.notes && <p className="text-sm text-gray-600 mt-2">{commande.notes}</p>}
            </div>
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${COULEURS_STATUT[commande.statut]}`}>
              {LABELS_STATUT[commande.statut]}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Lignes commandées</h3>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">Pièce</th>
                <th className="text-center py-2 text-gray-500 font-medium">Commandée</th>
                <th className="text-center py-2 text-gray-500 font-medium">Reçue</th>
                <th className="text-right py-2 text-gray-500 font-medium">Prix unit.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {commande.lignes.map((l, i) => (
                <tr key={i}>
                  <td className="py-2 text-gray-800">{l.nom}</td>
                  <td className="py-2 text-center text-gray-600">{l.quantite_commandee}</td>
                  <td className="py-2 text-center text-gray-600">{l.quantite_recue}</td>
                  <td className="py-2 text-right text-gray-800">{l.prix_achat.toFixed(2)} $</td>
                </tr>
              ))}
            </tbody>
          </table>

          {receptionMsg && (
            <div className="mb-3 rounded-lg px-4 py-2.5 text-sm bg-red-50 border border-red-200 text-red-700">
              {receptionMsg}
            </div>
          )}

          {commande.statut !== 'recue' && (
            <form onSubmit={handleReception} className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">Enregistrer une réception</p>
              {commande.lignes
                .filter((l) => l.quantite_recue < l.quantite_commandee)
                .map((l, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="flex-1 text-xs text-gray-800 truncate">
                      {l.nom} (reste {l.quantite_commandee - l.quantite_recue})
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={l.quantite_commandee - l.quantite_recue}
                      value={quantitesReception[l.piece_id] || ''}
                      onChange={(e) => setQuantitesReception((prev) => ({ ...prev, [l.piece_id]: Number(e.target.value) }))}
                      placeholder="Qté reçue"
                      className="w-24 border border-gray-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              <button
                type="submit"
                disabled={receiving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <PackageCheck size={14} />
                {receiving ? 'Enregistrement...' : 'Enregistrer la réception'}
              </button>
            </form>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Paiements</h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${COULEURS_STATUT_PAIEMENT[commande.statut_paiement]}`}>
              {LABELS_STATUT_PAIEMENT[commande.statut_paiement]}
            </span>
          </div>

          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-500">Montant total</span>
            <span className="text-gray-800 font-medium">{commande.montant_total.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-500">Montant payé</span>
            <span className="text-gray-800 font-medium">{commande.montant_paye.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span className="text-gray-500">Solde dû</span>
            <span className="text-gray-900 font-bold">{commande.solde_restant.toFixed(2)} $</span>
          </div>

          {commande.paiements.length > 0 && (
            <div className="divide-y divide-gray-50 border-t border-gray-100 mb-4">
              {commande.paiements.map((p, i) => (
                <div key={i} className="flex justify-between py-2 text-sm">
                  <span className="text-gray-500">{p.date.slice(0, 10)} — {LABELS_METHODE[p.methode]}</span>
                  <span className="text-gray-800 font-medium">{p.montant.toFixed(2)} $</span>
                </div>
              ))}
            </div>
          )}

          {paiementMsg && (
            <div className="mb-3 rounded-lg px-4 py-2.5 text-sm bg-red-50 border border-red-200 text-red-700">
              {paiementMsg}
            </div>
          )}

          {commande.solde_restant > 0 && (
            <form onSubmit={handleAjouterPaiement} className="flex items-center gap-2">
              <input
                type="number"
                min={0.01}
                step={0.01}
                max={commande.solde_restant}
                value={montantPaiement}
                onChange={(e) => setMontantPaiement(e.target.value)}
                placeholder="Montant"
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={methodePaiement}
                onChange={(e) => setMethodePaiement(e.target.value as MethodePaiement)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(Object.keys(LABELS_METHODE) as MethodePaiement[]).map((m) => (
                  <option key={m} value={m}>{LABELS_METHODE[m]}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={addingPaiement}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus size={14} />
                {addingPaiement ? 'Enregistrement...' : 'Enregistrer le paiement'}
              </button>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
