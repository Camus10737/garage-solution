'use client';

import { use, useEffect, useState } from 'react';
import api from '@/lib/api';
import { CreneauDisponible } from '@/types';
import { Calendar, Clock, CheckCircle, Wrench, Phone } from 'lucide-react';

interface GaragePublic {
  nom: string;
  adresse?: string;
  telephone?: string;
  logo_url?: string;
}

const TYPES_SERVICE = [
  "Changement d'huile",
  'Pneus (montage / saisonnier)',
  'Freins',
  'Diagnostic',
  'Entretien général',
  'Autre',
];

const fmt = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const prochainsJours = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d;
});

export default function ReserverPage({ params }: { params: Promise<{ garageId: string }> }) {
  const { garageId } = use(params);

  const [garage, setGarage] = useState<GaragePublic | null>(null);

  const [jourChoisi, setJourChoisi] = useState(fmt(prochainsJours[0]));
  const [creneaux, setCreneaux] = useState<CreneauDisponible[]>([]);
  const [loadingCreneaux, setLoadingCreneaux] = useState(true);
  const [creneauChoisi, setCreneauChoisi] = useState<string | null>(null);

  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicule, setVehicule] = useState('');
  const [annee, setAnnee] = useState('');
  const [typeService, setTypeService] = useState(TYPES_SERVICE[0]);
  const [description, setDescription] = useState('');

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [confirme, setConfirme] = useState(false);

  useEffect(() => {
    api.get(`/garage/${garageId}/public`)
      .then((r) => setGarage(r.data))
      .catch(() => setGarage(null));
  }, [garageId]);

  useEffect(() => {
    setLoadingCreneaux(true);
    setCreneauChoisi(null);
    api.get('/rendez-vous/creneaux-disponibles', { params: { garage_id: garageId, date_debut: jourChoisi, date_fin: jourChoisi } })
      .then((r) => setCreneaux(r.data))
      .catch(() => setCreneaux([]))
      .finally(() => setLoadingCreneaux(false));
  }, [garageId, jourChoisi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creneauChoisi) { setErreur('Veuillez choisir un créneau.'); return; }
    if (!nom || !telephone || !vehicule) { setErreur('Veuillez remplir les champs obligatoires.'); return; }
    setEnvoi(true);
    setErreur('');
    try {
      await api.post('/rendez-vous', {
        client_nom: nom,
        client_telephone: telephone,
        client_email: email || null,
        vehicule_marque_modele: vehicule,
        vehicule_annee: annee || null,
        type_service: typeService,
        description: description || null,
        date_heure: creneauChoisi,
      }, { params: { garage_id: garageId } });
      setConfirme(true);
    } catch (err: any) {
      setErreur(err?.response?.data?.detail || 'Ce créneau vient peut-être d\'être pris. Veuillez réessayer.');
    } finally {
      setEnvoi(false);
    }
  };

  if (confirme) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Rendez-vous confirmé</h1>
          <p className="text-gray-600 text-sm mb-1">
            {new Date(creneauChoisi!).toLocaleString('fr-CA', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
          <p className="text-gray-500 text-sm mt-4">
            Une confirmation vous a été envoyée.
            {garage?.telephone && ` Pour toute question, contactez-nous au ${garage.telephone}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white py-8 px-6 text-center">
        {garage?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={garage.logo_url} alt={garage.nom} className="w-16 h-16 object-contain rounded-lg mx-auto mb-3 bg-white p-1" />
        )}
        <h1 className="text-2xl font-bold">{garage?.nom || 'Chargement...'}</h1>
        {garage?.adresse && <p className="text-sm text-gray-300 mt-1">{garage.adresse}</p>}
        {garage?.telephone && (
          <p className="text-sm text-gray-300 flex items-center justify-center gap-1.5 mt-1">
            <Phone size={13} /> {garage.telephone}
          </p>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-800 text-center">Prendre rendez-vous</h2>

        {/* Sélecteur de jour */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3 text-gray-700 font-medium text-sm">
            <Calendar size={15} /> Choisir une date
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {prochainsJours.map((d) => {
              const iso = fmt(d);
              return (
                <button
                  key={iso}
                  onClick={() => setJourChoisi(iso)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    jourChoisi === iso ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' })}
                </button>
              );
            })}
          </div>
        </div>

        {/* Créneaux */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3 text-gray-700 font-medium text-sm">
            <Clock size={15} /> Choisir une heure
          </div>
          {loadingCreneaux ? (
            <p className="text-sm text-gray-400">Chargement...</p>
          ) : creneaux.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun créneau disponible ce jour-là. Essayez une autre date.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {creneaux.map((c) => (
                <button
                  key={c.date_heure}
                  onClick={() => setCreneauChoisi(c.date_heure)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    creneauChoisi === c.date_heure ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {new Date(c.date_heure).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Formulaire */}
        {creneauChoisi && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
              <Wrench size={15} /> Vos informations
            </div>

            {erreur && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{erreur}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nom complet *</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone *</label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Courriel (optionnel)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Véhicule (marque / modèle) *</label>
                <input
                  type="text"
                  value={vehicule}
                  onChange={(e) => setVehicule(e.target.value)}
                  placeholder="Ex : Toyota Camry"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Année</label>
                <input
                  type="text"
                  value={annee}
                  onChange={(e) => setAnnee(e.target.value)}
                  placeholder="Ex : 2019"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type de service</label>
              <select
                value={typeService}
                onChange={(e) => setTypeService(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TYPES_SERVICE.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Décrivez le problème (optionnel)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={envoi}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {envoi ? 'Confirmation...' : 'Confirmer le rendez-vous'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
