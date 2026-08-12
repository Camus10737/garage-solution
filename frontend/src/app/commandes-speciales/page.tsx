'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Client, CommandeSpeciale, Devis, Fournisseur, Piece, StatutCommandeSpeciale, Vehicule } from '@/types';
import api from '@/lib/api';
import Select from 'react-select';
import { Plus, Filter, ArrowRightCircle } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';

const LABELS_STATUT: Record<StatutCommandeSpeciale, string> = {
  commandee: 'Commandée',
  en_transit: 'En transit / livraison',
  recue: 'Reçue',
};

const COULEURS_STATUT: Record<StatutCommandeSpeciale, string> = {
  commandee: 'bg-gray-200 text-gray-700',
  en_transit: 'bg-orange-100 text-orange-700',
  recue: 'bg-green-100 text-green-700',
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

export default function CommandesSpecialesPage() {
  const [commandes, setCommandes] = useState<CommandeSpeciale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<'tous' | StatutCommandeSpeciale>('tous');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [devisClient, setDevisClient] = useState<Devis[]>([]);

  const [clientId, setClientId] = useState('');
  const [vehiculeId, setVehiculeId] = useState('');
  const [devisId, setDevisId] = useState('');
  const [pieceId, setPieceId] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [fournisseurId, setFournisseurId] = useState('');
  const [prixAchat, setPrixAchat] = useState(0);
  const [notes, setNotes] = useState('');

  const reload = () =>
    api.get('/commandes-speciales').then((r) => setCommandes(r.data)).catch(() => {});

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    Promise.all([api.get('/clients'), api.get('/pieces'), api.get('/fournisseurs')])
      .then(([c, p, f]) => {
        setClients(c.data.filter((x: Client) => x.active));
        setPieces(p.data.filter((x: Piece) => x.active));
        setFournisseurs(f.data.filter((x: Fournisseur) => x.active));
      })
      .catch(() => {});
  }, [drawerOpen]);

  useEffect(() => {
    if (!clientId) { setVehicules([]); setDevisClient([]); setVehiculeId(''); setDevisId(''); return; }
    api.get(`/vehicules?client_id=${clientId}`).then((r) => setVehicules(r.data)).catch(() => {});
    api.get(`/devis?client_id=${clientId}`).then((r) => setDevisClient(r.data)).catch(() => {});
  }, [clientId]);

  const filtered = commandes.filter((c) => filtre === 'tous' || c.statut === filtre);

  const clientOptions = clients.map((c) => ({ value: c.client_id, label: `${c.nom} — ${c.telephone}` }));
  const vehiculeOptions = vehicules.map((v) => ({ value: v.vehicule_id, label: [v.marque_modele, v.annee].filter(Boolean).join(' • ') }));
  const devisOptions = devisClient.map((d) => ({ value: d.devis_id, label: d.numero_devis || d.devis_id.slice(-6) }));
  const pieceOptions = pieces.map((p) => ({ value: p.piece_id, label: p.nom }));
  const fournisseurOptions = fournisseurs.map((f) => ({ value: f.fournisseur_id, label: f.nom }));

  const handlePieceChange = (id: string) => {
    setPieceId(id);
    const found = pieces.find((p) => p.piece_id === id);
    if (found && fournisseurId) {
      const lien = found.fournisseurs.find((fl) => fl.fournisseur_id === fournisseurId);
      if (lien) setPrixAchat(lien.prix_achat);
    }
  };

  const resetForm = () => {
    setClientId(''); setVehiculeId(''); setDevisId(''); setPieceId('');
    setQuantite(1); setFournisseurId(''); setPrixAchat(0); setNotes('');
  };

  const handleCreer = async (e: React.FormEvent) => {
    e.preventDefault();
    const piece = pieces.find((p) => p.piece_id === pieceId);
    if (!clientId || !vehiculeId || !piece || !fournisseurId) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/commandes-speciales', {
        client_id: clientId,
        vehicule_id: vehiculeId,
        devis_id: devisId || null,
        piece_id: piece.piece_id,
        piece_nom: piece.nom,
        quantite,
        fournisseur_id: fournisseurId,
        prix_achat: prixAchat,
        notes: notes || null,
      });
      setCommandes((prev) => [res.data, ...prev]);
      setDrawerOpen(false);
      resetForm();
    } catch {
      setError('Erreur lors de la création de la commande spéciale.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangerStatut = async (id: string, statut: StatutCommandeSpeciale) => {
    setUpdatingId(id);
    try {
      const res = await api.patch(`/commandes-speciales/${id}`, { statut });
      setCommandes((prev) => prev.map((c) => (c.commande_speciale_id === id ? res.data : c)));
    } catch {
      alert('Erreur lors du changement de statut.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AppLayout title="Commandes spéciales">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 max-w-2xl">
          Pour une pièce absente du stock : commande auprès d&apos;un fournisseur pour un client et un
          véhicule précis. À la réception, le stock est mis à jour automatiquement et le client est notifié.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={15} className="text-gray-400" />
            {(['tous', 'commandee', 'en_transit', 'recue'] as const).map((f) => (
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
            Nouvelle commande spéciale
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Client</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Pièce</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Fournisseur</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Aucune commande spéciale</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.commande_speciale_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{c.client_nom}</td>
                    <td className="px-6 py-4 text-gray-600">{c.piece_nom} ×{c.quantite}</td>
                    <td className="px-6 py-4 text-gray-600">{c.fournisseur_nom}</td>
                    <td className="px-6 py-4 text-gray-600">{c.date_commande.slice(0, 10)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${COULEURS_STATUT[c.statut]}`}>
                        {LABELS_STATUT[c.statut]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {c.statut === 'commandee' && (
                        <button
                          onClick={() => handleChangerStatut(c.commande_speciale_id, 'en_transit')}
                          disabled={updatingId === c.commande_speciale_id}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          <ArrowRightCircle size={13} /> En transit
                        </button>
                      )}
                      {c.statut === 'en_transit' && (
                        <button
                          onClick={() => handleChangerStatut(c.commande_speciale_id, 'recue')}
                          disabled={updatingId === c.commande_speciale_id}
                          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
                        >
                          <ArrowRightCircle size={13} /> Marquer reçue
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => { setDrawerOpen(false); resetForm(); }} title="Nouvelle commande spéciale">
        <form onSubmit={handleCreer} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Client <span className="text-red-500">*</span></label>
            <Select
              options={clientOptions}
              value={clientOptions.find((o) => o.value === clientId) || null}
              onChange={(opt) => setClientId(opt?.value || '')}
              placeholder="Sélectionner un client..."
              isClearable
              styles={selectStyles}
            />
          </div>

          {clientId && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Véhicule <span className="text-red-500">*</span></label>
              <Select
                options={vehiculeOptions}
                value={vehiculeOptions.find((o) => o.value === vehiculeId) || null}
                onChange={(opt) => setVehiculeId(opt?.value || '')}
                placeholder="Sélectionner un véhicule..."
                isClearable
                styles={selectStyles}
                noOptionsMessage={() => 'Aucun véhicule pour ce client'}
              />
            </div>
          )}

          {clientId && devisOptions.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Devis lié (optionnel)</label>
              <Select
                options={devisOptions}
                value={devisOptions.find((o) => o.value === devisId) || null}
                onChange={(opt) => setDevisId(opt?.value || '')}
                placeholder="Aucun"
                isClearable
                styles={selectStyles}
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Pièce <span className="text-red-500">*</span></label>
            <Select
              options={pieceOptions}
              value={pieceOptions.find((o) => o.value === pieceId) || null}
              onChange={(opt) => handlePieceChange(opt?.value || '')}
              placeholder="Sélectionner une pièce..."
              isClearable
              styles={selectStyles}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Quantité</label>
            <input
              type="number"
              min={1}
              value={quantite}
              onChange={(e) => setQuantite(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Fournisseur <span className="text-red-500">*</span></label>
            <Select
              options={fournisseurOptions}
              value={fournisseurOptions.find((o) => o.value === fournisseurId) || null}
              onChange={(opt) => setFournisseurId(opt?.value || '')}
              placeholder="Sélectionner un fournisseur..."
              isClearable
              styles={selectStyles}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Prix d&apos;achat ($)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={prixAchat}
              onChange={(e) => setPrixAchat(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Création...' : 'Créer la commande spéciale'}
          </button>
        </form>
      </Drawer>
    </AppLayout>
  );
}
