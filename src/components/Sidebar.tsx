import React, { useState, useEffect } from 'react';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Tag, 
  ShoppingBag, 
  DollarSign, 
  BarChart3, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  Store, 
  LogOut, 
  Bot, 
  Receipt, 
  RotateCcw, 
  XCircle, 
  History, 
  SlidersHorizontal, 
  ArrowLeftRight, 
  Truck, 
  Wallet, 
  UserCheck, 
  ShieldCheck, 
  Sliders, 
  Users, 
  PanelLeftClose,
  PanelLeftOpen,
  Building2, MapPin, 
  Palette,
  Sparkles,
  Scissors,
  Calendar as CalendarIcon,
  QrCode,
  User,
  Lock,
  Monitor,
  Printer,
  Smartphone,
  ShieldAlert,
  Archive,
  CreditCard,
  Activity
} from 'lucide-react';
import { UserProfile, CompanyRole, StoreSettings } from '../types';
import { cn } from '../lib/utils';
import { hasPermission, PermissionKey } from '../lib/permissions';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { AppFeatureFlags } from '../types/feature_flags';

export type MenuTab = 
  | 'inicio_dashboard' 
  | 'inicio_assistant'
  | 'vendas_pos' 
  | 'vendas_list' 
  | 'vendas_devolucoes' 
  | 'vendas_cancelamentos'
  | 'estoque_inventario' 
  | 'estoque_movimentacoes' 
  | 'estoque_ajustes' 
  | 'estoque_transferencias'
  | 'cadastros_produtos' 
  | 'cadastros_clientes_fidelidade' 
  | 'cadastros_fornecedores'
  | 'compras_entradas'
  | 'financeiro_caixa' 
  | 'financeiro_contas'
  | 'relatorios'
  | 'fiscal_documentos'
  | 'admin_equipe'
  | 'admin_usuarios' 
  | 'admin_permissoes' 
  | 'admin_auditoria'
  | 'admin_branding'
  | 'admin_arquivos'
  | 'admin_configuracoes'
  | 'admin_dashboard'
  | 'admin_billing'
  | 'admin_fiscal'
  | 'admin_filiais'
  | 'tecnico_dispositivos'
  | 'tecnico_sistema'
  | 'conta_perfil'
  | 'conta_seguranca'
  | 'servicos_gestao'
  | 'servicos_agenda'
  | 'pulse_dashboard'
  | 'hq_command_center';

export interface MenuGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  featureFlag?: keyof AppFeatureFlags;
  items: {
    id: MenuTab;
    label: string;
    icon?: React.ElementType;
    permission?: PermissionKey;
    adminOnly?: boolean;
    featureFlag?: keyof AppFeatureFlags;
  }[];
}

interface SidebarProps {
  activeTab: MenuTab;
  onTabChange: (tab: MenuTab) => void;
  user: UserProfile;
  activeRegister: any;
  onLogout: () => void;
  onRoleChange: (role: CompanyRole) => void;
}

