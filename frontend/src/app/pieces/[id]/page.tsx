'use client';

import { use, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Fournisseur, MouvementStock, Piece } from '@/types';
import api from '@/lib/api';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

const LABELS_SOURCE: Record<string, string> = {
  reception_fournisseur: 'Réception fournisseur',
  facture: 'Vente (facture)',
  commande_speciale: 'Commande spéciale',
};

export default function PieceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [mouvements, setMouvements] = useState<MouvementStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/pieces/${id}`),
      api.get('/fournisseurs'),
      api.get(`/pieces/${id}/mouvements`),
    ])
      .then(([p, f, m]) => {
        setPiece(p.data);
        setFournisseurs(f.data);
        setMouvements(m.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="Pièce">
        <div className="text-gray-400 text-sm">Chargement...</div>
      </AppLayout>
    );
  }

  if (!piece) {
    return (
      <AppLayout title="Pièce">
        <div className="text-red-500 text-sm">Pièce introuvable.</div>
      </AppLayout>
    );
  }

  const nomFournisseur = (id: string) => fournisseurs.find((f) => f.fournisseur_id === id)?.nom || '—';

  return (
    <AppLayout title={piece.nom}>
      <div className="max-w-2xl space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900 text-lg">{piece.nom}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {[piece.numero_item ? `#${piece.numero_item}` : null, piece.categorie, piece.emplacement]
                  .filter(Boolean)
                  .join(' • ') || '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Prix de vente</p>
              <p className="text-xl font-bold text-gray-900">{piece.prix.toFixed(2)} $</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">Stock : </span>
              <span className="font-medium text-gray-800">{piece.quantite ?? '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Seuil d&apos;alerte : </span>
              <span className="font-medium text-gray-800">{piece.seuil_alerte ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Fournisseurs liés</h3>
          {piece.fournisseurs.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun fournisseur lié à cette pièce.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Fournisseur</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Prix d&apos;achat</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Marge</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Délai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {piece.fournisseurs.map((f, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-800">{nomFournisseur(f.fournisseur_id)}</td>
                    <td className="py-2 text-right text-gray-600">{f.prix_achat.toFixed(2)} $</td>
                    <td className="py-2 text-right font-medium text-green-700">
                      {(piece.prix - f.prix_achat).toFixed(2)} $
                    </td>
                    <td className="py-2 text-gray-600">{f.delai_livraison || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Historique des mouvements de stock</h3>
          {mouvements.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun mouvement enregistré.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {mouvements.map((m) => (
                <div key={m.mouvement_id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    {m.type === 'entree' ? (
                      <ArrowUpCircle size={15} className="text-green-500" />
                    ) : (
                      <ArrowDownCircle size={15} className="text-red-500" />
                    )}
                    <span className="text-gray-700">{LABELS_SOURCE[m.source] || m.source}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-medium ${m.type === 'entree' ? 'text-green-700' : 'text-red-700'}`}>
                      {m.type === 'entree' ? '+' : '-'}{m.quantite}
                    </span>
                    <span className="text-gray-400 text-xs">{m.date.replace('T', ' ').slice(0, 16)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
