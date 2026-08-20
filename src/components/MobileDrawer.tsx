import React, { useEffect } from 'react';
import { 
  X, 
  Store, 
  Building2, 
  LogOut, 
  Sparkles, 
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { MenuTab, menuGroups } from './Sidebar';
import { UserProfile, CompanyRole } from '../types';
import { cn } from '../lib/utils';
import { hasPermission } from '../lib/permissions';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { useCompany } from '../contexts/CompanyContext';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: MenuTab;
  onTabChange: (tab: MenuTab) => void;
  user: UserProfile;
  activeRegister: any;
  onLogout: () => void;
}

export default function MobileDrawer({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  user,
  activeRegister,
  onLogout
}: MobileDrawerProps) {
  const { isPlatformAdmin } = useAuth();
  const { hasFlag } = useFeatureFlags();
  const { branding } = useCompany();
  const isLeadDev = isPlatformAdmin;

  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({
    inicio: true,
    vendas: false,
    estoque: false,
    cadastros: false,
    compras: false,
    servicos: false,
    financeiro: false,
    relatorios: false,
    conta: true,
    empresa: true,
    tecnico: false
  });

  // Handle ESC key to close drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectTab = (tab: MenuTab) => {
    onTabChange(tab);
    onClose();
  };

  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-4/5 max-w-sm bg-slate-900 text-slate-300 h-full flex flex-col shadow-2xl border-r border-slate-800 z-10 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div 
              className="p-2 text-slate-950 rounded-xl font-black shrink-0 shadow-md"
              style={{ backgroundColor: branding?.colors?.primary || '#10b981' }}
            >
              <Store className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h2 className="text-xs font-black uppercase tracking-wider text-white truncate">
                {branding?.tradeName || branding?.name || 'VarejoPro POS'}
              </h2>
              <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${activeRegister ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {activeRegister ? 'Caixa Aberto' : 'Caixa Fechado'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-2">
          {menuGroups.map(group => {
            if (group.featureFlag && !hasFlag(group.featureFlag)) return null;

            const filteredItems = group.items.filter(item => {
              if (item.featureFlag && !hasFlag(item.featureFlag)) return false;
              if (item.id === 'hq_command_center') {
                return isLeadDev || (user.role === CompanyRole.ADMIN || user.role === CompanyRole.OWNER);
              }
              if (item.adminOnly && user.role !== CompanyRole.ADMIN && user.role !== CompanyRole.OWNER && !isLeadDev) return false;
              if (item.permission && !hasPermission(user, item.permission) && !isLeadDev) return false;
              return true;
            });

            if (filteredItems.length === 0) return null;

            const GroupIcon = group.icon;
            const isExpanded = expandedGroups[group.id];
            const hasActiveItem = filteredItems.some(item => item.id === activeTab);

            return (
              <div key={group.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                    hasActiveItem ? "text-emerald-400 bg-slate-800/80" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <GroupIcon className={cn("w-4 h-4 shrink-0", hasActiveItem ? "text-emerald-400" : "text-slate-400")} />
                    <span className="truncate">{group.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
                  )}
                </button>

                {isExpanded && (
                  <div className="pl-4 space-y-1 border-l border-slate-800 ml-3">
                    {filteredItems.map(item => {
                      const ItemIcon = item.icon || GroupIcon;
                      const isActive = activeTab === item.id;
                      const isHQ = item.id === 'hq_command_center';

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={cn(
                            "w-full min-h-[44px] text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5",
                            isActive 
                              ? isHQ
                                ? "bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20"
                                : "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/10" 
                              : isHQ
                                ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 font-black"
                                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                          )}
                        >
                          <ItemIcon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {isHQ && (
                            <span className="ml-auto text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black border border-amber-500/30">
                              HQ
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer with User info & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2 pb-safe">
          {isLeadDev && (
            <button
              type="button"
              onClick={() => handleSelectTab('hq_command_center')}
              className="w-full min-h-[44px] p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-300 hover:text-amber-200 flex items-center justify-between text-xs font-black uppercase tracking-wider transition-all"
            >
              <div className="flex items-center gap-2 truncate">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Command Center (HQ)</span>
              </div>
              <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-black">
                SUPER
              </span>
            </button>
          )}

          <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[10px] font-black uppercase text-emerald-400 truncate">
                  {isLeadDev ? 'Platform Admin' : user.role}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              title="Sair do sistema"
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
