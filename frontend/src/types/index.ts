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
  vin?: string;
  kilometrage_actuel?: number;
  notes?: string;
  date_creation: string;
}

export interface FournisseurPiece {
  fournisseur_id: string;
  prix_achat: number;
  delai_livraison?: string;
}

export interface Piece {
  piece_id: string;
  nom: string;
  prix: number;
  active: boolean;
  quantite?: number;
  fournie_par_client: boolean;
  numero_item?: string;
  categorie?: string;
  emplacement?: string;
  seuil_alerte?: number;
  fournisseurs: FournisseurPiece[];
}

export interface Service {
  service_id: string;
  nom: string;
  prix: number;
  active: boolean;
}

export interface Fournisseur {
  fournisseur_id: string;
  nom: string;
  telephone?: string;
  email?: string;
  notes?: string;
  active: boolean;
  date_creation: string;
}

export type TypeMouvement = 'entree' | 'sortie';
export type SourceMouvement = 'reception_fournisseur' | 'facture' | 'commande_speciale';

export interface MouvementStock {
  mouvement_id: string;
  piece_id: string;
  type: TypeMouvement;
  quantite: number;
  source: SourceMouvement;
  reference_id?: string;
  date: string;
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

export interface LigneDevisMainOeuvre {
  description: string;
  heures: number;
  taux_horaire: number;
}

export type StatutDevis = 'brouillon' | 'en_attente' | 'accepte' | 'refuse';

export interface Devis {
  devis_id: string;
  numero_devis?: string;
  client_id: string;
  client_nom?: string;
  vehicule_id?: string;
  vehicule_info?: Vehicule;
  pieces: LigneFacturePiece[];
  services: LigneFactureService[];
  main_oeuvre: LigneDevisMainOeuvre[];
  total_pieces: number;
  total_services: number;
  total_main_oeuvre: number;
  taxes: number;
  total_devis: number;
  date_creation: string;
  statut: StatutDevis;
  converti: boolean;
  facture_id?: string;
  pdf_url?: string;
  notes?: string;
}

export type MethodePaiement = 'comptant' | 'carte' | 'virement' | 'cheque';
export type StatutPaiement = 'non_paye' | 'partiellement_paye' | 'paye';

export interface Paiement {
  montant: number;
  methode: MethodePaiement;
  date: string;
}

export type StatutReparation = 'en_attente' | 'en_attente_piece' | 'en_cours' | 'fini';

export interface HistoriqueStatut {
  statut: StatutReparation;
  date: string;
}

export interface Facture {
  facture_id: string;
  numero_facture?: string;
  devis_id?: string;
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
  statut_reparation: StatutReparation;
  historique_statuts: HistoriqueStatut[];
  mecanicien_nom?: string;
  statut_paiement: StatutPaiement;
  paiements: Paiement[];
  montant_paye: number;
  solde_restant: number;
  annulee: boolean;
  raison_annulation?: string;
  date_annulation?: string;
  pdf_url?: string;
  notes?: string;
  // Champs legacy (anciennes factures)
  vehicule?: string;
  annee?: string;
  taille_moteur?: string;
  autre?: string;
}

export type CanalNotification = 'sms' | 'email' | 'les_deux';
export type TypeNotificationAuto = 'statut_reparation' | 'piece_recue' | 'rappel_paiement' | 'rappel_entretien' | 'rdv_confirme' | 'rdv_rappel';

export interface HoraireJour {
  ouvert: boolean;
  heure_debut?: string;
  heure_fin?: string;
}

export interface PlageBloquee {
  date_debut: string;
  date_fin: string;
  raison?: string;
}

export const JOURS_SEMAINE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;

export interface Parametres {
  taux_horaire_defaut: number;
  canaux_notification: Partial<Record<TypeNotificationAuto, CanalNotification>>;
  horaires_ouverture: Partial<Record<typeof JOURS_SEMAINE[number], HoraireJour>>;
  nombre_baies: number;
  duree_rdv_minutes: number;
  plages_bloquees: PlageBloquee[];
}

export interface ResumeComptable {
  date_debut: string;
  date_fin: string;
  revenus_payes: number;
  revenus_en_attente: number;
  revenus_annules: number;
  tps_collectee: number;
  tvq_collectee: number;
  taxes_totales: number;
  depenses_fournisseurs_payees: number;
  depenses_fournisseurs_dues: number;
  profit_net_approximatif: number;
  comptes_a_recevoir: number;
  comptes_a_payer: number;
  nombre_factures: number;
  nombre_commandes_fournisseur: number;
}

export type StatutCommandeFournisseur = 'commandee' | 'partiellement_recue' | 'recue';

export interface LigneCommandeFournisseur {
  piece_id: string;
  nom: string;
  quantite_commandee: number;
  quantite_recue: number;
  prix_achat: number;
}

export interface CommandeFournisseur {
  commande_id: string;
  numero_commande?: string;
  fournisseur_id: string;
  fournisseur_nom?: string;
  lignes: LigneCommandeFournisseur[];
  montant_total: number;
  paiements: Paiement[];
  montant_paye: number;
  solde_restant: number;
  statut_paiement: StatutPaiement;
  statut: StatutCommandeFournisseur;
  commande_speciale_id?: string;
  notes?: string;
  date_commande: string;
  date_derniere_reception?: string;
}

export type StatutCommandeSpeciale = 'commandee' | 'en_transit' | 'recue';

export interface CommandeSpeciale {
  commande_speciale_id: string;
  client_id: string;
  client_nom?: string;
  vehicule_id: string;
  devis_id?: string;
  piece_id: string;
  piece_nom: string;
  quantite: number;
  fournisseur_id: string;
  fournisseur_nom?: string;
  prix_achat: number;
  statut: StatutCommandeSpeciale;
  notes?: string;
  date_commande: string;
  date_reception?: string;
}

export type Canal = 'sms' | 'whatsapp' | 'email';

export interface Notification {
  notification_id: string;
  client_id: string;
  client_nom?: string;
  facture_id?: string;
  devis_id?: string;
  commande_speciale_id?: string;
  vehicule_id?: string;
  promotion_id?: string;
  type: 'vehicule_pret' | 'rappel_entretien' | 'devis_envoye' | 'statut_reparation' | 'piece_recue' | 'facture_envoyee' | 'rappel_paiement' | 'promotion';
  message: string;
  canal: Canal;
  statut: 'envoye' | 'recu' | 'echoue';
  date_envoi: string;
}

export type TypeDeclencheur = 'km' | 'date' | 'les_deux';

export interface ModeleRappel {
  modele_id: string;
  nom: string;
  type_declencheur: TypeDeclencheur;
  valeur_km?: number;
  valeur_mois?: number;
  message: string;
  promotion_id?: string;
  actif: boolean;
  date_creation: string;
}

export interface RappelDu {
  vehicule_id: string;
  vehicule_label: string;
  client_id: string;
  client_nom: string;
  client_telephone: string;
  modele_id: string;
  modele_nom: string;
  raison: string;
}

export type MethodeEnvoiPromo = 'sms' | 'email' | 'les_deux';
export type StatutPromotion = 'brouillon' | 'envoyee' | 'annulee';

export interface Promotion {
  promotion_id: string;
  titre: string;
  description: string;
  date_debut: string;
  date_fin: string;
  cible_tous: boolean;
  client_ids: string[];
  methode_envoi: MethodeEnvoiPromo;
  statut: StatutPromotion;
  date_envoi?: string;
  date_creation: string;
}

export type StatutRendezVous = 'confirme' | 'complete' | 'annule';

export interface RendezVous {
  rendez_vous_id: string;
  client_id: string;
  client_nom: string;
  client_telephone: string;
  client_email?: string;
  vehicule_id: string;
  vehicule_marque_modele: string;
  vehicule_annee?: string;
  type_service: string;
  description?: string;
  date_heure: string;
  statut: StatutRendezVous;
  rappel_envoye: boolean;
  date_creation: string;
}

export interface CreneauDisponible {
  date_heure: string;
}

export type RoleUtilisateur = 'admin' | 'gestionnaire' | 'comptable';

export interface Utilisateur {
  uid: string;
  nom: string;
  email: string;
  telephone?: string;
  garage_id: string;
  role: RoleUtilisateur;
  actif: boolean;
  date_creation: string;
}

export interface Garage {
  garage_id: string;
  nom: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  province?: string;
  logo_url?: string;
  numero_tps?: string;
  numero_tvq?: string;
  date_creation: string;
}
