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
  Building2, 
  MapPin, 
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
  Activity,
  FolderTree,
  UtensilsCrossed,
  Layers,
  ChefHat
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
  | 'cadastros_produtos'
  | 'cadastros_categorias'
  | 'estoque_movimentacoes'
  | 'estoque_inventario' 
  | 'estoque_ajustes' 
  | 'estoque_transferencias'
  | 'cadastros_clientes_fidelidade' 
  | 'cadastros_fornecedores'
  | 'compras_entradas'
  | 'financeiro_caixa' 
  | 'financeiro_contas'
  | 'financeiro_formas'
  | 'admin_equipe'
  | 'admin_escala'
  | 'admin_usuarios' 
  | 'admin_permissoes' 
  | 'admin_auditoria'
  | 'relatorios'
  | 'admin_branding'
  | 'admin_arquivos'
  | 'admin_configuracoes'
  | 'admin_dashboard'
  | 'admin_billing'
  | 'admin_fiscal'
  | 'admin_filiais'
  | 'fiscal_documentos'
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
  segmentRequirement?: 'RETAIL' | 'RESTAURANT' | 'SERVICES' | 'DISTRIBUTION' | 'ALL';
  items: {
    id: MenuTab;
    label: string;
    icon?: React.ElementType;
    permission?: PermissionKey;
    adminOnly?: boolean;
    featureFlag?: keyof AppFeatureFlags;
    segmentRequirement?: 'RETAIL' | 'RESTAURANT' | 'SERVICES' | 'DISTRIBUTION' | 'ALL';
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

export function buildMenuGroups(businessSegment: string = 'RETAIL'): MenuGroup[] {
  const isRestaurant = businessSegment === 'RESTAURANT' || businessSegment === 'BAR' || businessSegment === 'FOOD';
  const isServices = businessSegment === 'SERVICES' || businessSegment === 'SALON';
  const isDistribution = businessSegment === 'DISTRIBUTION' || businessSegment === 'WHOLESALE';

  const groups: MenuGroup[] = [
    // 🏠 1. Início
    {
      id: 'inicio',
      label: 'Início',
      icon: Home,
      items: [
        { id: 'inicio_dashboard', label: 'Início / Painel', icon: Home },
        { id: 'inicio_assistant', label: 'Consultor IA', icon: Bot, featureFlag: 'aiAssistant' },
      ]
    },

    // 🛒 2. Vendas
    {
      id: 'vendas',
      label: 'Vendas',
      icon: ShoppingCart,
      items: [
        { id: 'vendas_pos', label: 'Nova Venda (PDV)', icon: ShoppingCart, permission: 'posAccess' },
        { id: 'vendas_list', label: 'Histórico de Vendas', icon: Receipt, permission: 'posAccess' },
        { id: 'vendas_devolucoes', label: 'Devoluções & Trocas', icon: RotateCcw, permission: 'cancelSale' },
        // Extensão Restaurante (Invisível para loja comum)
        ...(isRestaurant ? [
          { id: 'pulse_dashboard' as MenuTab, label: 'Mesas & Comandas', icon: UtensilsCrossed, permission: 'posAccess' as PermissionKey },
        ] : []),
        // Extensão Serviços (Invisível para loja comum)
        ...(isServices ? [
          { id: 'servicos_agenda' as MenuTab, label: 'Agenda & Atendimentos', icon: CalendarIcon, permission: 'posAccess' as PermissionKey },
        ] : []),
      ]
    },

    // 📦 3. Produtos & Estoque
    {
      id: 'produtos',
      label: 'Produtos',
      icon: Package,
      items: [
        { id: 'cadastros_produtos', label: 'Produtos', icon: Tag, permission: 'manageStock' },
        { id: 'cadastros_categorias', label: 'Categorias', icon: FolderTree, permission: 'manageStock' },
        { id: 'estoque_movimentacoes', label: 'Estoque & Movimentações', icon: History, permission: 'manageStock' },
        { id: 'estoque_inventario', label: 'Inventário & Balanço', icon: Package, permission: 'manageStock' },
        // Extensões Especializadas
        ...(isDistribution ? [
          { id: 'estoque_transferencias' as MenuTab, label: 'WMS & Transferências', icon: ArrowLeftRight, permission: 'manageStock' as PermissionKey },
          { id: 'compras_entradas' as MenuTab, label: 'Entradas por NF-e', icon: ShoppingBag, permission: 'manageStock' as PermissionKey },
        ] : []),
        ...(isServices ? [
          { id: 'servicos_gestao' as MenuTab, label: 'Catálogo de Serviços', icon: Scissors, permission: 'manageStock' as PermissionKey },
        ] : [])
      ]
    },

    // 👥 4. Clientes
    {
      id: 'clientes',
      label: 'Clientes',
      icon: Users,
      items: [
        { id: 'cadastros_clientes_fidelidade', label: 'Clientes & Fidelidade', icon: Users, permission: 'posAccess' },
      ]
    },

    // 💰 5. Financeiro
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: DollarSign,
      items: [
        { id: 'financeiro_caixa', label: 'Caixa / Turnos', icon: Wallet, permission: 'manageFinancial' },
        { id: 'financeiro_contas', label: 'Contas a Pagar / Receber', icon: DollarSign, permission: 'manageFinancial' },
        { id: 'financeiro_formas', label: 'Formas de Pagamento', icon: CreditCard, permission: 'manageFinancial' },
      ]
    },

    // 👨‍💼 6. Equipe
    {
      id: 'equipe',
      label: 'Equipe',
      icon: UserCheck,
      items: [
        { id: 'admin_equipe', label: 'Funcionários', icon: Users, adminOnly: true },
        { id: 'admin_permissoes', label: 'Permissões & Acessos', icon: ShieldCheck, adminOnly: true },
      ]
    },

    // 📊 7. Relatórios
    {
      id: 'relatorios',
      label: 'Relatórios',
      icon: BarChart3,
      items: [
        { id: 'relatorios', label: 'Relatórios & DRE', icon: BarChart3, permission: 'viewReports' },
      ]
    },

    // 🏢 8. Minha Empresa
    {
      id: 'empresa',
      label: 'Minha Empresa',
      icon: Building2,
      items: [
        { id: 'admin_branding', label: 'Dados & Identidade', icon: Building2, adminOnly: true },
        { id: 'fiscal_documentos', label: 'Fiscal & NFC-e', icon: Receipt, adminOnly: true },
        { id: 'admin_billing', label: 'Assinatura & Plano', icon: CreditCard, adminOnly: true },
        { id: 'admin_filiais', label: 'Filiais & Unidades', icon: MapPin, adminOnly: true, featureFlag: 'multiBranch' },
        { id: 'admin_auditoria', label: 'Auditoria & Logs', icon: ShieldAlert, adminOnly: true },
      ]
    },

    // ⚙️ 9. Configurações
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: Settings,
      items: [
        { id: 'admin_configuracoes', label: 'Tipo de Negócio & Regras', icon: Sliders, adminOnly: true },
        { id: 'tecnico_dispositivos', label: 'Dispositivos & Impressoras', icon: Printer },
        { id: 'tecnico_sistema', label: 'Preferências do Sistema', icon: Smartphone },
      ]
    },

    // 🛠️ Platform Admin HQ (Somente Super Admins)
    {
      id: 'hq',
      label: 'Plataforma',
      icon: Sparkles,
      items: [
        { id: 'hq_command_center', label: 'Command Center (HQ)', icon: Building2, adminOnly: true },
      ]
    }
  ];

  return groups;
}

