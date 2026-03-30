'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Vehicule } from '@/types';

const schema = z.object({
  marque_modele: z.string().min(1, 'Le véhicule est requis'),
  annee: z.string().optional(),
  taille_moteur: z.string().optional(),
  plaque: z.string().optional(),
  notes: z.string().optional(),
});

export type VehiculeFormData = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<Vehicule>;
  onSubmit: (data: VehiculeFormData) => Promise<void>;
  loading?: boolean;
}

export default function VehiculeForm({ defaultValues, onSubmit, loading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehiculeFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      marque_modele: defaultValues?.marque_modele || '',
      annee: defaultValues?.annee || '',
      taille_moteur: defaultValues?.taille_moteur || '',
      plaque: defaultValues?.plaque || '',
      notes: defaultValues?.notes || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Marque / Modèle <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('marque_modele')}
          placeholder="Ex : Toyota Camry"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.marque_modele && (
          <p className="text-red-500 text-xs mt-1">{errors.marque_modele.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
        <input
          type="text"
          {...register('annee')}
          placeholder="Ex : 2019"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Taille du moteur</label>
        <input
          type="text"
          {...register('taille_moteur')}
          placeholder="Ex : 2.5L, V6"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Plaque d'immatriculation</label>
        <input
          type="text"
          {...register('plaque')}
          placeholder="Ex : ABC-1234"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <input
          type="text"
          {...register('notes')}
          placeholder="Ex : couleur, détails..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
