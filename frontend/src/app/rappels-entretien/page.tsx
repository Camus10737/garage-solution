'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { ModeleRappel, RappelDu } from '@/types';
import api from '@/lib/api';
import { Plus, Ban, RotateCcw, Send, CheckSquare } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import ModeleRappelForm, { ModeleRappelFormData } from '@/components/rappels/ModeleRappelForm';

const LABELS_TYPE: Record<string, string> = {
  km: 'Kilométrage',
  date: 'Date',
  les_deux: 'Km ou date',
};

const MODELES_STANDARDS: Record<string, ModeleRappelFormData> = {
  huile: {
    nom: "Changement d'huile",
    type_declencheur: 'les_deux',
    valeur_km: 5000,
    valeur_mois: 6,
    message: "Bonjour {nom}, il est temps de faire changer l'huile de votre véhicule.",
  },
  pneus: {
    nom: 'Pneus saisonniers',
    type_declencheur: 'date',
    valeur_mois: 6,
    message: 'Bonjour {nom}, c\'est le moment de changer vos pneus saisonniers.',
  },
  transmission: {
    nom: 'Fluide de transmission',
    type_declencheur: 'km',
    valeur_km: 50000,
    message: 'Bonjour {nom}, le fluide de transmission de votre véhicule devrait être vérifié.',
  },
};

export default function RappelsEntretienPage() {
  const [modeles, setModeles] = useState<ModeleRappel[]>([]);
  const [rappelsDus, setRappelsDus] = useState<RappelDu[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDus, setLoadingDus] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editModele, setEditModele] = useState<ModeleRappel | null>(null);
  const [prefill, setPrefill] = useState<ModeleRappelFormData | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const chargerModeles = () =>
    api.get('/modeles-rappel').then((r) => setModeles(r.data)).catch(() => {});

  const chargerDus = () => {
    setLoadingDus(true);
    api.get('/rappels-entretien/dus')
      .then((r) => setRappelsDus(r.data))
      .catch(() => {})
      .finally(() => setLoadingDus(false));
  };

  useEffect(() => {
    Promise.all([chargerModeles(), chargerDus()]).finally(() => setLoading(false));
  }, []);

  const handleToggleActif = async (id: string, actif: boolean) => {
    await api.patch(`/modeles-rappel/${id}`, { actif: !actif });
    setModeles((prev) => prev.map((m) => (m.modele_id === id ? { ...m, actif: !actif } : m)));
  };

  const handleAjouter = async (data: ModeleRappelFormData) => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/modeles-rappel', data);
      setModeles((prev) => [res.data, ...prev]);
      setDrawerOpen(false);
      setPrefill(undefined);
    } catch {
      setError('Erreur lors de la création du modèle.');
    } finally {
      setSaving(false);
    }
  };

  const handleModifier = async (data: ModeleRappelFormData) => {
    if (!editModele) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/modeles-rappel/${editModele.modele_id}`, data);
      setModeles((prev) => prev.map((m) => (m.modele_id === editModele.modele_id ? res.data : m)));
      setEditModele(null);
    } catch {
      setError('Erreur lors de la mise à jour du modèle.');
    } finally {
      setSaving(false);
    }
  };

  const cleDu = (r: RappelDu) => `${r.vehicule_id}:${r.modele_id}`;

  const toggleSelection = (cle: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(cle)) next.delete(cle); else next.add(cle);
      return next;
    });
  };

  const envoyerRappels = async (rappels: RappelDu[]) => {
    if (rappels.length === 0) return;
    setSending(true);
    try {
      await api.post('/rappels-entretien/envoyer', {
        rappels: rappels.map((r) => ({ vehicule_id: r.vehicule_id, modele_id: r.modele_id })),
      });
      setSelection(new Set());
      chargerDus();
    } catch {
      setError("Erreur lors de l'envoi des rappels.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout title="Rappels d'entretien">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {/* Rappels dus */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              Rappels dus {rappelsDus.length > 0 && `(${rappelsDus.length})`}
            </h3>
            {rappelsDus.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => envoyerRappels(rappelsDus.filter((r) => selection.has(cleDu(r))))}
                  disabled={sending || selection.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <Send size={13} /> Envoyer la sélection ({selection.size})
                </button>
                <button
                  onClick={() => envoyerRappels(rappelsDus)}
                  disabled={sending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <CheckSquare size={13} /> Tout envoyer
                </button>
              </div>
            )}
          </div>
          {loadingDus ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Vérification en cours...</div>
          ) : rappelsDus.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Aucun rappel dû pour le moment</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rappelsDus.map((r) => (
                <label key={cleDu(r)} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selection.has(cleDu(r))}
                    onChange={() => toggleSelection(cleDu(r))}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{r.client_nom}</span> — {r.vehicule_label} · {r.modele_nom}
                    </p>
                    <p className="text-xs text-gray-400">{r.raison}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Modèles de rappel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-gray-800">Modèles de rappel</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(MODELES_STANDARDS).map(([key, values]) => (
                <button
                  key={key}
                  onClick={() => { setPrefill(values); setError(''); setDrawerOpen(true); }}
                  className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                >
                  + {values.nom}
                </button>
              ))}
              <button
                onClick={() => { setPrefill(undefined); setError(''); setDrawerOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={13} /> Nouveau modèle
              </button>
            </div>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Chargement...</div>
          ) : modeles.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Aucun modèle configuré</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Nom</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Déclencheur</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Statut</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {modeles.map((m) => (
                  <tr key={m.modele_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      <button onClick={() => { setEditModele(m); setError(''); }} className="hover:underline text-left">
                        {m.nom}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {LABELS_TYPE[m.type_declencheur]}
                      {m.valeur_km ? ` — ${m.valeur_km} km` : ''}
                      {m.valeur_mois ? ` — ${m.valeur_mois} mois` : ''}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActif(m.modele_id, m.actif)}
                        className={`p-1.5 rounded-lg transition-colors ${m.actif ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                        title={m.actif ? 'Désactiver' : 'Réactiver'}
                      >
                        {m.actif ? <Ban size={15} /> : <RotateCcw size={15} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setPrefill(undefined); }} title="Nouveau modèle de rappel">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}
        <ModeleRappelForm onSubmit={handleAjouter} loading={saving} defaultValues={prefill} />
      </Drawer>

      <Drawer open={!!editModele} onClose={() => setEditModele(null)} title="Modifier le modèle">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}
        {editModele && (
          <ModeleRappelForm defaultValues={editModele} onSubmit={handleModifier} loading={saving} />
        )}
      </Drawer>
    </AppLayout>
  );
}
