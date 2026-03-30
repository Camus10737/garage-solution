'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Piece } from '@/types';
import api from '@/lib/api';
import { Plus, Pencil, Ban, RotateCcw } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import PieceForm, { PieceFormData } from '@/components/pieces/PieceForm';

export default function PiecesPage() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editPiece, setEditPiece] = useState<Piece | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/pieces')
      .then((r) => setPieces(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggleActif = async (id: string, actif: boolean) => {
    if (!confirm(actif ? 'Désactiver cette pièce ?' : 'Réactiver cette pièce ?')) return;
    await api.patch(`/pieces/${id}`, { active: !actif });
    setPieces((prev) => prev.map((p) => (p.piece_id === id ? { ...p, active: !actif } : p)));
  };

  const handleAjouter = async (data: PieceFormData) => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/pieces', data);
      setPieces((prev) => [res.data, ...prev]);
      setDrawerOpen(false);
    } catch {
      setError('Erreur lors de la création de la pièce.');
    } finally {
      setSaving(false);
    }
  };

  const handleModifier = async (data: PieceFormData) => {
    if (!editPiece) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/pieces/${editPiece.piece_id}`, data);
      setPieces((prev) => prev.map((p) => (p.piece_id === editPiece.piece_id ? res.data : p)));
      setEditPiece(null);
    } catch {
      setError('Erreur lors de la mise à jour de la pièce.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Pièces">
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={() => { setError(''); setDrawerOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Nouvelle pièce
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Prix</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Stock</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Fournie par client</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    Chargement...
                  </td>
                </tr>
              ) : pieces.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    Aucune pièce enregistrée
                  </td>
                </tr>
              ) : (
                pieces.map((piece) => (
                  <tr key={piece.piece_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{piece.nom}</td>
                    <td className="px-6 py-4 text-gray-600">{piece.prix.toFixed(2)} $</td>
                    <td className="px-6 py-4 text-gray-600">
                      {piece.quantite !== undefined ? piece.quantite : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {piece.fournie_par_client ? (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Oui</span>
                      ) : (
                        <span className="text-xs text-gray-400">Non</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          piece.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {piece.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setError(''); setEditPiece(piece); }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleActif(piece.piece_id, piece.active)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            piece.active
                              ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={piece.active ? 'Désactiver' : 'Réactiver'}
                        >
                          {piece.active ? <Ban size={15} /> : <RotateCcw size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Nouvelle pièce">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <PieceForm onSubmit={handleAjouter} loading={saving} />
      </Drawer>

      <Drawer open={!!editPiece} onClose={() => setEditPiece(null)} title="Modifier la pièce">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        {editPiece && (
          <PieceForm defaultValues={editPiece} onSubmit={handleModifier} loading={saving} />
        )}
      </Drawer>
    </AppLayout>
  );
}
