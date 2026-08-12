'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { CanalNotification, Garage, HoraireJour, JOURS_SEMAINE, Parametres, PlageBloquee, TypeNotificationAuto } from '@/types';
import api from '@/lib/api';
import { Save, Copy, Plus, Trash2, Upload } from 'lucide-react';

const PROVINCES = ['QC', 'ON', 'NB', 'NS', 'PE', 'MB', 'SK', 'AB', 'BC', 'NL', 'YT', 'NT', 'NU'];

const LABELS_TYPE: Record<TypeNotificationAuto, string> = {
  statut_reparation: 'Changement de statut de réparation',
  piece_recue: 'Pièce reçue (commande spéciale)',
  rappel_paiement: 'Rappel de paiement',
  rappel_entretien: "Rappel d'entretien",
  rdv_confirme: 'Confirmation de rendez-vous',
  rdv_rappel: 'Rappel de rendez-vous (24h avant)',
};

const LABELS_CANAL: Record<CanalNotification, string> = {
  sms: 'SMS',
  email: 'Courriel',
  les_deux: 'Les deux',
};

const LABELS_JOUR: Record<typeof JOURS_SEMAINE[number], string> = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  mercredi: 'Mercredi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
  samedi: 'Samedi',
  dimanche: 'Dimanche',
};

const HORAIRE_VIDE: HoraireJour = { ouvert: false, heure_debut: '08:00', heure_fin: '17:00' };

