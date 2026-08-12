import { Role } from '@/contexts/AuthContext';

/**
 * Routes restreintes par rôle (Module 13). Toute route absente de cette table est accessible à
 * tout rôle authentifié — Clients/Véhicules/Devis/Factures sont visibles par tous, en lecture
 * seule pour Comptable côté backend (403 sur les actions d'écriture, non répliqué ici en détail).
 */
const ROUTE_ROLES: Record<string, Role[]> = {
  '/parametres': ['admin'],
  '/utilisateurs': ['admin'],
  '/export-comptable': ['admin', 'comptable'],
  '/pieces': ['admin', 'gestionnaire'],
  '/services': ['admin', 'gestionnaire'],
  '/fournisseurs': ['admin', 'gestionnaire'],
  '/commandes-fournisseur': ['admin', 'gestionnaire'],
  '/commandes-speciales': ['admin', 'gestionnaire'],
  '/rendez-vous': ['admin', 'gestionnaire'],
  '/rappels-entretien': ['admin', 'gestionnaire'],
  '/promotions': ['admin', 'gestionnaire'],
  '/notifications': ['admin', 'gestionnaire'],
  '/dashboard': ['admin', 'gestionnaire'],
};

/** Retourne les rôles autorisés pour ce chemin, ou null si accessible à tout rôle authentifié. */
export function rolesAllowedFor(pathname: string): Role[] | null {
  for (const [prefix, roles] of Object.entries(ROUTE_ROLES)) {
    if (pathname.startsWith(prefix)) return roles;
  }
  return null;
}

export function isRouteAllowed(pathname: string, role: Role | null): boolean {
  const roles = rolesAllowedFor(pathname);
  if (!roles) return true;
  return role !== null && roles.includes(role);
}

/** Page d'atterrissage par défaut après connexion, selon le rôle. */
export function defaultRouteFor(role: Role | null): string {
  return role === 'comptable' ? '/export-comptable' : '/dashboard';
}