export const menuGroups: MenuGroup[] = [
  {
    id: 'inicio',
    label: 'Início',
    icon: Home,
    items: [
      { id: 'inicio_dashboard', label: 'Dashboard', icon: Home },
      { id: 'inicio_assistant', label: 'Consultor IA Gemini', icon: Bot, featureFlag: 'aiAssistant' },
    ]
  },
  {
    id: 'vendas',
    label: 'Vendas',
    icon: ShoppingCart,
    items: [
      { id: 'vendas_pos', label: 'Frente de Caixa (PDV)', icon: ShoppingCart, permission: 'posAccess' },
      { id: 'vendas_list', label: 'Histórico de Vendas', icon: Receipt, permission: 'posAccess' },
      { id: 'vendas_devolucoes', label: 'Devoluções', icon: RotateCcw, permission: 'cancelSale' },
      { id: 'vendas_cancelamentos', label: 'Cancelamentos', icon: XCircle, permission: 'cancelSale' },
    ]
  },
  {
    id: 'estoque',
    label: 'Estoque',
    icon: Package,
    items: [
      { id: 'estoque_inventario', label: 'Inventário & Balanço', icon: Package, permission: 'manageStock' },
      { id: 'estoque_movimentacoes', label: 'Movimentações', icon: History, permission: 'manageStock' },
      { id: 'estoque_ajustes', label: 'Ajustes de Estoque', icon: SlidersHorizontal, permission: 'manageStock' },
      { id: 'estoque_transferencias', label: 'Transferências', icon: ArrowLeftRight, permission: 'manageStock', featureFlag: 'multiBranch' },
    ]
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    icon: Tag,
    items: [
      { id: 'cadastros_produtos', label: 'Produtos', icon: Tag, permission: 'manageStock' },
      { id: 'cadastros_clientes_fidelidade', label: 'Clientes & Fidelidade', icon: Users, permission: 'posAccess' },
      { id: 'cadastros_fornecedores', label: 'Fornecedores', icon: Truck, permission: 'manageStock' },
    ]
  },
  {
    id: 'compras',
    label: 'Compras',
    icon: ShoppingBag,
    items: [
      { id: 'compras_entradas', label: 'Entradas / Compras', icon: ShoppingBag, permission: 'manageStock' },
    ]
  },
  {
    id: 'servicos',
    label: 'Serviços & Pulse',
    icon: Scissors,
    items: [
      { id: 'servicos_gestao', label: 'Catálogo de Serviços', icon: Scissors, permission: 'manageStock', featureFlag: 'servicesEnabled' },
      { id: 'servicos_agenda', label: 'Agenda & Atendimentos', icon: CalendarIcon, permission: 'posAccess', featureFlag: 'servicesEnabled' },
      { id: 'pulse_dashboard', label: '3eatcru Pulse (QR Code)', icon: QrCode, permission: 'posAccess', featureFlag: 'pulseEnabled' },
    ]
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    featureFlag: 'financial' as any,
    items: [
      { id: 'financeiro_caixa', label: 'Caixa / Turnos', icon: Wallet, permission: 'manageFinancial' },
      { id: 'financeiro_contas', label: 'Contas (Receber / Pagar)', icon: DollarSign, permission: 'manageFinancial' },
    ]
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: BarChart3,
    items: [
      { id: 'relatorios', label: 'Relatórios & DRE', icon: BarChart3, permission: 'viewReports' },
    ]
  },
  {
    id: 'conta',
    label: 'Minha Conta',
    icon: User,
    items: [
      { id: 'conta_perfil', label: 'Meu Perfil', icon: User },
      { id: 'conta_seguranca', label: 'Senha & Segurança', icon: Lock },
    ]
  },
  {
    id: 'empresa',
    label: 'Minha Empresa',
    icon: Building2,
    items: [
      { id: 'admin_dashboard', label: 'Painel de Controle', icon: Activity, adminOnly: true },
      { id: 'admin_branding', label: 'Dados & Identidade', icon: Building2, adminOnly: true },
      { id: 'admin_filiais', label: 'Filiais & Unidades', icon: MapPin, adminOnly: true },
      { id: 'admin_equipe', label: 'Equipe & Funcionários', icon: Users, adminOnly: true },
      { id: 'admin_usuarios', label: 'Usuários do Sistema', icon: UserCheck, adminOnly: true },
      { id: 'admin_permissoes', label: 'Permissões (RBAC)', icon: ShieldCheck, adminOnly: true },
      { id: 'admin_configuracoes', label: 'Regras de Negócio', icon: Sliders, adminOnly: true },
      { id: 'fiscal_documentos', label: 'Fiscal & Impostos', icon: Receipt, adminOnly: true },
      { id: 'admin_billing', label: 'Assinatura & Plano', icon: CreditCard, adminOnly: true },
      { id: 'admin_arquivos', label: 'Arquivos & Documentos', icon: Archive, adminOnly: true },
      { id: 'admin_auditoria', label: 'Logs & Auditoria', icon: ShieldAlert, adminOnly: true },
    ]
  },
  {
    id: 'tecnico',
    label: 'Configurações Técnicas',
    icon: Monitor,
    items: [
      { id: 'tecnico_dispositivos', label: 'Dispositivos & Impressoras', icon: Printer },
      { id: 'tecnico_sistema', label: 'Preferências do Sistema', icon: Smartphone },
    ]
  },
  {
    id: 'hq',
    label: 'VarejoPro Platform',
    icon: Sparkles,
    items: [
      { id: 'hq_command_center', label: 'Command Center (HQ)', icon: Building2, adminOnly: true },
    ]
  }
];

