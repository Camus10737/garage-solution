'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { CommandeFournisseur, StatutCommandeFournisseur } from '@/types';
import api from '@/lib/api';
import Link from 'next/link';
import { Plus, Eye, Filter } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import CommandeFournisseurForm, { CommandeFournisseurFormData } from '@/components/commandes-fournisseur/CommandeFournisseurForm';

const LABELS_STATUT: Record<StatutCommandeFournisseur, string> = {
  commandee: 'Commandée',
  partiellement_recue: 'Partiellement reçue',
  recue: 'Reçue',
};

const COULEURS_STATUT: Record<StatutCommandeFournisseur, string> = {
  commandee: 'bg-gray-200 text-gray-700',
  partiellement_recue: 'bg-orange-100 text-orange-700',
  recue: 'bg-green-100 text-green-700',
};

export default function CommandesFournisseurPage() {
  const [commandes, setCommandes] = useState<CommandeFournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<'tous' | StatutCommandeFournisseur>('tous');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/commandes-fournisseur')
      .then((r) => setCommandes(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = commandes.filter((c) => filtre === 'tous' || c.statut === filtre);

  const handleAjouter = async (data: CommandeFournisseurFormData) => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/commandes-fournisseur', data);
      setCommandes((prev) => [res.data, ...prev]);
      setDrawerOpen(false);
    } catch {
      setError('Erreur lors de la création de la commande.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Commandes fournisseur">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={15} className="text-gray-400" />
            {(['tous', 'commandee', 'partiellement_recue', 'recue'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltre(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  filtre === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'tous' ? 'Tous' : LABELS_STATUT[f]}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setError(''); setDrawerOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            Nouvelle commande
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-600">#</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Fournisseur</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Montant</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Aucune commande</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.commande_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {c.numero_commande || '#' + c.commande_id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{c.fournisseur_nom}</td>
                    <td className="px-6 py-4 text-gray-600">{c.date_commande}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${COULEURS_STATUT[c.statut]}`}>
                        {LABELS_STATUT[c.statut]}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{c.montant_total.toFixed(2)} $</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/commandes-fournisseur/${c.commande_id}`}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                        title="Voir"
                      >
                        <Eye size={15} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouvelle commande fournisseur">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <CommandeFournisseurForm onSubmit={handleAjouter} loading={saving} />
      </Drawer>
    </AppLayout>
  );
}
