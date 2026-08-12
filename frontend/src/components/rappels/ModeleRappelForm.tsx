'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ModeleRappel, Promotion } from '@/types';
import api from '@/lib/api';

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  type_declencheur: z.enum(['km', 'date', 'les_deux']),
  valeur_km: z.number().min(0).optional(),
  valeur_mois: z.number().min(0).optional(),
  message: z.string().min(1, 'Le message est requis'),
  promotion_id: z.string().optional(),
});

export type ModeleRappelFormData = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<ModeleRappelFormData>;
  onSubmit: (data: ModeleRappelFormData) => Promise<void>;
  loading?: boolean;
}

export default function ModeleRappelForm({ defaultValues, onSubmit, loading }: Props) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    api.get('/promotions').then((r) => setPromotions(r.data)).catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ModeleRappelFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: defaultValues?.nom || '',
      type_declencheur: defaultValues?.type_declencheur || 'les_deux',
      valeur_km: defaultValues?.valeur_km,
      valeur_mois: defaultValues?.valeur_mois,
      message: defaultValues?.message || '',
      promotion_id: defaultValues?.promotion_id || '',
    },
  });

  const typeDeclencheur = watch('type_declencheur');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom du rappel <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('nom')}
          placeholder="Ex : Changement d'huile"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.nom && <p className="text-red-500 text-xs mt-1">{errors.nom.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type de déclencheur</label>
        <select
          {...register('type_declencheur')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="km">Kilométrage</option>
          <option value="date">Date</option>
          <option value="les_deux">Les deux (l&apos;un ou l&apos;autre)</option>
        </select>
      </div>

      {(typeDeclencheur === 'km' || typeDeclencheur === 'les_deux') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Intervalle (km)</label>
          <input
            type="number"
            min={0}
            {...register('valeur_km', { valueAsNumber: true })}
            placeholder="Ex : 5000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {(typeDeclencheur === 'date' || typeDeclencheur === 'les_deux') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Intervalle (mois)</label>
          <input
            type="number"
            min={0}
            {...register('valeur_mois', { valueAsNumber: true })}
            placeholder="Ex : 6"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('message')}
          rows={3}
          placeholder="Ex : Bonjour {nom}, il est temps de faire l'entretien de votre véhicule."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          {'{nom}'} et {'{entretien}'} sont remplacés automatiquement.
        </p>
        {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Promotion liée (optionnel)</label>
        <select
          {...register('promotion_id')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Aucune</option>
          {promotions.map((p) => (
            <option key={p.promotion_id} value={p.promotion_id}>{p.titre}</option>
          ))}
        </select>
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
