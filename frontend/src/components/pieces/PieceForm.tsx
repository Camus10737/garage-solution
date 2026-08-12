'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FournisseurPiece, Fournisseur, Piece } from '@/types';
import api from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prix: z.number().min(0, 'Prix invalide'),
  quantite: z.number().min(0).optional(),
  fournie_par_client: z.boolean(),
  numero_item: z.string().optional(),
  categorie: z.string().optional(),
  emplacement: z.string().optional(),
  seuil_alerte: z.number().min(0).optional(),
});

export type PieceFormData = z.infer<typeof schema> & { fournisseurs: FournisseurPiece[] };

interface Props {
  defaultValues?: Partial<Piece>;
  onSubmit: (data: PieceFormData) => Promise<void>;
  loading?: boolean;
}

export default function PieceForm({ defaultValues, onSubmit, loading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: defaultValues?.nom || '',
      prix: defaultValues?.prix || 0,
      quantite: defaultValues?.quantite,
      fournie_par_client: defaultValues?.fournie_par_client || false,
      numero_item: defaultValues?.numero_item || '',
      categorie: defaultValues?.categorie || '',
      emplacement: defaultValues?.emplacement || '',
      seuil_alerte: defaultValues?.seuil_alerte,
    },
  });

  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [fournisseursLies, setFournisseursLies] = useState<FournisseurPiece[]>(
    defaultValues?.fournisseurs || []
  );

  useEffect(() => {
    api.get('/fournisseurs').then((r) => setFournisseurs(r.data.filter((f: Fournisseur) => f.active))).catch(() => {});
  }, []);

  const addFournisseurLie = () => {
    if (fournisseurs.length === 0) return;
    setFournisseursLies((prev) => [
      ...prev,
      { fournisseur_id: fournisseurs[0].fournisseur_id, prix_achat: 0, delai_livraison: '' },
    ]);
  };

  const updateFournisseurLie = (index: number, field: keyof FournisseurPiece, value: string | number) => {
    setFournisseursLies((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const submit = handleSubmit(async (data) => {
    await onSubmit({ ...data, fournisseurs: fournisseursLies });
  });

  return (
    <form onSubmit={submit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom de la pièce <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('nom')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.nom && <p className="text-red-500 text-xs mt-1">{errors.nom.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prix de vente ($) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register('prix', { valueAsNumber: true })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.prix && <p className="text-red-500 text-xs mt-1">{errors.prix.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Numéro d&apos;item</label>
          <input
            type="text"
            {...register('numero_item')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
          <input
            type="text"
            {...register('categorie')}
            placeholder="Ex. : freins, filtres, pneus"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Emplacement</label>
          <input
            type="text"
            {...register('emplacement')}
            placeholder="Ex. : Allée 3, Tablette B"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock</label>
          <input
            type="number"
            {...register('quantite', { valueAsNumber: true })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Seuil d&apos;alerte stock bas</label>
          <input
            type="number"
            {...register('seuil_alerte', { valueAsNumber: true })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="fournie_par_client"
          {...register('fournie_par_client')}
          className="w-4 h-4 text-blue-600 rounded"
        />
        <label htmlFor="fournie_par_client" className="text-sm text-gray-700">
          Cette pièce peut être fournie par le client
        </label>
      </div>

      {/* Fournisseurs liés */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Fournisseurs liés</label>
          <button
            type="button"
            onClick={addFournisseurLie}
            disabled={fournisseurs.length === 0}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <Plus size={13} /> Ajouter
          </button>
        </div>
        {fournisseursLies.length > 0 && (
          <div className="space-y-2">
            {fournisseursLies.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <select
                  value={f.fournisseur_id}
                  onChange={(e) => updateFournisseurLie(i, 'fournisseur_id', e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {fournisseurs.map((fr) => (
                    <option key={fr.fournisseur_id} value={fr.fournisseur_id}>{fr.nom}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={f.prix_achat}
                  onChange={(e) => updateFournisseurLie(i, 'prix_achat', Number(e.target.value))}
                  placeholder="Prix d'achat"
                  className="w-24 border border-gray-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={f.delai_livraison || ''}
                  onChange={(e) => updateFournisseurLie(i, 'delai_livraison', e.target.value)}
                  placeholder="Délai (optionnel)"
                  className="w-28 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setFournisseursLies((prev) => prev.filter((_, idx) => idx !== i))}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  );
}
