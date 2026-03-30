'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Facture } from '@/types';
import api from '@/lib/api';
import Link from 'next/link';
import { Plus, Eye, Filter } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import FactureForm, { FactureFormData } from '@/components/factures/FactureForm';

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<'tous' | 'en_cours' | 'pret'>('tous');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/factures')
      .then((r) => setFactures(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = factures.filter(
    (f) => filtre === 'tous' || f.statut_vehicule === filtre
  );

  const handleAjouter = async (data: FactureFormData) => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/factures', data);
      setFactures((prev) => [res.data, ...prev]);
      setDrawerOpen(false);
    } catch {
      setError('Erreur lors de la création de la facture.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Factures">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-gray-400" />
            {(['tous', 'en_cours', 'pret'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltre(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  filtre === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'tous' ? 'Tous' : f === 'en_cours' ? 'En cours' : 'Prêts'}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setError(''); setDrawerOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            Nouvelle facture
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-600">#</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Client</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    Chargement...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    Aucune facture
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.facture_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {f.numero_facture || '#' + f.facture_id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{f.client_nom}</td>
                    <td className="px-6 py-4 text-gray-600">{f.date_creation}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          f.statut_vehicule === 'pret'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {f.statut_vehicule === 'pret' ? 'Prêt' : 'En cours'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      {f.total_facture.toFixed(2)} $
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/factures/${f.facture_id}`}
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouvelle facture">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <FactureForm onSubmit={handleAjouter} loading={saving} />
      </Drawer>
    </AppLayout>
  );
}
