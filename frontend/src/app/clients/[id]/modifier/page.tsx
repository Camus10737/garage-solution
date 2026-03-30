'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from 1;
import ClientForm, { ClientFormData } from '@/components/clients/ClientForm';
import { Client } from '@/types';
import api from '@/lib/api';

export default function ModifierClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/clients/${id}`).then((r) => setClient(r.data)).catch(() => {});
  }, [id]);

  const handleSubmit = async (data: ClientFormData) => {
    setLoading(true);
    setError('');
    try {
      await api.put(`/clients/${id}`, data);
      router.push(`/clients/${id}`);
    } catch {
      setError("Erreur lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  if (!client) {
    return (
      <AppLayout title="Modifier client">
        <div className="text-gray-400 text-sm">Chargement...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Modifier — ${client.nom}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <ClientForm defaultValues={client} onSubmit={handleSubmit} loading={loading} />
      </div>
    </AppLayout>
  );
}
