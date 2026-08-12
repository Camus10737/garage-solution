'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Client, MethodeEnvoiPromo, Promotion, StatutPromotion } from '@/types';
import api from '@/lib/api';
import Select from 'react-select';
import { Plus, Filter, Send, Ban } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';

const LABELS_STATUT: Record<StatutPromotion, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  annulee: 'Annulée',
};

const COULEURS_STATUT: Record<StatutPromotion, string> = {
  brouillon: 'bg-gray-200 text-gray-700',
  envoyee: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
};

const LABELS_METHODE: Record<MethodeEnvoiPromo, string> = {
  sms: 'SMS',
  email: 'Courriel',
  les_deux: 'Les deux',
};

const selectStyles = {
  control: (base: object) => ({
    ...base,
    borderColor: '#d1d5db',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    minHeight: '38px',
    boxShadow: 'none',
    '&:hover': { borderColor: '#3b82f6' },
  }),
  option: (base: object, state: { isSelected: boolean; isFocused: boolean }) => ({
    ...base,
    fontSize: '0.875rem',
    backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : 'white',
    color: state.isSelected ? 'white' : '#111827',
  }),
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<'tous' | StatutPromotion>('tous');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [cibleTous, setCibleTous] = useState(true);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [methodeEnvoi, setMethodeEnvoi] = useState<MethodeEnvoiPromo>('sms');

  const charger = () =>
    api.get('/promotions').then((r) => setPromotions(r.data)).catch(() => {});

  useEffect(() => {
    charger().finally(() => setLoading(false));
    api.get('/clients').then((r) => setClients(r.data.filter((c: Client) => c.active))).catch(() => {});
  }, []);

  const filtered = promotions.filter((p) => filtre === 'tous' || p.statut === filtre);
  const clientOptions = clients.map((c) => ({ value: c.client_id, label: c.nom }));

  const resetForm = () => {
    setTitre(''); setDescription(''); setDateDebut(''); setDateFin('');
    setCibleTous(true); setClientIds([]); setMethodeEnvoi('sms');
  };

  const handleCreer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre || !description || !dateDebut || !dateFin) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/promotions', {
        titre, description, date_debut: dateDebut, date_fin: dateFin,
        cible_tous: cibleTous, client_ids: cibleTous ? [] : clientIds,
        methode_envoi: methodeEnvoi,
      });
      setPromotions((prev) => [res.data, ...prev]);
      setDrawerOpen(false);
      resetForm();
    } catch {
      setError('Erreur lors de la création de la promotion.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnvoyer = async (id: string) => {
    if (!confirm('Envoyer cette promotion maintenant ?')) return;
    setActionId(id);
    try {
      const res = await api.post(`/promotions/${id}/envoyer`);
      setPromotions((prev) => prev.map((p) => (p.promotion_id === id ? res.data : p)));
    } catch {
      alert("Erreur lors de l'envoi.");
    } finally {
      setActionId(null);
    }
  };

  const handleAnnuler = async (id: string) => {
    if (!confirm('Annuler cette promotion ?')) return;
    setActionId(id);
    try {
      const res = await api.post(`/promotions/${id}/annuler`);
      setPromotions((prev) => prev.map((p) => (p.promotion_id === id ? res.data : p)));
    } catch {
      alert("Erreur lors de l'annulation.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <AppLayout title="Promotions">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={15} className="text-gray-400" />
            {(['tous', 'brouillon', 'envoyee', 'annulee'] as const).map((f) => (
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
            Nouvelle promotion
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Titre</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Période</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Cible</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Méthode</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Aucune promotion</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.promotion_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800">{p.titre}</p>
                      <p className="text-xs text-gray-400 truncate max-w-xs">{p.description}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{p.date_debut} au {p.date_fin}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {p.cible_tous ? 'Tous les clients' : `${p.client_ids.length} client(s)`}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{LABELS_METHODE[p.methode_envoi]}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${COULEURS_STATUT[p.statut]}`}>
                        {LABELS_STATUT[p.statut]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.statut === 'brouillon' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEnvoyer(p.promotion_id)}
                            disabled={actionId === p.promotion_id}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            <Send size={13} /> Envoyer
                          </button>
                          <button
                            onClick={() => handleAnnuler(p.promotion_id)}
                            disabled={actionId === p.promotion_id}
                            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <Ban size={13} /> Annuler
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

      <Drawer open={drawerOpen} onClose={() => { setDrawerOpen(false); resetForm(); }} title="Nouvelle promotion">
        <form onSubmit={handleCreer} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Spécial pneus d'hiver"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description / rabais <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Ex : 15% de rabais sur l'installation de pneus"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date début <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={cibleTous}
                onChange={(e) => setCibleTous(e.target.checked)}
                className="w-4 h-4"
              />
              Envoyer à tous les clients actifs
            </label>
            {!cibleTous && (
              <Select
                options={clientOptions}
                value={clientOptions.filter((o) => clientIds.includes(o.value))}
                onChange={(opts) => setClientIds(opts.map((o) => o.value))}
                isMulti
                placeholder="Sélectionner des clients..."
                styles={selectStyles}
                noOptionsMessage={() => 'Aucun client trouvé'}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Méthode d&apos;envoi</label>
            <select
              value={methodeEnvoi}
              onChange={(e) => setMethodeEnvoi(e.target.value as MethodeEnvoiPromo)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(LABELS_METHODE) as MethodeEnvoiPromo[]).map((m) => (
                <option key={m} value={m}>{LABELS_METHODE[m]}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Création...' : 'Créer en brouillon'}
          </button>
        </form>
      </Drawer>
    </AppLayout>
  );
}
