'use client';

import { useAuth } from '@/contexts/AuthContext';
import { User } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <User size={16} />
        <span>{user?.email}</span>
      </div>
    </header>
  );
}
