'use client';

import { useEffect, useState } from 'react';
import Select from 'react-select';
import { Fournisseur, LigneCommandeFournisseur, Piece } from '@/types';
import api from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

export interface CommandeFournisseurFormData {
  fournisseur_id: string;
  lignes: LigneCommandeFournisseur[];
  notes: string;
}

interface Props {
  onSubmit: (data: CommandeFournisseurFormData) => Promise<void>;
  loading?: boolean;
  defaultFournisseurId?: string;
}

export default function CommandeFournisseurForm({ onSubmit, loading, defaultFournisseurId }: Props) {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [fournisseurId, setFournisseurId] = useState(defaultFournisseurId || '');
  const [lignes, setLignes] = useState<LigneCommandeFournisseur[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/fournisseurs'), api.get('/pieces')])
      .then(([f, p]) => {
        setFournisseurs(f.data.filter((x: Fournisseur) => x.active));
        setPieces(p.data.filter((x: Piece) => x.active));
      })
      .catch(() => {});
  }, []);

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

  const fournisseurOptions = fournisseurs.map((f) => ({ value: f.fournisseur_id, label: f.nom }));
  const pieceOptions = pieces.map((p) => ({ value: p.piece_id, label: `${p.nom}${p.numero_item ? ` (#${p.numero_item})` : ''}` }));

  const addLigne = (pieceId: string) => {
    const found = pieces.find((p) => p.piece_id === pieceId);
    if (!found) return;
    const prixSuggere = found.fournisseurs.find((fl) => fl.fournisseur_id === fournisseurId)?.prix_achat || 0;
    setLignes((prev) => [
      ...prev,
      { piece_id: found.piece_id, nom: found.nom, quantite_commandee: 1, quantite_recue: 0, prix_achat: prixSuggere },
    ]);
  };

  const updateLigne = (index: number, field: 'quantite_commandee' | 'prix_achat', value: number) => {
    setLignes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const montantTotal = lignes.reduce((sum, l) => sum + l.quantite_commandee * l.prix_achat, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fournisseurId) { setError('Veuillez sélectionner un fournisseur.'); return; }
    if (lignes.length === 0) { setError('Veuillez ajouter au moins une pièce.'); return; }
    setError('');
    await onSubmit({ fournisseur_id: fournisseurId, lignes, notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Fournisseur <span className="text-red-500">*</span>
        </label>
        <Select
          options={fournisseurOptions}
          value={fournisseurOptions.find((o) => o.value === fournisseurId) || null}
          onChange={(opt) => setFournisseurId(opt?.value || '')}
          placeholder="Sélectionner un fournisseur..."
          isClearable
          styles={selectStyles}
          noOptionsMessage={() => 'Aucun fournisseur trouvé'}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Pièces commandées</label>
        <Select
          options={pieceOptions}
          value={null}
          onChange={(opt) => opt && addLigne(opt.value)}
          placeholder="Rechercher et ajouter une pièce..."
          styles={selectStyles}
          noOptionsMessage={() => 'Aucune pièce trouvée'}
        />
        {lignes.length > 0 && (
          <div className="mt-2 space-y-2">
            {lignes.map((ligne, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="flex-1 text-xs text-gray-800 truncate">{ligne.nom}</span>
                <input
                  type="number"
                  min={1}
                  value={ligne.quantite_commandee}
                  onChange={(e) => updateLigne(i, 'quantite_commandee', Number(e.target.value))}
                  className="w-14 border border-gray-300 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Quantité"
                />
                <span className="text-xs text-gray-400">×</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={ligne.prix_achat}
                  onChange={(e) => updateLigne(i, 'prix_achat', Number(e.target.value))}
                  className="w-20 border border-gray-300 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Prix d'achat unitaire"
                />
                <span className="text-xs font-medium text-gray-700 w-16 text-right">
                  {(ligne.quantite_commandee * ligne.prix_achat).toFixed(2)} $
                </span>
                <button
                  type="button"
                  onClick={() => setLignes((prev) => prev.filter((_, idx) => idx !== i))}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="border-t border-gray-100 pt-4 flex justify-between font-bold text-gray-900 text-base">
        <span>Montant total</span>
        <span>{montantTotal.toFixed(2)} $</span>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Création...' : 'Créer la commande'}
      </button>
    </form>
  );
}
