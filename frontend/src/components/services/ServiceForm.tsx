'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Service } from '@/types';

const schema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prix: z.number().min(0, 'Prix invalide'),
});

export type ServiceFormData = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<Service>;
  onSubmit: (data: ServiceFormData) => Promise<void>;
  loading?: boolean;
}

export default function ServiceForm({ defaultValues, onSubmit, loading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: defaultValues?.nom || '',
      prix: defaultValues?.prix || 0,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom du service <span className="text-red-500">*</span>
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
