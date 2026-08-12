'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Fournisseur } from '@/types';
import api from '@/lib/api';
import Link from 'next/link';
import { Search, Plus, UserX, UserCheck, Pencil } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import FournisseurForm, { FournisseurFormData } from '@/components/fournisseurs/FournisseurForm';

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editFournisseur, setEditFournisseur] = useState<Fournisseur | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/fournisseurs')
      .then((r) => setFournisseurs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = fournisseurs.filter((f) =>
    f.nom.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleActif = async (id: string, actif: boolean) => {
    if (!confirm(actif ? 'Désactiver ce fournisseur ?' : 'Réactiver ce fournisseur ?')) return;
    await api.patch(`/fournisseurs/${id}`, { active: !actif });
    setFournisseurs((prev) =>
      prev.map((f) => (f.fournisseur_id === id ? { ...f, active: !actif } : f))
    );
  };

  const handleAjouter = async (data: FournisseurFormData) => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/fournisseurs', data);
      setFournisseurs((prev) => [res.data, ...prev]);
      setDrawerOpen(false);
    } catch {
      setError('Erreur lors de la création du fournisseur.');
    } finally {
      setSaving(false);
    }
  };

  const handleModifier = async (data: FournisseurFormData) => {
    if (!editFournisseur) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/fournisseurs/${editFournisseur.fournisseur_id}`, data);
      setFournisseurs((prev) =>
        prev.map((f) => (f.fournisseur_id === editFournisseur.fournisseur_id ? res.data : f))
      );
      setEditFournisseur(null);
    } catch {
      setError('Erreur lors de la mise à jour du fournisseur.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Fournisseurs">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => { setError(''); setDrawerOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            Nouveau fournisseur
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Téléphone</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    Chargement...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    Aucun fournisseur trouvé
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.fournisseur_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/fournisseurs/${f.fournisseur_id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {f.nom}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{f.telephone || '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{f.email || '—'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          f.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {f.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setError(''); setEditFournisseur(f); }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleActif(f.fournisseur_id, f.active)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            f.active
                              ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={f.active ? 'Désactiver' : 'Réactiver'}
                        >
                          {f.active ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouveau fournisseur">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <FournisseurForm onSubmit={handleAjouter} loading={saving} />
      </Drawer>

      <Drawer open={!!editFournisseur} onClose={() => setEditFournisseur(null)} title="Modifier le fournisseur">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        {editFournisseur && (
          <FournisseurForm defaultValues={editFournisseur} onSubmit={handleModifier} loading={saving} />
        )}
      </Drawer>
    </AppLayout>
  );
}
