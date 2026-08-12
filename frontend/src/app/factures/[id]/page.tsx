'use client';

import { use, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Facture, MethodePaiement, Piece, Service, StatutReparation } from '@/types';
import api from '@/lib/api';
import { FileDown, Mail, Ban, Plus, Pencil, Check, BellRing } from 'lucide-react';

const LABELS_STATUT_PAIEMENT: Record<string, string> = {
  non_paye: 'Non payé',
  partiellement_paye: 'Partiellement payé',
  paye: 'Payé',
};

const COULEURS_STATUT_PAIEMENT: Record<string, string> = {
  non_paye: 'bg-red-100 text-red-700',
  partiellement_paye: 'bg-yellow-100 text-yellow-700',
  paye: 'bg-green-100 text-green-700',
};

const LABELS_METHODE: Record<MethodePaiement, string> = {
  comptant: 'Comptant',
  carte: 'Carte',
  virement: 'Virement',
  cheque: 'Chèque',
};

const LABELS_STATUT_REPARATION: Record<StatutReparation, string> = {
  en_attente: 'En attente',
  en_attente_piece: 'En attente de pièce',
  en_cours: 'Réparation en cours',
  fini: 'Fini',
};

const COULEURS_STATUT_REPARATION: Record<StatutReparation, string> = {
  en_attente: 'bg-gray-200 text-gray-700',
  en_attente_piece: 'bg-orange-100 text-orange-700',
  en_cours: 'bg-yellow-100 text-yellow-700',
  fini: 'bg-green-100 text-green-700',
};