export default function ParametresPage() {
  const [tauxHoraire, setTauxHoraire] = useState(95);
  const [canaux, setCanaux] = useState<Partial<Record<TypeNotificationAuto, CanalNotification>>>({});
  const [horaires, setHoraires] = useState<Partial<Record<typeof JOURS_SEMAINE[number], HoraireJour>>>({});
  const [nombreBaies, setNombreBaies] = useState(1);
  const [dureeRdv, setDureeRdv] = useState(60);
  const [plagesBloquees, setPlagesBloquees] = useState<PlageBloquee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [lienCopie, setLienCopie] = useState(false);

  const [garage, setGarage] = useState<Garage | null>(null);
  const [garageNom, setGarageNom] = useState('');
  const [garageAdresse, setGarageAdresse] = useState('');
  const [garageTelephone, setGarageTelephone] = useState('');
  const [garageEmail, setGarageEmail] = useState('');
  const [garageProvince, setGarageProvince] = useState('');
  const [savingGarage, setSavingGarage] = useState(false);
  const [garageSaved, setGarageSaved] = useState(false);
  const [garageError, setGarageError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    api.get('/parametres')
      .then((r) => {
        const p: Parametres = r.data;
        setTauxHoraire(p.taux_horaire_defaut);
        setCanaux(p.canaux_notification || {});
        setHoraires(p.horaires_ouverture || {});
        setNombreBaies(p.nombre_baies ?? 1);
        setDureeRdv(p.duree_rdv_minutes ?? 60);
        setPlagesBloquees(p.plages_bloquees || []);
      })
      .catch(() => setError('Erreur lors du chargement des paramètres.'))
      .finally(() => setLoading(false));

    api.get('/garage')
      .then((r) => {
        const g: Garage = r.data;
        setGarage(g);
        setGarageNom(g.nom || '');
        setGarageAdresse(g.adresse || '');
        setGarageTelephone(g.telephone || '');
        setGarageEmail(g.email || '');
        setGarageProvince(g.province || '');
      })
      .catch(() => {});
  }, []);

  const garageId = garage?.garage_id ?? null;

  const handleSaveGarage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGarage(true);
    setGarageError('');
    setGarageSaved(false);
    try {
      const res = await api.put('/garage', {
        nom: garageNom,
        adresse: garageAdresse || null,
        telephone: garageTelephone || null,
        email: garageEmail || null,
        province: garageProvince || null,
      });
      setGarage(res.data);
      setGarageSaved(true);
    } catch {
      setGarageError("Erreur lors de l'enregistrement des infos du garage.");
    } finally {
      setSavingGarage(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setGarageError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/garage/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setGarage(res.data);
    } catch {
      setGarageError("Erreur lors de l'envoi du logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.put('/parametres', {
        taux_horaire_defaut: tauxHoraire,
        canaux_notification: canaux,
        horaires_ouverture: horaires,
        nombre_baies: nombreBaies,
        duree_rdv_minutes: dureeRdv,
        plages_bloquees: plagesBloquees,
      });
      setSaved(true);
    } catch {
      setError('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const updateHoraire = (jour: typeof JOURS_SEMAINE[number], champ: keyof HoraireJour, valeur: string | boolean) => {
    setHoraires((prev) => ({
      ...prev,
      [jour]: { ...HORAIRE_VIDE, ...prev[jour], [champ]: valeur },
    }));
  };

  const ajouterPlage = () => {
    setPlagesBloquees((prev) => [...prev, { date_debut: '', date_fin: '', raison: '' }]);
  };

  const updatePlage = (index: number, champ: keyof PlageBloquee, valeur: string) => {
    setPlagesBloquees((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [champ]: valeur };
      return next;
    });
  };

  const lienPublic = garageId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/reserver/${garageId}`
    : '';

  const copierLien = () => {
    navigator.clipboard.writeText(lienPublic).then(() => {
      setLienCopie(true);
      setTimeout(() => setLienCopie(false), 2000);
    });
  };

  if (loading) {
    return (
      <AppLayout title="Paramètres">
        <div className="text-gray-400 text-sm">Chargement...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Paramètres">
      <div className="max-w-xl space-y-4">
        <form onSubmit={handleSaveGarage} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
          <h3 className="font-semibold text-gray-800 mb-1">Infos du garage</h3>
          <p className="text-xs text-gray-400 mb-3">
            Affichées sur les devis, factures et communications avec tes clients.
          </p>

          {garageError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{garageError}</div>
          )}
          {garageSaved && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              Infos du garage enregistrées.
            </div>
          )}

          <div className="flex items-center gap-4">
            {garage?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={garage.logo_url} alt="Logo du garage" className="w-16 h-16 object-contain rounded-lg border border-gray-200" />
            )}
            <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">
              <Upload size={13} />
              {uploadingLogo ? 'Envoi...' : 'Changer le logo'}
              <input type="file" accept="image/*" onChange={handleUploadLogo} disabled={uploadingLogo} className="hidden" />
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nom du garage</label>
            <input
              type="text"
              value={garageNom}
              onChange={(e) => setGarageNom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Adresse</label>
            <input
              type="text"
              value={garageAdresse}
              onChange={(e) => setGarageAdresse(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={garageTelephone}
                onChange={(e) => setGarageTelephone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={garageEmail}
                onChange={(e) => setGarageEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Province</label>
            <select
              value={garageProvince}
              onChange={(e) => setGarageProvince(e.target.value)}
              className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">—</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {(garage?.numero_tps || garage?.numero_tvq) && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
              <p className="font-medium text-gray-600 mb-1">Numéros de taxes (configurés par le support)</p>
              {garage.numero_tps && <p>TPS : {garage.numero_tps}</p>}
              {garage.numero_tvq && <p>TVQ : {garage.numero_tvq}</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={savingGarage}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={15} />
            {savingGarage ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>

      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
            Paramètres enregistrés.
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Tarification</h3>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Taux horaire par défaut ($/h)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={tauxHoraire}
            onChange={(e) => setTauxHoraire(Number(e.target.value))}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Utilisé comme valeur de départ pour les lignes de main d&apos;œuvre dans les devis. Un
            changement ici n&apos;affecte pas les devis et factures déjà créés.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-1">Canal des notifications automatiques</h3>
          <p className="text-xs text-gray-400 mb-3">
            Choisis comment le client est averti pour chaque type d&apos;événement. Si le courriel est
            choisi mais que le client n&apos;a pas d&apos;adresse enregistrée, le SMS est utilisé à la place.
          </p>
          <div className="space-y-3">
            {(Object.keys(LABELS_TYPE) as TypeNotificationAuto[]).map((type) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{LABELS_TYPE[type]}</span>
                <select
                  value={canaux[type] || 'sms'}
                  onChange={(e) => setCanaux((prev) => ({ ...prev, [type]: e.target.value as CanalNotification }))}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(Object.keys(LABELS_CANAL) as CanalNotification[]).map((c) => (
                    <option key={c} value={c}>{LABELS_CANAL[c]}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-1">Rendez-vous en ligne</h3>
          <p className="text-xs text-gray-400 mb-3">
            Partage ce lien avec tes clients (site web, réseaux sociaux, fiche Google Business...).
          </p>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              readOnly
              value={lienPublic}
              placeholder="Chargement..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50"
            />
            <button
              type="button"
              onClick={copierLien}
              disabled={!lienPublic}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <Copy size={13} /> {lienCopie ? 'Copié !' : 'Copier'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de baies simultanées</label>
              <input
                type="number"
                min={1}
                value={nombreBaies}
                onChange={(e) => setNombreBaies(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Durée d&apos;un rendez-vous (min)</label>
              <input
                type="number"
                min={5}
                step={5}
                value={dureeRdv}
                onChange={(e) => setDureeRdv(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <p className="text-xs font-medium text-gray-700 mb-2">Heures d&apos;ouverture</p>
          <div className="space-y-2 mb-4">
            {JOURS_SEMAINE.map((jour) => {
              const h = horaires[jour] || HORAIRE_VIDE;
              return (
                <div key={jour} className="flex items-center gap-2 text-sm">
                  <label className="flex items-center gap-1.5 w-24 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={h.ouvert}
                      onChange={(e) => updateHoraire(jour, 'ouvert', e.target.checked)}
                      className="w-4 h-4"
                    />
                    {LABELS_JOUR[jour]}
                  </label>
                  {h.ouvert && (
                    <>
                      <input
                        type="time"
                        value={h.heure_debut || ''}
                        onChange={(e) => updateHoraire(jour, 'heure_debut', e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-gray-400 text-xs">à</span>
                      <input
                        type="time"
                        value={h.heure_fin || ''}
                        onChange={(e) => updateHoraire(jour, 'heure_fin', e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-700">Plages bloquées (congés, vacances)</p>
            <button
              type="button"
              onClick={ajouterPlage}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <Plus size={13} /> Ajouter
            </button>
          </div>
          {plagesBloquees.map((p, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-2">
              <input
                type="date"
                value={p.date_debut}
                onChange={(e) => updatePlage(i, 'date_debut', e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-xs">au</span>
              <input
                type="date"
                value={p.date_fin}
                onChange={(e) => updatePlage(i, 'date_fin', e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                value={p.raison || ''}
                onChange={(e) => updatePlage(i, 'raison', e.target.value)}
                placeholder="Raison (optionnel)"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setPlagesBloquees((prev) => prev.filter((_, idx) => idx !== i))}
                className="p-1 text-red-400 hover:text-red-600"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save size={15} />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
      </div>
    </AppLayout>
  );
}
