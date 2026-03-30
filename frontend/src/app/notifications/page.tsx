'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Notification } from '@/types';
import api from '@/lib/api';
import { CheckCircle, XCircle, Clock, Send } from 'lucide-react';

const statutIcon = (statut: Notification['statut']) => {
  if (statut === 'envoye') return <Send size={14} className="text-blue-500" />;
  if (statut === 'recu') return <CheckCircle size={14} className="text-green-500" />;
  return <XCircle size={14} className="text-red-400" />;
};

const statutLabel = (statut: Notification['statut']) => {
  if (statut === 'envoye') return 'Envoyé';
  if (statut === 'recu') return 'Reçu';
  return 'Échoué';
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/notifications')
      .then((r) => setNotifications(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout title="Notifications">
      <div className="space-y-4">
        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          Les notifications sont envoyées automatiquement lorsqu&apos;un véhicule passe au statut{' '}
          <strong>Prêt</strong>.
        </div>

        {/* Historique */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Historique des notifications</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-600">Client</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Message</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    Chargement...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    Aucune notification envoyée
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr key={n.notification_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800">{n.client_nom}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                        {n.type === 'vehicule_pret' ? 'Véhicule prêt' : 'Rappel entretien'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{n.message}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(n.date_envoi).toLocaleString('fr-CA', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {statutIcon(n.statut)}
                        <span
                          className={`text-xs font-medium ${
                            n.statut === 'recu'
                              ? 'text-green-600'
                              : n.statut === 'envoye'
                              ? 'text-blue-600'
                              : 'text-red-500'
                          }`}
                        >
                          {statutLabel(n.statut)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Résumé stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Envoyées',
              count: notifications.filter((n) => n.statut === 'envoye').length,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
            },
            {
              label: 'Reçues',
              count: notifications.filter((n) => n.statut === 'recu').length,
              color: 'text-green-600',
              bg: 'bg-green-50',
            },
            {
              label: 'Échouées',
              count: notifications.filter((n) => n.statut === 'echoue').length,
              color: 'text-red-600',
              bg: 'bg-red-50',
            },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-sm text-gray-600 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
