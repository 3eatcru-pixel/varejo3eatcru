import React, { useState } from 'react';
import { 
  X, 
  User, 
  ShieldCheck, 
  Laptop, 
  Building2, 
  LogOut, 
  Lock, 
  Mail,
  KeyRound,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ProfileTab from './ProfileTab';
import SecurityTab from './SecurityTab';
import SessionsTab from './SessionsTab';
import WorkspacesTab from './WorkspacesTab';

export type AccountTabId = 'profile' | 'security' | 'sessions' | 'workspaces';

interface AccountCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AccountTabId;
}

export default function AccountCenterModal({ isOpen, onClose, initialTab = 'profile' }: AccountCenterModalProps) {
  const { firebaseUser, logout } = useAuth();
  const { account, profile, isPlatformAdmin, platformRole } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountTabId>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-lg shadow-emerald-500/20">
              {profile?.fullName?.charAt(0)?.toUpperCase() || account?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider text-white">
                  {profile?.fullName || account?.displayName || 'Minha Conta'}
                </h2>
                {isPlatformAdmin && (
                  <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Plataforma {platformRole || 'ADMIN'}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                {account?.email || firebaseUser?.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'profile'
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            Meu Perfil
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'security'
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Segurança & Senha
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'sessions'
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Laptop className="w-4 h-4" />
            Sessões & Dispositivos
          </button>

          <button
            onClick={() => setActiveTab('workspaces')}
            className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'workspaces'
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Minhas Empresas
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'sessions' && <SessionsTab />}
          {activeTab === 'workspaces' && <WorkspacesTab />}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>

          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-2xl transition-all shadow-md"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
