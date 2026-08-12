'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { RoleUtilisateur, Utilisateur } from '@/types';
import api from '@/lib/api';
import { Plus, Pencil, Ban, CheckCircle } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';

const LABELS_ROLE: Record<RoleUtilisateur, string> = {
  admin: 'Admin',
  gestionnaire: 'Gestionnaire',
  comptable: 'Comptable',
};

export default function UtilisateursPage() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editUser, setEditUser] = useState<Utilisateur | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleUtilisateur>('gestionnaire');

  const charger = () =>
    api.get('/utilisateurs').then((r) => setUtilisateurs(r.data)).catch(() => {});

  useEffect(() => {
    charger().finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setNom(''); setEmail(''); setTelephone(''); setPassword(''); setRole('gestionnaire');
    setEditUser(null);
  };

  const ouvrirCreation = () => {
    resetForm();
    setError('');
    setDrawerOpen(true);
  };

  const ouvrirEdition = (u: Utilisateur) => {
    setEditUser(u);
    setNom(u.nom);
    setEmail(u.email);
    setTelephone(u.telephone || '');
    setRole(u.role);
    setError('');
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || (!editUser && (!email || !password))) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editUser) {
        const res = await api.patch(`/utilisateurs/${editUser.uid}`, {
          nom, telephone: telephone || null, role,
        });
        setUtilisateurs((prev) => prev.map((u) => (u.uid === editUser.uid ? res.data : u)));
      } else {
        const res = await api.post('/utilisateurs', {
          nom, email, telephone: telephone || null, password, role,
        });
        setUtilisateurs((prev) => [...prev, res.data]);
      }
      setDrawerOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActif = async (u: Utilisateur) => {
    setActionId(u.uid);
    try {
      const res = await api.patch(`/utilisateurs/${u.uid}`, { actif: !u.actif });
      setUtilisateurs((prev) => prev.map((x) => (x.uid === u.uid ? res.data : x)));
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Erreur lors de la mise à jour.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <AppLayout title="Utilisateurs">
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <button
            onClick={ouvrirCreation}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Nouvel utilisateur
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Nom</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Téléphone</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Rôle</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chargement...</td></tr>
              ) : utilisateurs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Aucun utilisateur</td></tr>
              ) : (
                utilisateurs.map((u) => (
                  <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{u.nom}</td>
                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                    <td className="px-6 py-4 text-gray-600">{u.telephone || '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{LABELS_ROLE[u.role]}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        u.actif ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {u.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => ouvrirEdition(u)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => toggleActif(u)}
                          disabled={actionId === u.uid}
                          className={`flex items-center gap-1 text-xs disabled:opacity-50 ${
                            u.actif ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {u.actif ? <Ban size={13} /> : <CheckCircle size={13} />}
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

      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); resetForm(); }}
        title={editUser ? 'Modifier utilisateur' : 'Nouvel utilisateur'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email {!editUser && <span className="text-red-500">*</span>}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!editUser}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {!editUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleUtilisateur)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(LABELS_ROLE) as RoleUtilisateur[]).map((r) => (
                <option key={r} value={r}>{LABELS_ROLE[r]}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Enregistrement...' : editUser ? 'Enregistrer' : "Créer l'utilisateur"}
          </button>
        </form>
      </Drawer>
    </AppLayout>
  );
}
