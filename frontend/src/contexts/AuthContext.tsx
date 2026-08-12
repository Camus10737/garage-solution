'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import api from '@/lib/api';
import { RoleUtilisateur } from '@/types';

export type Role = RoleUtilisateur;

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  role: Role | null;
  roleLoading: boolean;
  garageNom: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (nomUtilisateur: string, nomGarage: string, email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [garageNom, setGarageNom] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser) {
        setRole(null);
        setGarageNom(null);
        setRoleLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setRoleLoading(true);
    api.get('/auth/moi')
      .then((r) => {
        setRole(r.data.role);
        setGarageNom(r.data.garage_nom);
      })
      .catch(() => {
        setRole(null);
        setGarageNom(null);
      })
      .finally(() => setRoleLoading(false));
  }, [user]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const signup = async (nomUtilisateur: string, nomGarage: string, email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    await api.post('/garages', { nom_utilisateur: nomUtilisateur, nom_garage: nomGarage });
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, roleLoading, garageNom, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
