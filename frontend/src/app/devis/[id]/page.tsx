'use client';

import { use, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Devis } from '@/types';
import api from '@/lib/api';
import Link from 'next/link';
import { FileDown, CheckCircle, XCircle, Mail, MessageSquare, ArrowRightCircle } from 'lucide-react';

const LABELS_STATUT: Record<string, string> = {
  brouillon: 'Brouillon',
  en_attente: 'En attente',
  accepte: 'Accepté',
  refuse: 'Refusé',
};

const COULEURS_STATUT: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-600',
  en_attente: 'bg-yellow-100 text-yellow-700',
  accepte: 'bg-green-100 text-green-700',
  refuse: 'bg-red-100 text-red-700',
};

export default function DevisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [devis, setDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [sending, setSending] = useState<'email' | 'sms' | null>(null);
  const [converting, setConverting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const reload = () =>
    api.get(`/devis/${id}`).then((r) => setDevis(r.data)).catch(() => {});

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [id]);

  const handleChangerStatut = async (statut: 'en_attente' | 'accepte' | 'refuse') => {
    setUpdating(true);
    setMsg(null);
    try {
      await api.patch(`/devis/${id}`, { statut });
      await reload();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.detail || 'Erreur lors du changement de statut.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleEnvoyer = async (canal: 'email' | 'sms') => {
    setSending(canal);
    setMsg(null);
    try {
      await api.post(`/devis/${id}/envoyer?canal=${canal}`);
      setMsg({ type: 'success', text: canal === 'email' ? 'Devis envoyé par email.' : 'Devis envoyé par SMS.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.detail || "Erreur lors de l'envoi." });
    } finally {
      setSending(null);
    }
  };

  const handleConvertir = async () => {
    setConverting(true);
    setMsg(null);
    try {
      const res = await api.post(`/devis/${id}/convertir`);
      setDevis(res.data);
      setMsg({ type: 'success', text: 'Devis converti en facture avec succès.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.detail || 'Erreur lors de la conversion.' });
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Devis">
        <div className="text-gray-400 text-sm">Chargement...</div>
      </AppLayout>
    );
  }

  if (!devis) {
    return (
      <AppLayout title="Devis">
        <div className="text-red-500 text-sm">Devis introuvable.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Devis ${devis.numero_devis || '#' + devis.devis_id.slice(-6).toUpperCase()}`}>
      <div className="max-w-2xl space-y-4">
        {/* En-tête */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Client</p>
              <p className="font-bold text-gray-900 text-lg">{devis.client_nom}</p>
              {devis.vehicule_info && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {[devis.vehicule_info.marque_modele, devis.vehicule_info.annee, devis.vehicule_info.plaque ? `Plaque : ${devis.vehicule_info.plaque}` : null, devis.vehicule_info.vin ? `VIN : ${devis.vehicule_info.vin}` : null].filter(Boolean).join(' • ')}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{devis.date_creation}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${COULEURS_STATUT[devis.statut]}`}>
                {LABELS_STATUT[devis.statut]}
              </span>
              {devis.statut === 'brouillon' && (
                <button
                  onClick={() => handleChangerStatut('en_attente')}
                  disabled={updating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Marquer en attente
                </button>
              )}
              {(devis.statut === 'brouillon' || devis.statut === 'en_attente') && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleChangerStatut('accepte')}
                    disabled={updating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle size={12} /> Accepter
                  </button>
                  <button
                    onClick={() => handleChangerStatut('refuse')}
                    disabled={updating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={12} /> Refuser
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conversion en facture */}
        {devis.statut === 'accepte' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {devis.converti && devis.facture_id ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Ce devis a été converti en facture.</p>
                <Link
                  href={`/factures/${devis.facture_id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Voir la facture
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Ce devis est accepté et peut être converti en facture.</p>
                <button
                  onClick={handleConvertir}
                  disabled={converting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <ArrowRightCircle size={15} />
                  {converting ? 'Conversion...' : 'Convertir en facture'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pièces */}
        {devis.pieces.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Pièces</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Pièce</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Qté</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Prix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {devis.pieces.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-800">
                      {p.nom}
                      {p.fournie_par_client && (
                        <span className="ml-2 text-xs text-blue-600">(fournie par client)</span>
                      )}
                    </td>
                    <td className="py-2 text-center text-gray-600">{p.quantite}</td>
                    <td className="py-2 text-right text-gray-800">
                      {p.fournie_par_client ? '—' : `${(p.prix * p.quantite).toFixed(2)} $`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Services */}
        {devis.services.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Services</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Service</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Prix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {devis.services.map((s, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-800">{s.nom}</td>
                    <td className="py-2 text-right text-gray-800">{s.prix.toFixed(2)} $</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Main d'œuvre */}
        {devis.main_oeuvre.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Main d&apos;œuvre</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Description</th>
                  <th className="text-center py-2 text-gray-500 font-medium">Heures</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Taux</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {devis.main_oeuvre.map((m, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-800">{m.description}</td>
                    <td className="py-2 text-center text-gray-600">{m.heures}h</td>
                    <td className="py-2 text-right text-gray-600">{m.taux_horaire.toFixed(2)} $/h</td>
                    <td className="py-2 text-right text-gray-800">{(m.heures * m.taux_horaire).toFixed(2)} $</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totaux + envoi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between text-gray-600">
              <span>Pièces</span>
              <span>{devis.total_pieces.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Services</span>
              <span>{devis.total_services.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Main d&apos;œuvre</span>
              <span>{devis.total_main_oeuvre.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Taxes</span>
              <span>{devis.taxes.toFixed(2)} $</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-base">
              <span>Total</span>
              <span>{devis.total_devis.toFixed(2)} $</span>
            </div>
          </div>

          {msg && (
            <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
              msg.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {msg.text}
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              onClick={() => handleEnvoyer('sms')}
              disabled={sending !== null}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <MessageSquare size={15} />
              {sending === 'sms' ? 'Envoi...' : 'Envoyer par SMS'}
            </button>
            {devis.pdf_url && (
              <>
                <button
                  onClick={() => handleEnvoyer('email')}
                  disabled={sending !== null}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <Mail size={15} />
                  {sending === 'email' ? 'Envoi...' : 'Envoyer par email'}
                </button>
                <a
                  href={devis.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <FileDown size={15} />
                  Télécharger PDF
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
