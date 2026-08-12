'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wrench,
  Settings,
  FileText,
  ClipboardList,
  Bell,
  Truck,
  Package,
  PackageSearch,
  SlidersHorizontal,
  Calculator,
  BellRing,
  Megaphone,
  CalendarClock,
  UserCog,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { rolesAllowedFor } from '@/lib/permissions';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/pieces', label: 'Pièces', icon: Settings },
  { href: '/services', label: 'Services', icon: Wrench },
  { href: '/fournisseurs', label: 'Fournisseurs', icon: Truck },
  { href: '/commandes-fournisseur', label: 'Commandes fournisseur', icon: Package },
  { href: '/commandes-speciales', label: 'Commandes spéciales', icon: PackageSearch },
  { href: '/devis', label: 'Devis', icon: ClipboardList },
  { href: '/factures', label: 'Factures', icon: FileText },
  { href: '/rendez-vous', label: 'Rendez-vous', icon: CalendarClock },
  { href: '/export-comptable', label: 'Export comptable', icon: Calculator },
  { href: '/rappels-entretien', label: "Rappels d'entretien", icon: BellRing },
  { href: '/promotions', label: 'Promotions', icon: Megaphone },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/utilisateurs', label: 'Utilisateurs', icon: UserCog },
  { href: '/parametres', label: 'Paramètres', icon: SlidersHorizontal },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, role } = useAuth();

  const items = navItems.filter(({ href }) => {
    const roles = rolesAllowedFor(href);
    return !roles || (role !== null && roles.includes(role));
  });

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">Garage Pro</h1>
        <p className="text-xs text-gray-400 mt-1">Gestion de garage</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
