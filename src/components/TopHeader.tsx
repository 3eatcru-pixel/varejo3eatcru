import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  ChevronDown, 
  User, 
  Laptop, 
  LogOut, 
  Plus, 
  Sparkles,
  KeyRound,
  CheckCircle2,
  Menu,
  Wallet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useCompany } from '../contexts/CompanyContext';
import AccountCenterModal, { AccountTabId } from '../account/AccountCenterModal';

import { MenuTab } from './Sidebar';

interface TopHeaderProps {
  activeRegister: any;
  onOpenMobileDrawer?: () => void;
  onNavigate?: (tab: MenuTab) => void;
}

export default function TopHeader({ activeRegister, onOpenMobileDrawer, onNavigate }: TopHeaderProps) {
  const { userProfile, logout, account, profile, isPlatformAdmin } = useAuth();
  const { workspaces, activeWorkspace, activeBranchId, activeTerminalId, switchWorkspace, supportSession, endSupportSession } = useWorkspace();
  const { branding } = useCompany();

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [initialAccountTab, setInitialAccountTab] = useState<AccountTabId>('profile');
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setIsWorkspaceMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openAccountTab = (tab: AccountTabId) => {
    setInitialAccountTab(tab);
    setIsAccountModalOpen(true);
    setIsUserMenuOpen(false);
  };

  return (
    <>
      {/* Support Session Active Warning Banner */}
      {supportSession && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 sm:px-6 py-2 flex items-center justify-between text-xs font-black tracking-wide shadow-md shrink-0 z-30">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
            <span className="truncate">MODO SUPORTE: {supportSession.targetCompanyName || supportSession.targetCompanyId}</span>
          </div>
          <button
            type="button"
            onClick={() => endSupportSession()}
            className="min-h-[36px] px-3 py-1.5 bg-slate-950 text-white rounded-xl hover:bg-slate-900 font-black text-[11px] uppercase tracking-wider transition-all shrink-0"
          >
            Encerrar
          </button>
        </div>
      )}

      <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shrink-0 z-20">
        {/* Left: Mobile Drawer Trigger + Active Company Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Hamburger Button */}
          {onOpenMobileDrawer && (
            <button
              type="button"
              onClick={onOpenMobileDrawer}
              aria-label="Abrir Menu Lateral"
              className="md:hidden min-h-[48px] min-w-[48px] flex items-center justify-center -ml-1 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          <div className="relative" ref={workspaceRef}>
            <button
              type="button"
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className="min-h-[44px] flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-all font-bold text-xs max-w-[200px] sm:max-w-none"
            >
              <div 
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
                style={{ backgroundColor: branding?.colors?.primary || '#10b981' }}
              >
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="truncate font-black uppercase text-slate-900 tracking-wider text-[11px] sm:text-xs">
                {activeWorkspace?.tradeName || activeWorkspace?.name || branding?.tradeName || branding?.name || 'Minha Loja'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Workspace Dropdown */}
            {isWorkspaceMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-3xl border border-slate-200 shadow-2xl p-2 z-30 space-y-1 animate-in zoom-in-95">
                <div className="p-2 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Alternar Empresa ({workspaces.length})
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {workspaces.map(ws => {
                    const isSelected = activeWorkspace?.id === ws.id;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          switchWorkspace(ws.id);
                          setIsWorkspaceMenuOpen(false);
                        }}
                        className={`w-full min-h-[44px] text-left p-2.5 rounded-2xl flex items-center justify-between transition-all text-xs font-bold ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-950 font-black'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="truncate">{ws.tradeName || ws.name}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="p-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkspaceMenuOpen(false);
                      openAccountTab('workspaces');
                    }}
                    className="w-full min-h-[44px] p-2 text-xs font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Gerenciar / Criar Empresa
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Branch & Terminal badges (Tablet/Desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="font-black text-slate-700">{activeBranchId || 'MATRIZ'}</span>
            <span>•</span>
            <span className="text-slate-500">{activeTerminalId || 'PDV-01'}</span>
          </div>

          {/* Cash Register State (Hidden on smallest mobile, shown as dot on sm) */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold">
            <span className={`w-2 h-2 rounded-full ${activeRegister ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-600">
              {activeRegister ? `Caixa Aberto (#${activeRegister.id?.substring(0, 6)})` : 'Caixa Fechado'}
            </span>
          </div>
        </div>

        {/* Right: User Account Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isPlatformAdmin && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Plataforma
            </span>
          )}

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="min-h-[48px] min-w-[48px] flex items-center gap-2 sm:p-1.5 sm:pl-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black uppercase text-slate-900 leading-tight">
                  {profile?.fullName || account?.displayName || userProfile?.name || 'Minha Conta'}
                </p>
                <p className="text-[10px] font-bold uppercase text-emerald-600 leading-tight">
                  {userProfile?.role || 'Operador'}
                </p>
              </div>

              <div 
                className="w-9 h-9 rounded-2xl text-slate-950 flex items-center justify-center font-black text-xs shadow-md"
                style={{ backgroundColor: branding?.colors?.primary || '#10b981' }}
              >
                {(profile?.fullName || account?.displayName || userProfile?.name || 'U').charAt(0).toUpperCase()}
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-3xl border border-slate-200 shadow-2xl p-2 z-30 space-y-1 animate-in zoom-in-95">
                <div className="p-3 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-900 truncate">
                    {profile?.fullName || account?.displayName || userProfile?.name}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 truncate">
                    {account?.email || userProfile?.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) onNavigate('conta_perfil');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full min-h-[44px] text-left p-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Meu Perfil</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) onNavigate('conta_seguranca');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full min-h-[44px] text-left p-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  <KeyRound className="w-4 h-4 text-slate-400" />
                  <span>Segurança & Senha</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) onNavigate('conta_seguranca');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full min-h-[44px] text-left p-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  <Laptop className="w-4 h-4 text-slate-400" />
                  <span>Sessões & Dispositivos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) onNavigate('admin_branding');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full min-h-[44px] text-left p-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Minha Empresa</span>
                </button>

                <div className="p-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full min-h-[44px] p-2 text-xs font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair do Sistema
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Unified Account Modal */}
      <AccountCenterModal
        isOpen={isAccountModalOpen}
        initialTab={initialAccountTab}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </>
  );
}
