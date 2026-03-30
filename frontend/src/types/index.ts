export interface Client {
  client_id: string;
  nom: string;
  telephone: string;
  email?: string;
  adresse?: string;
  notes?: string;
  active: boolean;
  date_creation: string;
  // Champs legacy (anciens clients)
  vehicule?: string;
  annee?: string;
  taille_moteur?: string;
  autre?: string;
}

export interface Vehicule {
  vehicule_id: string;
  client_id: string;
  marque_modele: string;
  annee?: string;
  taille_moteur?: string;
  plaque?: string;
  notes?: string;
  date_creation: string;
}

export interface Piece {
  piece_id: string;
  nom: string;
  prix: number;
  active: boolean;
  quantite?: number;
  fournie_par_client: boolean;
}

export interface Service {
  service_id: string;
  nom: string;
  prix: number;
  active: boolean;
}

export interface LigneFacturePiece {
  piece_id: string;
  nom: string;
  prix: number;
  quantite: number;
  fournie_par_client: boolean;
}

export interface LigneFactureService {
  service_id: string;
  nom: string;
  prix: number;
}

export type StatutVehicule = 'en_cours' | 'pret';

export interface Facture {
  facture_id: string;
  numero_facture?: string;
  client_id: string;
  client_nom?: string;
  vehicule_id?: string;
  vehicule_info?: Vehicule;
  pieces: LigneFacturePiece[];
  services: LigneFactureService[];
  total_pieces: number;
  total_services: number;
  taxes: number;
  total_facture: number;
  date_creation: string;
  statut_vehicule: StatutVehicule;
  pdf_url?: string;
  notes?: string;
  // Champs legacy (anciennes factures)
  vehicule?: string;
  annee?: string;
  taille_moteur?: string;
  autre?: string;
}

export interface Notification {
  notification_id: string;
  client_id: string;
  client_nom?: string;
  facture_id: string;
  type: 'vehicule_pret' | 'rappel_entretien';
  message: string;
  statut: 'envoye' | 'recu' | 'echoue';
  date_envoi: string;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'garagiste';
}
