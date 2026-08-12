'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { ResumeComptable } from '@/types';
import api from '@/lib/api';
import { FileText, FileSpreadsheet, FileDown } from 'lucide-react';

const fmt = (d: Date) => d.toISOString().slice(0, 10);

const periodes = {
  aujourdhui: () => {
    const now = new Date();
    return { debut: fmt(now), fin: fmt(now) };
  },
  mois: () => {
    const now = new Date();
    return { debut: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), fin: fmt(now) };
  },
  trimestre: () => {
    const now = new Date();
    const debutTrimestre = Math.floor(now.getMonth() / 3) * 3;
    return { debut: fmt(new Date(now.getFullYear(), debutTrimestre, 1)), fin: fmt(now) };
  },
  annee: () => {
    const now = new Date();
    return { debut: fmt(new Date(now.getFullYear(), 0, 1)), fin: fmt(now) };
  },
};

export default function ExportComptablePage() {
  const [dateDebut, setDateDebut] = useState(periodes.mois().debut);
  const [dateFin, setDateFin] = useState(periodes.mois().fin);
  const [resume, setResume] = useState<ResumeComptable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  const charger = (debut: string, fin: string) => {
    setLoading(true);
    setError('');
    api.get('/export-comptable/resume', { params: { date_debut: debut, date_fin: fin } })
      .then((r) => setResume(r.data))
      .catch(() => setError('Erreur lors du chargement du résumé.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(dateDebut, dateFin); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const appliquerPeriode = (calc: () => { debut: string; fin: string }) => {
    const { debut, fin } = calc();
    setDateDebut(debut);
    setDateFin(fin);
    charger(debut, fin);
  };

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setExporting(format);
    try {
      const res = await api.get('/export-comptable/export', {
        params: { date_debut: dateDebut, date_fin: dateFin, format },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-comptable-${dateDebut}-au-${dateFin}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Erreur lors de l'export.");
    } finally {
      setExporting(null);
    }
  };

  const cartes = resume ? [
    { label: 'Revenus payés', value: resume.revenus_payes, color: 'text-green-600' },
    { label: 'Revenus en attente', value: resume.revenus_en_attente, color: 'text-yellow-600' },
    { label: 'Revenus annulés', value: resume.revenus_annules, color: 'text-gray-400' },
    { label: 'TPS collectée', value: resume.tps_collectee, color: 'text-gray-800' },
    { label: 'TVQ collectée', value: resume.tvq_collectee, color: 'text-gray-800' },
    { label: 'Taxes totales', value: resume.taxes_totales, color: 'text-gray-800' },
    { label: 'Dépenses fournisseurs payées', value: resume.depenses_fournisseurs_payees, color: 'text-gray-800' },
    { label: 'Dépenses fournisseurs dues', value: resume.depenses_fournisseurs_dues, color: 'text-red-600' },
    { label: 'Profit net approximatif', value: resume.profit_net_approximatif, color: resume.profit_net_approximatif >= 0 ? 'text-green-600' : 'text-red-600' },
    { label: 'Comptes à recevoir', value: resume.comptes_a_recevoir, color: 'text-yellow-600' },
    { label: 'Comptes à payer', value: resume.comptes_a_payer, color: 'text-red-600' },
  ] : [];

  return (
    <AppLayout title="Export comptable">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {([
              ['Aujourd\'hui', periodes.aujourdhui],
              ['Ce mois-ci', periodes.mois],
              ['Ce trimestre', periodes.trimestre],
              ['Cette année', periodes.annee],
            ] as const).map(([label, calc]) => (
              <button
                key={label}
                onClick={() => appliquerPeriode(calc)}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-sm">au</span>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => charger(dateDebut, dateFin)}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Appliquer
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm">Chargement...</div>
        ) : resume && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cartes.map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <p className={`text-2xl font-bold ${color}`}>{value.toFixed(2)} $</p>
                  <p className="text-sm text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-1">Exporter pour le comptable</h3>
              <p className="text-xs text-gray-400 mb-4">
                {resume.nombre_factures} facture(s) et {resume.nombre_commandes_fournisseur} commande(s)
                fournisseur pour la période du {resume.date_debut} au {resume.date_fin}.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting !== null}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <FileDown size={15} />
                  {exporting === 'csv' ? 'Export...' : 'Exporter en CSV'}
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  disabled={exporting !== null}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <FileSpreadsheet size={15} />
                  {exporting === 'xlsx' ? 'Export...' : 'Exporter en Excel'}
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={exporting !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  <FileText size={15} />
                  {exporting === 'pdf' ? 'Export...' : 'Exporter en PDF'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
