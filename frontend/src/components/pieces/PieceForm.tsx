'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Piece } from '@/types';

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prix: z.number().min(0, 'Prix invalide'),
  quantite: z.number().min(0).optional(),
  fournie_par_client: z.boolean(),
});

export type PieceFormData = z.infer<typeof schema>;

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
  } = useForm<PieceFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: defaultValues?.nom || '',
      prix: defaultValues?.prix || 0,
      quantite: defaultValues?.quantite,
      fournie_par_client: defaultValues?.fournie_par_client || false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Prix ($) <span className="text-red-500">*</span>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock</label>
        <input
          type="number"
          {...register('quantite', { valueAsNumber: true })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
