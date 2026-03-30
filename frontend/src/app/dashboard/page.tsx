'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Car, Users, FileText, Clock } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { Facture } from '@/types';
import Drawer from '@/components/ui/Drawer';
import ClientForm, { ClientFormData } from '@/components/clients/ClientForm';
import PieceForm, { PieceFormData } from '@/components/pieces/PieceForm';
import ServiceForm, { ServiceFormData } from '@/components/services/ServiceForm';
import FactureForm, { FactureFormData } from '@/components/factures/FactureForm';

interface Stats {
  vehiculesEnCours: number;
  vehiculesPrets: number;
  totalClients: number;
  facturesDuJour: number;
}

type DrawerType = 'client' | 'facture' | 'piece' | 'service' | null;

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    vehiculesEnCours: 0,
    vehiculesPrets: 0,
    totalClients: 0,
    facturesDuJour: 0,
  });
  const [facturesRecentes, setFacturesRecentes] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<DrawerType>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, facturesRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/factures?limit=5'),
        ]);
        const d = statsRes.data;
        setStats({
          vehiculesEnCours: d.vehicules_en_cours,
          vehiculesPrets: d.vehicules_prets,
          totalClients: d.total_clients_actifs,
          facturesDuJour: d.factures_aujourd_hui,
        });
        setFacturesRecentes(facturesRes.data);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openDrawer = (type: DrawerType) => { setError(''); setDrawer(type); };
  const closeDrawer = () => setDrawer(null);

  const handleAddClient = async (data: ClientFormData) => {
    setSaving(true); setError('');
    try {
      await api.post('/clients', data);
      setStats((s) => ({ ...s, totalClients: s.totalClients + 1 }));
      closeDrawer();
    } catch { setError('Erreur lors de la création du client.'); }
    finally { setSaving(false); }
  };

  const handleAddPiece = async (data: PieceFormData) => {
    setSaving(true); setError('');
    try {
      await api.post('/pieces', data);
      closeDrawer();
    } catch { setError('Erreur lors de la création de la pièce.'); }
    finally { setSaving(false); }
  };

  const handleAddService = async (data: ServiceFormData) => {
    setSaving(true); setError('');
    try {
      await api.post('/services', data);
      closeDrawer();
    } catch { setError('Erreur lors de la création du service.'); }
    finally { setSaving(false); }
  };

  const handleAddFacture = async (data: FactureFormData) => {
    setSaving(true); setError('');
    try {
      const res = await api.post('/factures', data);
      setFacturesRecentes((prev) => [res.data, ...prev].slice(0, 5));
      setStats((s) => ({ ...s, facturesDuJour: s.facturesDuJour + 1, vehiculesEnCours: s.vehiculesEnCours + 1 }));
      closeDrawer();
    } catch { setError('Erreur lors de la création de la facture.'); }
    finally { setSaving(false); }
  };

  const statCards = [
    { label: 'Véhicules en cours', value: stats.vehiculesEnCours, icon: Clock, color: 'bg-yellow-500', href: '/factures?statut=en_cours' },
    { label: 'Véhicules prêts', value: stats.vehiculesPrets, icon: Car, color: 'bg-green-500', href: '/factures?statut=pret' },
    { label: 'Total clients', value: stats.totalClients, icon: Users, color: 'bg-blue-500', href: '/clients' },
    { label: "Factures aujourd'hui", value: stats.facturesDuJour, icon: FileText, color: 'bg-purple-500', href: '/factures' },
  ];

  const drawerTitle: Record<NonNullable<DrawerType>, string> = {
    client: 'Nouveau client',
    facture: 'Nouvelle facture',
    piece: 'Nouvelle pièce',
    service: 'Nouveau service',
  };

  return (
    <AppLayout title="Tableau de bord">
      <div className="space-y-6">
        {/* Cartes statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, href }) => (
            <Link href={href} key={label}>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`${color} p-3 rounded-lg text-white`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '—' : value}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Accès rapide */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Accès rapide</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => openDrawer('client')} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              + Nouveau client
            </button>
            <button onClick={() => openDrawer('facture')} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
              + Nouvelle facture
            </button>
            <button onClick={() => openDrawer('piece')} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
              + Nouvelle pièce
            </button>
            <button onClick={() => openDrawer('service')} className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors">
              + Nouveau service
            </button>
          </div>
        </div>

        {/* Factures récentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Factures récentes</h3>
            <Link href="/factures" className="text-sm text-blue-600 hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">Chargement...</div>
            ) : facturesRecentes.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                Aucune facture pour l&apos;instant
              </div>
            ) : (
              facturesRecentes.map((f) => (
                <Link
                  key={f.facture_id}
                  href={`/factures/${f.facture_id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{f.client_nom}</p>
                    <p className="text-xs text-gray-400">{f.date_creation}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${f.statut_vehicule === 'pret' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {f.statut_vehicule === 'pret' ? 'Prêt' : 'En cours'}
                    </span>
                    <span className="font-semibold text-sm text-gray-800">
                      {f.total_facture.toFixed(2)} $
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Drawers */}
      <Drawer open={drawer !== null} onClose={closeDrawer} title={drawer ? drawerTitle[drawer] : ''}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        {drawer === 'client' && <ClientForm onSubmit={handleAddClient} loading={saving} />}
        {drawer === 'piece' && <PieceForm onSubmit={handleAddPiece} loading={saving} />}
        {drawer === 'service' && <ServiceForm onSubmit={handleAddService} loading={saving} />}
        {drawer === 'facture' && <FactureForm onSubmit={handleAddFacture} loading={saving} />}
      </Drawer>
    </AppLayout>
  );
}
