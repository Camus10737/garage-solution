'use client';

import { use, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Client, Facture, Vehicule } from '@/types';
import api from '@/lib/api';
import Link from 'next/link';
import { Pencil, FileText, Phone, Mail, MapPin, Car, StickyNote, Plus, Trash2 } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import ClientForm, { ClientFormData } from '@/components/clients/ClientForm';
import VehiculeForm, { VehiculeFormData } from '@/components/vehicules/VehiculeForm';

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<Client | null>(null);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [vehiculeDrawerOpen, setVehiculeDrawerOpen] = useState(false);
  const [editVehicule, setEditVehicule] = useState<Vehicule | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingVehicule, setSavingVehicule] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/clients/${id}`),
      api.get(`/vehicules?client_id=${id}`),
      api.get(`/clients/${id}/factures`),
    ])
      .then(([clientRes, vehiculesRes, facturesRes]) => {
        setClient(clientRes.data);
        setVehicules(vehiculesRes.data);
        setFactures(facturesRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleModifier = async (data: ClientFormData) => {
    setSaving(true);
    setEditError('');
    try {
      const res = await api.put(`/clients/${id}`, data);
      setClient(res.data);
      setEditOpen(false);
    } catch {
      setEditError('Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const handleAjouterVehicule = async (data: VehiculeFormData) => {
    setSavingVehicule(true);
    try {
      const res = await api.post('/vehicules', { ...data, client_id: id });
      setVehicules((prev) => [...prev, res.data]);
      setVehiculeDrawerOpen(false);
    } catch { /* silencieux */ }
    finally { setSavingVehicule(false); }
  };

  const handleModifierVehicule = async (data: VehiculeFormData) => {
    if (!editVehicule) return;
    setSavingVehicule(true);
    try {
      const res = await api.put(`/vehicules/${editVehicule.vehicule_id}`, data);
      setVehicules((prev) => prev.map((v) => v.vehicule_id === editVehicule.vehicule_id ? res.data : v));
      setEditVehicule(null);
    } catch { /* silencieux */ }
    finally { setSavingVehicule(false); }
  };

  const handleSupprimerVehicule = async (vehiculeId: string) => {
    setDeleteError('');
    try {
      await api.delete(`/vehicules/${vehiculeId}`);
      setVehicules((prev) => prev.filter((v) => v.vehicule_id !== vehiculeId));
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Erreur lors de la suppression.';
      setDeleteError(detail);
    }
  };

  // Grouper factures par vehicule_id
  const facturesParVehicule = factures.reduce<Record<string, Facture[]>>((acc, f) => {
    const key = f.vehicule_id || '__legacy__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  if (loading) {
    return (
      <AppLayout title="Client">
        <div className="text-gray-400 text-sm">Chargement...</div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout title="Client">
        <div className="text-red-500 text-sm">Client introuvable.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={client.nom}>
      <div className="space-y-4">
        {/* Fiche client */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">{client.nom}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={14} />
                {client.telephone}
              </div>
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={14} />
                  {client.email}
                </div>
              )}
              {client.adresse && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={14} />
                  {client.adresse}
                </div>
              )}
              {client.notes && (
                <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                  <StickyNote size={14} className="mt-0.5 shrink-0" />
                  {client.notes}
                </div>
              )}
            </div>
            <button
              onClick={() => { setEditError(''); setEditOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Pencil size={14} />
              Modifier
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                client.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {client.active ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>

        {/* Véhicules */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Car size={16} className="text-gray-400" />
              Véhicules ({vehicules.length})
            </h3>
            <button
              onClick={() => setVehiculeDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={13} />
              Ajouter
            </button>
          </div>
          {deleteError && (
            <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-xs">
              {deleteError}
            </div>
          )}
          {vehicules.length === 0 ? (
            <div className="px-6 py-6 text-center text-gray-400 text-sm">
              Aucun véhicule enregistré
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {vehicules.map((v) => (
                <div key={v.vehicule_id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{v.marque_modele}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[v.annee, v.taille_moteur, v.plaque ? `Plaque : ${v.plaque}` : null]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditVehicule(v)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleSupprimerVehicule(v.vehicule_id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique des factures groupé par véhicule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Historique des factures</h3>
            <Link
              href={`/factures?client=${id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText size={13} />
              Nouvelle facture
            </Link>
          </div>
          {factures.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              Aucune facture pour ce client
            </div>
          ) : (
            <div>
              {/* Factures groupées par véhicule */}
              {vehicules.map((v) => {
                const vFactures = facturesParVehicule[v.vehicule_id] || [];
                if (vFactures.length === 0) return null;
                return (
                  <div key={v.vehicule_id}>
                    <div className="px-6 py-2 bg-gray-50 border-y border-gray-100 flex items-center gap-2">
                      <Car size={13} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">
                        {v.marque_modele}{v.annee ? ` ${v.annee}` : ''}{v.plaque ? ` — ${v.plaque}` : ''}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {vFactures.map((f) => (
                        <FactureLigne key={f.facture_id} f={f} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* Factures legacy (sans vehicule_id) */}
              {facturesParVehicule['__legacy__']?.length > 0 && (
                <div>
                  <div className="px-6 py-2 bg-gray-50 border-y border-gray-100">
                    <span className="text-xs font-medium text-gray-400">Autres factures</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {facturesParVehicule['__legacy__'].map((f) => (
                      <FactureLigne key={f.facture_id} f={f} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Drawer modification client */}
      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le client">
        {editError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {editError}
          </div>
        )}
        <ClientForm defaultValues={client} onSubmit={handleModifier} loading={saving} />
      </Drawer>

      {/* Drawer ajout véhicule */}
      <Drawer open={vehiculeDrawerOpen} onClose={() => setVehiculeDrawerOpen(false)} title="Nouveau véhicule">
        <VehiculeForm onSubmit={handleAjouterVehicule} loading={savingVehicule} />
      </Drawer>

      {/* Drawer modification véhicule */}
      <Drawer open={!!editVehicule} onClose={() => setEditVehicule(null)} title="Modifier le véhicule">
        {editVehicule && (
          <VehiculeForm
            defaultValues={editVehicule}
            onSubmit={handleModifierVehicule}
            loading={savingVehicule}
          />
        )}
      </Drawer>
    </AppLayout>
  );
}

function FactureLigne({ f }: { f: Facture }) {
  return (
    <Link
      href={`/factures/${f.facture_id}`}
      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
    >
      <div>
        <p className="text-sm font-medium text-gray-800">
          {f.numero_facture || 'Facture #' + f.facture_id.slice(-6)}
        </p>
        <p className="text-xs text-gray-400">{f.date_creation}</p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            f.statut_vehicule === 'pret'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {f.statut_vehicule === 'pret' ? 'Prêt' : 'En cours'}
        </span>
        <span className="font-semibold text-sm text-gray-800">
          {f.total_facture.toFixed(2)} $
        </span>
      </div>
    </Link>
  );
}