export default function Sidebar({
  activeTab,
  onTabChange,
  user,
  activeRegister,
  onLogout
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const { isPlatformAdmin } = useAuth();
  const { hasFlag } = useFeatureFlags();
  const isLeadDev = isPlatformAdmin;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    inicio: true,
    vendas: false,
    estoque: false,
    cadastros: false,
    compras: false,
    financeiro: false,
    relatorios: false,
    conta: true,
    empresa: true,
    tecnico: false
  });

  useEffect(() => {
    if (!user?.companyId) return;
    const unsub = onSnapshot(doc(db, 'settings', `store_${user.companyId}`), (docSnap) => {
      if (docSnap.exists()) {
        setStoreSettings(docSnap.data() as StoreSettings);
      }
    }, (err) => {
      console.warn('Erro ao carregar configurações da loja:', err);
    });
    return () => unsub();
  }, [user?.companyId]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <aside 
      className={cn(
        "hidden md:flex bg-slate-900 text-slate-300 flex-col h-full border-r border-slate-800 transition-all duration-300 shrink-0 z-20 select-none",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          {storeSettings?.logoUrl ? (
            <img 
              src={storeSettings.logoUrl} 
              alt="Logo" 
              className="w-9 h-9 object-contain rounded-xl bg-white p-0.5 border border-slate-700 shadow-md shrink-0" 
            />
          ) : (
            <div 
              className="p-2 text-slate-950 rounded-xl font-black shrink-0 shadow-md"
              style={{ backgroundColor: storeSettings?.primaryColor || '#10b981' }}
            >
              <Store className="w-5 h-5" />
            </div>
          )}

          {!collapsed && (
            <div className="truncate">
              <h1 className="text-xs font-black uppercase tracking-wider text-white truncate">
                {storeSettings?.storeName || '3eatcru Varejo'}
              </h1>
              <p 
                className="text-[9px] font-bold uppercase tracking-widest truncate flex items-center gap-1.5"
                style={{ color: storeSettings?.primaryColor || '#34d399' }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeRegister ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {activeRegister ? 'Caixa Aberto' : 'Caixa Fechado'}
              </p>
            </div>
          )}
        </div>

        <button 
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
          title={collapsed ? "Expandir Menu" : "Recolher Menu"}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
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
              {/* Group Header Button */}
              <button
                type="button"
                onClick={() => {
                  if (collapsed) {
                    setCollapsed(false);
                  }
                  toggleGroup(group.id);
                }}
                className={cn(
                  "w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                  hasActiveItem ? "text-emerald-400 bg-slate-800/80" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <GroupIcon className={cn("w-4 h-4 shrink-0", hasActiveItem ? "text-emerald-400" : "text-slate-400")} />
                  {!collapsed && <span className="truncate">{group.label}</span>}
                </div>
                {!collapsed && (
                  isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                )}
              </button>

              {/* Sub items */}
              {(!collapsed && isExpanded) && (
                <div className="pl-6 space-y-0.5 border-l border-slate-800 ml-4">
                  {filteredItems.map(item => {
                    const ItemIcon = item.icon || GroupIcon;
                    const isActive = activeTab === item.id;
                    const isHQ = item.id === 'hq_command_center';

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onTabChange(item.id)}
                        className={cn(
                          "w-full min-h-[38px] text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2",
                          isActive 
                            ? isHQ
                              ? "bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20"
                              : "bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/10" 
                            : isHQ
                              ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 font-black"
                              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                        )}
                      >
                        <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {isHQ && !collapsed && (
                          <span className="ml-auto text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black border border-amber-500/30">
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

      {/* Footer User Profile & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
        {isLeadDev && !collapsed && (
          <button
            type="button"
            onClick={() => onTabChange('hq_command_center')}
            className="w-full min-h-[40px] p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-300 hover:text-amber-200 hover:border-amber-400 flex items-center justify-between text-[10px] font-black uppercase tracking-wider transition-all"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
              <span className="truncate">Command Center (HQ)</span>
            </div>
            <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-black">
              SUPER ADMIN
            </span>
          </button>
        )}

        <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 truncate">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[9px] font-black uppercase text-emerald-400 truncate">
                  {isLeadDev ? 'Platform Admin' : user.role}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Sair do sistema"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
