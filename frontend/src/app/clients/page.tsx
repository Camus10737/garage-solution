'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Client } from '@/types';
import api from '@/lib/api';
import Link from 'next/link';
import { Search, Plus, UserX, UserCheck, Pencil } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import ClientForm, { ClientFormData } from '@/components/clients/ClientForm';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/clients')
      .then((r) => setClients(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.telephone.includes(search)
  );

  const handleToggleActif = async (id: string, actif: boolean) => {
    if (!confirm(actif ? 'Désactiver ce client ?' : 'Réactiver ce client ?')) return;
    await api.patch(`/clients/${id}`, { active: !actif });
    setClients((prev) =>
      prev.map((c) => (c.client_id === id ? { ...c, active: !actif } : c))
    );
  };

  const handleAjouter = async (data: ClientFormData) => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/clients', data);
      setClients((prev) => [res.data, ...prev]);
      setDrawerOpen(false);
    } catch {
      setError('Erreur lors de la création du client.');
    } finally {
      setSaving(false);
    }
  };

  const handleModifier = async (data: ClientFormData) => {
    if (!editClient) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/clients/${editClient.client_id}`, data);
      setClients((prev) =>
        prev.map((c) => (c.client_id === editClient.client_id ? res.data : c))
      );
      setEditClient(null);
    } catch {
      setError('Erreur lors de la mise à jour du client.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Clients">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher par nom ou téléphone..."
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
            Nouveau client
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
                    Aucun client trouvé
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.client_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/clients/${client.client_id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {client.nom}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{client.telephone}</td>
                    <td className="px-6 py-4 text-gray-600">{client.email || '—'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          client.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {client.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setError(''); setEditClient(client); }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleActif(client.client_id, client.active)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            client.active
                              ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={client.active ? 'Désactiver' : 'Réactiver'}
                        >
                          {client.active ? <UserX size={15} /> : <UserCheck size={15} />}
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouveau client">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <ClientForm onSubmit={handleAjouter} loading={saving} />
      </Drawer>

      <Drawer open={!!editClient} onClose={() => setEditClient(null)} title="Modifier le client">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        {editClient && (
          <ClientForm defaultValues={editClient} onSubmit={handleModifier} loading={saving} />
        )}
      </Drawer>
    </AppLayout>
  );
}
