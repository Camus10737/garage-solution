'use client';

import { useEffect, useState } from 'react';
import Select from 'react-select';
import { Client, Vehicule, Piece, Service, LigneFacturePiece, LigneFactureService } from '@/types';
import api from '@/lib/api';
import { Plus, Trash2, UserPlus, Car } from 'lucide-react';
import Drawer from '@/components/ui/Drawer';
import ClientForm, { ClientFormData } from '@/components/clients/ClientForm';
import VehiculeForm, { VehiculeFormData } from '@/components/vehicules/VehiculeForm';
import PieceForm, { PieceFormData } from '@/components/pieces/PieceForm';
import ServiceForm, { ServiceFormData } from '@/components/services/ServiceForm';

const TAUX_TAXES = 0.14975;

export interface FactureFormData {
  client_id: string;
  vehicule_id: string;
  pieces: LigneFacturePiece[];
  services: LigneFactureService[];
  notes: string;
}

interface Props {
  onSubmit: (data: FactureFormData) => Promise<void>;
  loading?: boolean;
  defaultClientId?: string;
}

export default function FactureForm({ onSubmit, loading, defaultClientId }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [clientId, setClientId] = useState(defaultClientId || '');
  const [vehiculeId, setVehiculeId] = useState('');
  const [lignesPieces, setLignesPieces] = useState<LigneFacturePiece[]>([]);
  const [lignesServices, setLignesServices] = useState<LigneFactureService[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loadingVehicules, setLoadingVehicules] = useState(false);

  const [drawerClient, setDrawerClient] = useState(false);
  const [drawerVehicule, setDrawerVehicule] = useState(false);
  const [drawerPiece, setDrawerPiece] = useState(false);
  const [drawerService, setDrawerService] = useState(false);
  const [savingSub, setSavingSub] = useState(false);

  const loadBaseData = () =>
    Promise.all([api.get('/clients'), api.get('/pieces'), api.get('/services')])
      .then(([c, p, s]) => {
        setClients(c.data.filter((x: Client) => x.active));
        setPieces(p.data.filter((x: Piece) => x.active));
        setServices(s.data.filter((x: Service) => x.active));
      })
      .catch(() => {});

  const loadVehicules = (cid: string) => {
    if (!cid) { setVehicules([]); setVehiculeId(''); return; }
    setLoadingVehicules(true);
    api.get(`/vehicules?client_id=${cid}`)
      .then((r) => {
        setVehicules(r.data);
        // Auto-sélectionner si un seul véhicule
        if (r.data.length === 1) setVehiculeId(r.data[0].vehicule_id);
        else setVehiculeId('');
      })
      .catch(() => {})
      .finally(() => setLoadingVehicules(false));
  };

  useEffect(() => { loadBaseData(); }, []);

  useEffect(() => {
    if (defaultClientId) loadVehicules(defaultClientId);
  }, [defaultClientId]);

  const selectStyles = {
    control: (base: object) => ({
      ...base,
      borderColor: '#d1d5db',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      minHeight: '38px',
      boxShadow: 'none',
      '&:hover': { borderColor: '#3b82f6' },
    }),
    option: (base: object, state: { isSelected: boolean; isFocused: boolean }) => ({
      ...base,
      fontSize: '0.875rem',
      backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : 'white',
      color: state.isSelected ? 'white' : '#111827',
    }),
  };

  const clientOptions = clients.map((c) => ({
    value: c.client_id,
    label: `${c.nom} — ${c.telephone}`,
  }));

  const vehiculeOptions = vehicules.map((v) => ({
    value: v.vehicule_id,
    label: [v.marque_modele, v.annee, v.plaque].filter(Boolean).join(' • '),
  }));

  const pieceOptions = pieces.map((p) => ({
    value: p.piece_id,
    label: `${p.nom} — ${p.prix.toFixed(2)} $`,
    data: p,
  }));

  const serviceOptions = services.map((s) => ({
    value: s.service_id,
    label: `${s.nom} — ${s.prix.toFixed(2)} $`,
    data: s,
  }));

  const addPiece = (pieceId: string) => {
    const found = pieces.find((p) => p.piece_id === pieceId);
    if (!found) return;
    setLignesPieces((prev) => [
      ...prev,
      { piece_id: found.piece_id, nom: found.nom, prix: found.prix, quantite: 1, fournie_par_client: false },
    ]);
  };

  const updatePieceLigne = (index: number, field: keyof LigneFacturePiece, value: string | number | boolean) => {
    setLignesPieces((prev) => {
      const updated = [...prev];
      if (field === 'piece_id') {
        const found = pieces.find((p) => p.piece_id === value);
        if (found) updated[index] = { ...updated[index], piece_id: found.piece_id, nom: found.nom, prix: found.prix };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const addService = (serviceId: string) => {
    const found = services.find((s) => s.service_id === serviceId);
    if (!found) return;
    setLignesServices((prev) => [
      ...prev,
      { service_id: found.service_id, nom: found.nom, prix: found.prix },
    ]);
  };

  const updateServiceLigne = (index: number, serviceId: string) => {
    const found = services.find((s) => s.service_id === serviceId);
    if (!found) return;
    setLignesServices((prev) => {
      const updated = [...prev];
      updated[index] = { service_id: found.service_id, nom: found.nom, prix: found.prix };
      return updated;
    });
  };

  const handleAddClient = async (data: ClientFormData) => {
    setSavingSub(true);
    try {
      const res = await api.post('/clients', data);
      await loadBaseData();
      setClientId(res.data.client_id);
      loadVehicules(res.data.client_id);
      setDrawerClient(false);
    } catch { /* silencieux */ }
    finally { setSavingSub(false); }
  };

  const handleAddVehicule = async (data: VehiculeFormData) => {
    setSavingSub(true);
    try {
      const res = await api.post('/vehicules', { ...data, client_id: clientId });
      setVehicules((prev) => [...prev, res.data]);
      setVehiculeId(res.data.vehicule_id);
      setDrawerVehicule(false);
    } catch { /* silencieux */ }
    finally { setSavingSub(false); }
  };

  const handleAddPiece = async (data: PieceFormData) => {
    setSavingSub(true);
    try {
      const res = await api.post('/pieces', data);
      await loadBaseData();
      addPiece(res.data.piece_id);
      setDrawerPiece(false);
    } catch { /* silencieux */ }
    finally { setSavingSub(false); }
  };

  const handleAddService = async (data: ServiceFormData) => {
    setSavingSub(true);
    try {
      const res = await api.post('/services', data);
      await loadBaseData();
      addService(res.data.service_id);
      setDrawerService(false);
    } catch { /* silencieux */ }
    finally { setSavingSub(false); }
  };

  const totalPieces = lignesPieces
    .filter((p) => !p.fournie_par_client)
    .reduce((sum, p) => sum + p.prix * p.quantite, 0);
  const totalServices = lignesServices.reduce((sum, s) => sum + s.prix, 0);
  const sousTotal = totalPieces + totalServices;
  const taxes = sousTotal * TAUX_TAXES;
  const total = sousTotal + taxes;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError('Veuillez sélectionner un client.'); return; }
    if (!vehiculeId) { setError('Veuillez sélectionner un véhicule.'); return; }
    setError('');
    await onSubmit({ client_id: clientId, vehicule_id: vehiculeId, pieces: lignesPieces, services: lignesServices, notes });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Client */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">
              Client <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setDrawerClient(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <UserPlus size={13} /> Ajouter client
            </button>
          </div>
          <Select
            options={clientOptions}
            value={clientOptions.find((o) => o.value === clientId) || null}
            onChange={(opt) => {
              const selectedId = opt?.value || '';
              setClientId(selectedId);
              loadVehicules(selectedId);
            }}
            placeholder="Rechercher un client..."
            isClearable
            styles={selectStyles}
            noOptionsMessage={() => 'Aucun client trouvé'}
          />
        </div>

        {/* Véhicule */}
        {clientId && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                Véhicule <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setDrawerVehicule(true)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              >
                <Car size={13} /> Ajouter véhicule
              </button>
            </div>
            {loadingVehicules ? (
              <p className="text-xs text-gray-400">Chargement véhicules...</p>
            ) : vehicules.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                Aucun véhicule pour ce client.{' '}
                <button
                  type="button"
                  onClick={() => setDrawerVehicule(true)}
                  className="underline font-medium"
                >
                  Ajouter un véhicule
                </button>
              </div>
            ) : (
              <Select
                options={vehiculeOptions}
                value={vehiculeOptions.find((o) => o.value === vehiculeId) || null}
                onChange={(opt) => setVehiculeId(opt?.value || '')}
                placeholder="Sélectionner un véhicule..."
                isClearable
                styles={selectStyles}
                noOptionsMessage={() => 'Aucun véhicule trouvé'}
              />
            )}
          </div>
        )}

        {/* Pièces */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Pièces</label>
            <button
              type="button"
              onClick={() => setDrawerPiece(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <Plus size={13} /> Nouvelle pièce
            </button>
          </div>
          <Select
            options={pieceOptions}
            value={null}
            onChange={(opt) => opt && addPiece(opt.value)}
            placeholder="Rechercher et ajouter une pièce..."
            styles={selectStyles}
            noOptionsMessage={() => 'Aucune pièce trouvée'}
          />
          {lignesPieces.length > 0 && (
            <div className="mt-2 space-y-2">
              {lignesPieces.map((ligne, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="flex-1 text-xs text-gray-800 truncate">{ligne.nom}</span>
                  <input
                    type="number"
                    min={1}
                    value={ligne.quantite}
                    onChange={(e) => updatePieceLigne(i, 'quantite', Number(e.target.value))}
                    className="w-12 border border-gray-300 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={ligne.fournie_par_client}
                      onChange={(e) => updatePieceLigne(i, 'fournie_par_client', e.target.checked)}
                      className="w-3 h-3"
                    />
                    Client
                  </label>
                  <span className="text-xs font-medium text-gray-700 w-14 text-right">
                    {ligne.fournie_par_client ? '—' : `${(ligne.prix * ligne.quantite).toFixed(2)} $`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLignesPieces((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Services */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Services</label>
            <button
              type="button"
              onClick={() => setDrawerService(true)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <Plus size={13} /> Nouveau service
            </button>
          </div>
          <Select
            options={serviceOptions}
            value={null}
            onChange={(opt) => opt && addService(opt.value)}
            placeholder="Rechercher et ajouter un service..."
            styles={selectStyles}
            noOptionsMessage={() => 'Aucun service trouvé'}
          />
          {lignesServices.length > 0 && (
            <div className="mt-2 space-y-2">
              {lignesServices.map((ligne, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Select
                    options={serviceOptions}
                    value={serviceOptions.find((o) => o.value === ligne.service_id) || null}
                    onChange={(opt) => opt && updateServiceLigne(i, opt.value)}
                    styles={selectStyles}
                    className="flex-1"
                  />
                  <span className="text-xs font-medium text-gray-700 w-16 text-right">
                    {ligne.prix.toFixed(2)} $
                  </span>
                  <button
                    type="button"
                    onClick={() => setLignesServices((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes internes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes internes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Visible uniquement par le mécanicien..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Totaux */}
        <div className="border-t border-gray-100 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Pièces</span><span>{totalPieces.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Services</span><span>{totalServices.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Taxes (TPS+TVQ)</span><span>{taxes.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
            <span>Total</span><span>{total.toFixed(2)} $</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Création...' : 'Créer la facture'}
        </button>
      </form>

      <Drawer open={drawerClient} onClose={() => setDrawerClient(false)} title="Nouveau client">
        <ClientForm onSubmit={handleAddClient} loading={savingSub} />
      </Drawer>

      <Drawer open={drawerVehicule} onClose={() => setDrawerVehicule(false)} title="Nouveau véhicule">
        <VehiculeForm onSubmit={handleAddVehicule} loading={savingSub} />
      </Drawer>

      <Drawer open={drawerPiece} onClose={() => setDrawerPiece(false)} title="Nouvelle pièce">
        <PieceForm onSubmit={handleAddPiece} loading={savingSub} />
      </Drawer>

      <Drawer open={drawerService} onClose={() => setDrawerService(false)} title="Nouveau service">
        <ServiceForm onSubmit={handleAddService} loading={savingSub} />
      </Drawer>
    </>
  );
}
