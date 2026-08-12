'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { RendezVous, StatutRendezVous } from '@/types';
import api from '@/lib/api';
import { Filter, CheckCircle, Ban, Clock, ClipboardList } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import DevisForm, { DevisFormData } from '@/components/devis/DevisForm';

const LABELS_STATUT: Record<StatutRendezVous, string> = {
  confirme: 'Confirmé',
  complete: 'Complété',
  annule: 'Annulé',
};

const COULEURS_STATUT: Record<StatutRendezVous, string> = {
  confirme: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
  annule: 'bg-red-100 text-red-700',
};

export default function RendezVousPage() {
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<'a_venir' | 'tous'>('a_venir');
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [reprogId, setReprogId] = useState<string | null>(null);
  const [nouvelleDateHeure, setNouvelleDateHeure] = useState('');

  const [devisRdv, setDevisRdv] = useState<RendezVous | null>(null);
  const [savingDevis, setSavingDevis] = useState(false);

  const charger = () =>
    api.get('/rendez-vous').then((r) => setRendezVous(r.data)).catch(() => {});

  useEffect(() => {
    charger().finally(() => setLoading(false));
  }, []);

  const maintenant = new Date().toISOString();
  const filtered = rendezVous.filter((r) => filtre === 'tous' || r.date_heure >= maintenant);

  const handleStatut = async (id: string, statut: StatutRendezVous) => {
    setActionId(id);
    try {
      const res = await api.patch(`/rendez-vous/${id}`, { statut });
      setRendezVous((prev) => prev.map((r) => (r.rendez_vous_id === id ? res.data : r)));
    } catch {
      alert('Erreur lors de la mise à jour du statut.');
    } finally {
      setActionId(null);
    }
  };

  const handleReprogrammer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reprogId || !nouvelleDateHeure) return;
    setActionId(reprogId);
    try {
      const res = await api.post(`/rendez-vous/${reprogId}/reprogrammer`, { date_heure: nouvelleDateHeure });
      setRendezVous((prev) => prev.map((r) => (r.rendez_vous_id === reprogId ? res.data : r)));
      setReprogId(null);
      setNouvelleDateHeure('');
    } catch {
      alert('Erreur lors de la reprogrammation.');
    } finally {
      setActionId(null);
    }
  };

  const handleCreerDevis = async (data: DevisFormData) => {
    setSavingDevis(true);
    setError('');
    try {
      await api.post('/devis', data);
      setDevisRdv(null);
    } catch {
      setError('Erreur lors de la création du devis.');
    } finally {
      setSavingDevis(false);
    }
  };

  return (
    <AppLayout title="Rendez-vous">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          {(['a_venir', 'tous'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filtre === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'a_venir' ? 'À venir' : 'Tous'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Date/heure</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Client</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Véhicule</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Service</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Aucun rendez-vous</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.rendez_vous_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-800">
                      {new Date(r.date_heure).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800">{r.client_nom}</p>
                      <p className="text-xs text-gray-400">{r.client_telephone}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{r.vehicule_marque_modele} {r.vehicule_annee}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {r.type_service}
                      {r.description && <p className="text-xs text-gray-400 truncate max-w-[160px]">{r.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${COULEURS_STATUT[r.statut]}`}>
                        {LABELS_STATUT[r.statut]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {r.statut === 'confirme' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleStatut(r.rendez_vous_id, 'complete')}
                            disabled={actionId === r.rendez_vous_id}
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
                            title="Marquer complété"
                          >
                            <CheckCircle size={13} />
                          </button>
                          <button
                            onClick={() => { setReprogId(r.rendez_vous_id); setNouvelleDateHeure(r.date_heure.slice(0, 16)); }}
                            disabled={actionId === r.rendez_vous_id}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            title="Reprogrammer"
                          >
                            <Clock size={13} />
                          </button>
                          <button
                            onClick={() => handleStatut(r.rendez_vous_id, 'annule')}
                            disabled={actionId === r.rendez_vous_id}
                            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                            title="Annuler"
                          >
                            <Ban size={13} />
                          </button>
                          <button
                            onClick={() => { setError(''); setDevisRdv(r); }}
                            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                            title="Créer un devis"
                          >
                            <ClipboardList size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={!!reprogId} onClose={() => setReprogId(null)} title="Reprogrammer le rendez-vous">
        <form onSubmit={handleReprogrammer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouvelle date et heure</label>
            <input
              type="datetime-local"
              value={nouvelleDateHeure}
              onChange={(e) => setNouvelleDateHeure(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={actionId === reprogId}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Confirmer la nouvelle heure
          </button>
        </form>
      </Drawer>

      <Drawer open={!!devisRdv} onClose={() => setDevisRdv(null)} title="Nouveau devis">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}
        {devisRdv && (
          <DevisForm onSubmit={handleCreerDevis} loading={savingDevis} defaultClientId={devisRdv.client_id} />
        )}
      </Drawer>
    </AppLayout>
  );
}