export const menuGroups: MenuGroup[] = buildMenuGroups('RETAIL');

export default function Sidebar({
  activeTab,
  onTabChange,
  user,
  activeRegister,
  onLogout
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [businessSegment, setBusinessSegment] = useState<string>('RETAIL');
  const { isPlatformAdmin } = useAuth();
  const { hasFlag } = useFeatureFlags();
  const isLeadDev = isPlatformAdmin;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    inicio: true,
    vendas: true,
    produtos: false,
    clientes: false,
    financeiro: false,
    equipe: false,
    relatorios: false,
    empresa: false,
    configuracoes: false,
    hq: false
  });

  useEffect(() => {
    if (!user?.companyId) return;
    
    // Store Settings
    const unsubStore = onSnapshot(doc(db, 'settings', `store_${user.companyId}`), (docSnap) => {
      if (docSnap.exists()) {
        setStoreSettings(docSnap.data() as StoreSettings);
      }
    }, (err) => {
      console.warn('Erro ao carregar configurações da loja:', err);
    });

    // Operational Profile & Segment
    const unsubOperational = onSnapshot(doc(db, 'settings', `operational_${user.companyId}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.segments && Array.isArray(data.segments)) {
          if (data.segments.includes('RESTAURANTE') || data.segments.includes('BAR')) {
            setBusinessSegment('RESTAURANT');
          } else if (data.segments.includes('SERVICOS')) {
            setBusinessSegment('SERVICES');
          } else if (data.segments.includes('DISTRIBUICAO') || data.segments.includes('ATACADO')) {
            setBusinessSegment('DISTRIBUTION');
          } else {
            setBusinessSegment('RETAIL');
          }
        }
      }
    }, (err) => {
      console.warn('Erro ao carregar segmento:', err);
    });

    return () => {
      unsubStore();
      unsubOperational();
    };
  }, [user?.companyId]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const dynamicMenuGroups = buildMenuGroups(businessSegment);

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
                {storeSettings?.storeName || 'VarejoPro'}
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
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {dynamicMenuGroups.map(group => {
          if (group.id === 'hq' && !isLeadDev) return null;
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

          // If group has only 1 item, direct clickable button
          if (filteredItems.length === 1 && group.id !== 'vendas' && group.id !== 'produtos') {
            const singleItem = filteredItems[0];
            const isActive = activeTab === singleItem.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => onTabChange(singleItem.id)}
                className={cn(
                  "w-full min-h-[40px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                  isActive ? "text-slate-950 bg-emerald-400 font-black shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <GroupIcon className={cn("w-4 h-4 shrink-0", isActive ? "text-slate-950" : "text-slate-400")} />
                  {!collapsed && <span className="truncate">{group.label}</span>}
                </div>
              </button>
            );
          }

          return (
            <div key={group.id} className="space-y-0.5">
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
                  "w-full min-h-[38px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
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
                <div className="pl-5 space-y-0.5 border-l border-slate-800 ml-4 py-0.5">
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
                          "w-full min-h-[36px] text-left px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2",
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
            className="w-full min-h-[38px] p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-300 hover:text-amber-200 hover:border-amber-400 flex items-center justify-between text-[10px] font-black uppercase tracking-wider transition-all"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
              <span className="truncate">Command Center (HQ)</span>
            </div>
            <span className="text-[9px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-black">
              SUPER
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
