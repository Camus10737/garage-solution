'use client';

import { use, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { CommandeFournisseur, Fournisseur } from '@/types';
import api from '@/lib/api';
import Link from 'next/link';
import { Mail, Phone, Package } from 'lucide-react';

const LABELS_STATUT: Record<string, string> = {
  commandee: 'Commandée',
  partiellement_recue: 'Partiellement reçue',
  recue: 'Reçue',
};

const COULEURS_STATUT: Record<string, string> = {
  commandee: 'bg-gray-200 text-gray-700',
  partiellement_recue: 'bg-orange-100 text-orange-700',
  recue: 'bg-green-100 text-green-700',
};

export default function FournisseurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [fournisseur, setFournisseur] = useState<Fournisseur | null>(null);
  const [commandes, setCommandes] = useState<CommandeFournisseur[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/fournisseurs/${id}`),
      api.get(`/fournisseurs/${id}/commandes`),
    ])
      .then(([f, c]) => {
        setFournisseur(f.data);
        setCommandes(c.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="Fournisseur">
        <div className="text-gray-400 text-sm">Chargement...</div>
      </AppLayout>
    );
  }

  if (!fournisseur) {
    return (
      <AppLayout title="Fournisseur">
        <div className="text-red-500 text-sm">Fournisseur introuvable.</div>
      </AppLayout>
    );
  }

  const soldeTotalDu = commandes.reduce((sum, c) => sum + c.solde_restant, 0);

  return (
    <AppLayout title={fournisseur.nom}>
      <div className="max-w-2xl space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900 text-lg">{fournisseur.nom}</p>
              <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
                {fournisseur.telephone && (
                  <span className="flex items-center gap-2"><Phone size={13} /> {fournisseur.telephone}</span>
                )}
                {fournisseur.email && (
                  <span className="flex items-center gap-2"><Mail size={13} /> {fournisseur.email}</span>
                )}
              </div>
              {fournisseur.notes && <p className="text-sm text-gray-500 mt-2">{fournisseur.notes}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Solde dû total</p>
              <p className="text-xl font-bold text-gray-900">{soldeTotalDu.toFixed(2)} $</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Commandes</h3>
            <Link
              href="/commandes-fournisseur"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Package size={13} />
              Nouvelle commande
            </Link>
          </div>
          {commandes.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              Aucune commande pour ce fournisseur
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {commandes.map((c) => (
                <Link
                  key={c.commande_id}
                  href={`/commandes-fournisseur/${c.commande_id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {c.numero_commande || 'Commande #' + c.commande_id.slice(-6)}
                    </p>
                    <p className="text-xs text-gray-400">{c.date_commande}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${COULEURS_STATUT[c.statut]}`}>
                      {LABELS_STATUT[c.statut]}
                    </span>
                    <span className="font-semibold text-sm text-gray-800">
                      {c.montant_total.toFixed(2)} $
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
