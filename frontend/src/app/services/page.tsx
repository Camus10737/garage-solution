'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Service } from '@/types';
import api from '@/lib/api';
import { Plus, Pencil, Ban, RotateCcw } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import ServiceForm, { ServiceFormData } from '@/components/services/ServiceForm';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/services')
      .then((r) => setServices(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggleActif = async (id: string, actif: boolean) => {
    if (!confirm(actif ? 'Désactiver ce service ?' : 'Réactiver ce service ?')) return;
    await api.patch(`/services/${id}`, { active: !actif });
    setServices((prev) =>
      prev.map((s) => (s.service_id === id ? { ...s, active: !actif } : s))
    );
  };

  const handleAjouter = async (data: ServiceFormData) => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/services', data);
      setServices((prev) => [res.data, ...prev]);
      setDrawerOpen(false);
    } catch {
      setError('Erreur lors de la création du service.');
    } finally {
      setSaving(false);
    }
  };

  const handleModifier = async (data: ServiceFormData) => {
    if (!editService) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/services/${editService.service_id}`, data);
      setServices((prev) => prev.map((s) => (s.service_id === editService.service_id ? res.data : s)));
      setEditService(null);
    } catch {
      setError('Erreur lors de la mise à jour du service.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Services">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => { setError(''); setDrawerOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Nouveau service
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Prix</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400">
                    Chargement...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400">
                    Aucun service enregistré
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service.service_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{service.nom}</td>
                    <td className="px-6 py-4 text-gray-600">{service.prix.toFixed(2)} $</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          service.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {service.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setError(''); setEditService(service); }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleActif(service.service_id, service.active)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            service.active
                              ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={service.active ? 'Désactiver' : 'Réactiver'}
                        >
                          {service.active ? <Ban size={15} /> : <RotateCcw size={15} />}
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouveau service">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <ServiceForm onSubmit={handleAjouter} loading={saving} />
      </Drawer>

      <Drawer open={!!editService} onClose={() => setEditService(null)} title="Modifier le service">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        {editService && (
          <ServiceForm defaultValues={editService} onSubmit={handleModifier} loading={saving} />
        )}
      </Drawer>
    </AppLayout>
  );
}