export default function FactureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [facture, setFacture] = useState<Facture | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatut, setUpdatingStatut] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [montantPaiement, setMontantPaiement] = useState('');
  const [methodePaiement, setMethodePaiement] = useState<MethodePaiement>('comptant');
  const [addingPaiement, setAddingPaiement] = useState(false);
  const [paiementMsg, setPaiementMsg] = useState<string | null>(null);
  const [sendingRappel, setSendingRappel] = useState(false);
  const [rappelMsg, setRappelMsg] = useState<string | null>(null);

  const [showAnnuler, setShowAnnuler] = useState(false);
  const [raisonAnnulation, setRaisonAnnulation] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [editingMecanicien, setEditingMecanicien] = useState(false);
  const [mecanicienInput, setMecanicienInput] = useState('');
  const [savingMecanicien, setSavingMecanicien] = useState(false);

  const [pieceIdAAjouter, setPieceIdAAjouter] = useState('');
  const [quantitePieceAAjouter, setQuantitePieceAAjouter] = useState(1);
  const [serviceIdAAjouter, setServiceIdAAjouter] = useState('');
  const [addingLigne, setAddingLigne] = useState(false);
  const [ligneMsg, setLigneMsg] = useState<string | null>(null);

  const reload = () =>
    api.get(`/factures/${id}`).then((r) => setFacture(r.data)).catch(() => {});

  useEffect(() => {
    Promise.all([reload(), api.get('/pieces'), api.get('/services')])
      .then(([, p, s]) => {
        setPieces(p.data.filter((x: Piece) => x.active));
        setServices(s.data.filter((x: Service) => x.active));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (facture) setMecanicienInput(facture.mecanicien_nom || '');
  }, [facture?.facture_id]);

  const handleChangerStatut = async (statut: StatutReparation) => {
    if (!facture || statut === facture.statut_reparation) return;
    setUpdatingStatut(true);
    try {
      const res = await api.patch(`/factures/${id}`, { statut_reparation: statut });
      setFacture(res.data);
    } catch {
      alert('Erreur lors du changement de statut.');
    } finally {
      setUpdatingStatut(false);
    }
  };

  const handleSaveMecanicien = async () => {
    setSavingMecanicien(true);
    try {
      const res = await api.patch(`/factures/${id}/mecanicien`, { mecanicien_nom: mecanicienInput || null });
      setFacture(res.data);
      setEditingMecanicien(false);
    } catch {
      alert("Erreur lors de l'enregistrement du mécanicien.");
    } finally {
      setSavingMecanicien(false);
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

  const handleAjouterPaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = Number(montantPaiement);
    if (!montant || montant <= 0) return;
    setAddingPaiement(true);
    setPaiementMsg(null);
    try {
      const res = await api.post(`/factures/${id}/paiements`, { montant, methode: methodePaiement });
      setFacture(res.data);
      setMontantPaiement('');
    } catch (err: any) {
      setPaiementMsg(err?.response?.data?.detail || "Erreur lors de l'enregistrement du paiement.");
    } finally {
      setAddingPaiement(false);
    }
  };

  const handleRappelPaiement = async () => {
    setSendingRappel(true);
    setRappelMsg(null);
    try {
      await api.post(`/factures/${id}/rappel-paiement`);
      setRappelMsg('Rappel envoyé.');
    } catch (err: any) {
      setRappelMsg(err?.response?.data?.detail || "Erreur lors de l'envoi du rappel.");
    } finally {
      setSendingRappel(false);
    }
  };

  const handleAjouterPiece = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = pieces.find((p) => p.piece_id === pieceIdAAjouter);
    if (!found) return;
    setAddingLigne(true);
    setLigneMsg(null);
    try {
      const res = await api.post(`/factures/${id}/pieces`, {
        piece_id: found.piece_id,
        nom: found.nom,
        prix: found.prix,
        quantite: quantitePieceAAjouter,
        fournie_par_client: false,
      });
      setFacture(res.data);
      setPieceIdAAjouter('');
      setQuantitePieceAAjouter(1);
    } catch {
      setLigneMsg("Erreur lors de l'ajout de la pièce.");
    } finally {
      setAddingLigne(false);
    }
  };

  const handleAjouterService = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = services.find((s) => s.service_id === serviceIdAAjouter);
    if (!found) return;
    setAddingLigne(true);
    setLigneMsg(null);
    try {
      const res = await api.post(`/factures/${id}/services`, {
        service_id: found.service_id,
        nom: found.nom,
        prix: found.prix,
      });
      setFacture(res.data);
      setServiceIdAAjouter('');
    } catch {
      setLigneMsg("Erreur lors de l'ajout du service.");
    } finally {
      setAddingLigne(false);
    }
  };

  const handleAnnuler = async () => {
    if (!confirm('Confirmer l\'annulation de cette facture ? Cette action ne peut pas être défaite.')) return;
    setCancelling(true);
    try {
      const res = await api.post(`/factures/${id}/annuler`, { raison: raisonAnnulation || null });
      setFacture(res.data);
      setShowAnnuler(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Erreur lors de l'annulation.");
    } finally {
      setCancelling(false);
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
        {facture.annulee && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <p className="font-semibold">Facture annulée</p>
            {facture.raison_annulation && <p className="mt-0.5">Raison : {facture.raison_annulation}</p>}
          </div>
        )}

        {/* En-tête */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Client</p>
              <p className="font-bold text-gray-900 text-lg">{facture.client_nom}</p>
              {(facture.vehicule_info || facture.vehicule) && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {facture.vehicule_info
                    ? [facture.vehicule_info.marque_modele, facture.vehicule_info.annee, facture.vehicule_info.plaque ? `Plaque : ${facture.vehicule_info.plaque}` : null, facture.vehicule_info.vin ? `VIN : ${facture.vehicule_info.vin}` : null].filter(Boolean).join(' • ')
                    : facture.vehicule}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{facture.date_creation}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${COULEURS_STATUT_REPARATION[facture.statut_reparation]}`}>
                {LABELS_STATUT_REPARATION[facture.statut_reparation]}
              </span>
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${COULEURS_STATUT_PAIEMENT[facture.statut_paiement]}`}>
                {LABELS_STATUT_PAIEMENT[facture.statut_paiement]}
              </span>
              {!facture.annulee && (
                <select
                  value={facture.statut_reparation}
                  onChange={(e) => handleChangerStatut(e.target.value as StatutReparation)}
                  disabled={updatingStatut}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {(Object.keys(LABELS_STATUT_REPARATION) as StatutReparation[]).map((s) => (
                    <option key={s} value={s}>{LABELS_STATUT_REPARATION[s]}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Mécanicien assigné */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
            <span className="text-sm text-gray-500">Mécanicien assigné :</span>
            {editingMecanicien ? (
              <>
                <input
                  type="text"
                  value={mecanicienInput}
                  onChange={(e) => setMecanicienInput(e.target.value)}
                  placeholder="Nom du mécanicien"
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleSaveMecanicien} disabled={savingMecanicien} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50">
                  <Check size={14} />
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-800 font-medium">{facture.mecanicien_nom || '—'}</span>
                {!facture.annulee && (
                  <button onClick={() => setEditingMecanicien(true)} className="p-1 text-gray-400 hover:text-blue-600">
                    <Pencil size={13} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pièces */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Pièces</h3>
          {facture.pieces.length > 0 && (
            <table className="w-full text-sm mb-3">
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
          )}
          {!facture.annulee && (
            <form onSubmit={handleAjouterPiece} className="flex items-center gap-2">
              <select
                value={pieceIdAAjouter}
                onChange={(e) => setPieceIdAAjouter(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Ajouter une pièce...</option>
                {pieces.map((p) => (
                  <option key={p.piece_id} value={p.piece_id}>{p.nom} — {p.prix.toFixed(2)} $</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={quantitePieceAAjouter}
                onChange={(e) => setQuantitePieceAAjouter(Number(e.target.value))}
                className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!pieceIdAAjouter || addingLigne}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus size={13} /> Ajouter
              </button>
            </form>
          )}
        </div>

        {/* Services */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Services</h3>
          {facture.services.length > 0 && (
            <table className="w-full text-sm mb-3">
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
          )}
          {!facture.annulee && (
            <form onSubmit={handleAjouterService} className="flex items-center gap-2">
              <select
                value={serviceIdAAjouter}
                onChange={(e) => setServiceIdAAjouter(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Ajouter un service...</option>
                {services.map((s) => (
                  <option key={s.service_id} value={s.service_id}>{s.nom} — {s.prix.toFixed(2)} $</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!serviceIdAAjouter || addingLigne}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus size={13} /> Ajouter
              </button>
            </form>
          )}
          {ligneMsg && <p className="text-xs text-red-600 mt-2">{ligneMsg}</p>}
        </div>

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

        {/* Paiements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Paiements</h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${COULEURS_STATUT_PAIEMENT[facture.statut_paiement]}`}>
              {LABELS_STATUT_PAIEMENT[facture.statut_paiement]}
            </span>
          </div>

          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-500">Montant payé</span>
            <span className="text-gray-800 font-medium">{facture.montant_paye.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span className="text-gray-500">Solde restant</span>
            <span className="text-gray-900 font-bold">{facture.solde_restant.toFixed(2)} $</span>
          </div>

          {facture.paiements.length > 0 && (
            <div className="divide-y divide-gray-50 border-t border-gray-100 mb-4">
              {facture.paiements.map((p, i) => (
                <div key={i} className="flex justify-between py-2 text-sm">
                  <span className="text-gray-500">
                    {p.date.slice(0, 10)} — {LABELS_METHODE[p.methode]}
                  </span>
                  <span className="text-gray-800 font-medium">{p.montant.toFixed(2)} $</span>
                </div>
              ))}
            </div>
          )}

          {paiementMsg && (
            <div className="mb-3 rounded-lg px-4 py-2.5 text-sm bg-red-50 border border-red-200 text-red-700">
              {paiementMsg}
            </div>
          )}

          {!facture.annulee && facture.solde_restant > 0 && (
            <form onSubmit={handleAjouterPaiement} className="flex items-center gap-2">
              <input
                type="number"
                min={0.01}
                step={0.01}
                max={facture.solde_restant}
                value={montantPaiement}
                onChange={(e) => setMontantPaiement(e.target.value)}
                placeholder="Montant"
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={methodePaiement}
                onChange={(e) => setMethodePaiement(e.target.value as MethodePaiement)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(Object.keys(LABELS_METHODE) as MethodePaiement[]).map((m) => (
                  <option key={m} value={m}>{LABELS_METHODE[m]}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={addingPaiement}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus size={14} />
                {addingPaiement ? 'Enregistrement...' : 'Enregistrer le paiement'}
              </button>
            </form>
          )}

          {!facture.annulee && facture.solde_restant > 0 && (
            <div className="mt-3">
              <button
                onClick={handleRappelPaiement}
                disabled={sendingRappel}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                <BellRing size={13} />
                {sendingRappel ? 'Envoi...' : 'Envoyer un rappel de paiement'}
              </button>
              {rappelMsg && <p className="text-xs text-gray-500 mt-1">{rappelMsg}</p>}
            </div>
          )}
        </div>

        {/* Historique des statuts */}
        {facture.historique_statuts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Historique des statuts</h3>
            <div className="divide-y divide-gray-50">
              {[...facture.historique_statuts].reverse().map((h, i) => (
                <div key={i} className="flex justify-between py-2 text-sm">
                  <span className="text-gray-800">{LABELS_STATUT_REPARATION[h.statut]}</span>
                  <span className="text-gray-400 text-xs">{h.date.replace('T', ' ').slice(0, 16)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Annulation */}
        {!facture.annulee && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {!showAnnuler ? (
              <button
                onClick={() => setShowAnnuler(true)}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800"
              >
                <Ban size={15} /> Annuler la facture
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  La facture ne sera pas supprimée : elle restera visible avec le statut « annulée ».
                </p>
                <input
                  type="text"
                  value={raisonAnnulation}
                  onChange={(e) => setRaisonAnnulation(e.target.value)}
                  placeholder="Raison (optionnel)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAnnuler}
                    disabled={cancelling}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {cancelling ? 'Annulation...' : "Confirmer l'annulation"}
                  </button>
                  <button
                    onClick={() => setShowAnnuler(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler (fermer)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
