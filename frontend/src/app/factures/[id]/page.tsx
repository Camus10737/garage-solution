'use client';

import { use, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Facture } from '@/types';
import api from '@/lib/api';
import { FileDown, CheckCircle, Clock, Mail } from 'lucide-react';

export default function FactureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatut, setUpdatingStatut] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api
      .get(`/factures/${id}`)
      .then((r) => setFacture(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleChangerStatut = async () => {
    if (!facture) return;
    const newStatut = facture.statut_vehicule === 'en_cours' ? 'pret' : 'en_cours';
    setUpdatingStatut(true);
    try {
      await api.patch(`/factures/${id}`, { statut_vehicule: newStatut });
      setFacture({ ...facture, statut_vehicule: newStatut });
    } catch {
      alert("Erreur lors du changement de statut.");
    } finally {
      setUpdatingStatut(false);
    }
  };

  const handleEnvoyerEmail = async () => {
    setSendingEmail(true);
    setEmailMsg(null);
    try {
      await api.post(`/factures/${id}/envoyer-email`);
      setEmailMsg({ type: 'success', text: 'Facture envoyée par email avec succès.' });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Erreur lors de l'envoi.";
      setEmailMsg({ type: 'error', text: detail });
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Facture">
        <div className="text-gray-400 text-sm">Chargement...</div>
      </AppLayout>
    );
  }

  if (!facture) {
    return (
      <AppLayout title="Facture">
        <div className="text-red-500 text-sm">Facture introuvable.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Facture ${facture.numero_facture || '#' + facture.facture_id.slice(-6).toUpperCase()}`}>
      <div className="max-w-2xl space-y-4">
        {/* En-tête */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Client</p>
              <p className="font-bold text-gray-900 text-lg">{facture.client_nom}</p>
              {(facture.vehicule_info || facture.vehicule) && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {facture.vehicule_info
                    ? [facture.vehicule_info.marque_modele, facture.vehicule_info.annee, facture.vehicule_info.plaque ? `Plaque : ${facture.vehicule_info.plaque}` : null].filter(Boolean).join(' • ')
                    : facture.vehicule}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{facture.date_creation}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                  facture.statut_vehicule === 'pret'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {facture.statut_vehicule === 'pret' ? 'Véhicule prêt' : 'En cours'}
              </span>
              <button
                onClick={handleChangerStatut}
                disabled={updatingStatut}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {facture.statut_vehicule === 'pret' ? (
                  <><Clock size={12} /> Remettre en cours</>
                ) : (
                  <><CheckCircle size={12} /> Marquer prêt</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Pièces */}
        {facture.pieces.length > 0 && (
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
                {facture.pieces.map((p, i) => (
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
        {facture.services.length > 0 && (
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
                {facture.services.map((s, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-800">{s.nom}</td>
                    <td className="py-2 text-right text-gray-800">{s.prix.toFixed(2)} $</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totaux */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between text-gray-600">
              <span>Pièces</span>
              <span>{facture.total_pieces.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Services</span>
              <span>{facture.total_services.toFixed(2)} $</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Taxes</span>
              <span>{facture.taxes.toFixed(2)} $</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-base">
              <span>Total</span>
              <span>{facture.total_facture.toFixed(2)} $</span>
            </div>
          </div>

          {emailMsg && (
            <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
              emailMsg.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {emailMsg.text}
            </div>
          )}
          {facture.pdf_url && (
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={handleEnvoyerEmail}
                disabled={sendingEmail}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Mail size={15} />
                {sendingEmail ? 'Envoi...' : 'Envoyer par email'}
              </button>
              <a
                href={facture.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FileDown size={15} />
                Télécharger PDF
              </a>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
