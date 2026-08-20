import React, { useState, useEffect } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from './lib/firebase';
import { hasPermission, PermissionKey } from './lib/permissions';
import { UserProfile, CompanyRole, CashRegister } from './types';

// Context Providers
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { CompanyProvider } from './contexts/CompanyContext';

// Top Header & Sidebar
import TopHeader from './components/TopHeader';
import Sidebar, { MenuTab } from './components/Sidebar';
import MobileBottomNav from './components/MobileBottomNav';
import MobileDrawer from './components/MobileDrawer';
import AuthScreen from './components/AuthScreen';

import { FeatureFlagProvider } from './contexts/FeatureFlagContext';

// Views
import DashboardOverview from './modules/dashboard/DashboardOverview';
import Checkout from './components/Checkout';
import CashRegisterView from './modules/caixa/CashRegisterView';
import InventoryList from './modules/estoque/inventario';
import PurchasesManager from './modules/compras/PurchasesManager';
import StockMovementsHistory from './modules/estoque/movimentacoes/StockMovementsHistory';
import StockAdjustments from './modules/estoque/ajustes/StockAdjustments';
import StockTransfers from './modules/estoque/transferencias/StockTransfers';
import SalesManager from './modules/vendas/SalesManager';
import DevolucoesManager from './modules/vendas/DevolucoesManager';
import CancelamentosManager from './modules/vendas/CancelamentosManager';
import ClientesFidelidadeManager from './modules/cadastros/ClientesFidelidadeManager';
import SuppliersList from './modules/cadastros/SuppliersList';
import AiStoreAssistant from './modules/assistente/AiStoreAssistant';
import FinancialManager from './modules/financeiro/FinancialManager';
import FiscalSettings from './modules/fiscal/FiscalSettings';
import FiscalManager from './modules/fiscal/FiscalManager';
import ExecutiveReports from './modules/relatorios/ExecutiveReports';
import UserManager from './modules/administrativo/usuarios/UserManager';
import EmployeeManager from './modules/administrativo/equipe/EmployeeManager';
import PermissionsMatrix from './modules/administrativo/usuarios/PermissionsMatrix';
import Settings from './modules/administrativo/configuracoes';
import CompanyBrandingSettings from './modules/administrativo/configuracoes/CompanyBrandingSettings';
import DriveStorageVault from './modules/administrativo/arquivos/DriveStorageVault';
import ServicesManager from './modules/servicos/ServicesManager';
import AppointmentsCalendar from './modules/servicos/AppointmentsCalendar';
import PulseDashboard from './modules/pulse/PulseDashboard';
import PulsePublicPortal from './modules/pulse/PulsePublicPortal';
import ProfileSettings from './modules/conta/ProfileSettings';
import SecuritySettings from './modules/conta/SecuritySettings';
import TechnicalSettings from './modules/tecnico/TechnicalSettings';
import AdminDashboard from './modules/administrativo/AdminDashboard';
import AuditLogs from './modules/administrativo/auditoria/AuditLogs';
import FileVault from './modules/administrativo/arquivos/FileVault';
import BillingSettings from './modules/administrativo/billing/BillingSettings';
import BusinessRules from './modules/administrativo/regras/BusinessRules';
import FiscalManagement from './modules/administrativo/fiscal/FiscalManagement';
import BranchManagement from './modules/administrativo/filiais/BranchManagement';
import { VarejoProHQ } from './modules/hq/VarejoProHQ';

function ProtectedRoute({ 
  user, 
  permission, 
  adminOnly, 
  children 
}: { 
  user: UserProfile; 
  permission?: PermissionKey; 
  adminOnly?: boolean; 
  children: React.ReactNode;
}) {
  const { isPlatformAdmin, firebaseUser, userProfile, loadingAuth, logout } = useAuth();
  const isSuper = isPlatformAdmin;

  if (!isSuper && adminOnly && user.role !== CompanyRole.ADMIN && user.role !== CompanyRole.OWNER) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500 space-y-4">
        <ShieldAlert className="w-16 h-16 text-rose-500 opacity-50" />
        <h2 className="text-2xl font-black uppercase tracking-wider text-slate-800">Acesso Negado</h2>
        <p className="text-sm font-medium max-w-md text-center">Você não possui nível administrativo para visualizar esta página.</p>
      </div>
    );
  }
  if (!isSuper && permission && !hasPermission(user, permission)) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500 space-y-4">
        <ShieldAlert className="w-16 h-16 text-rose-500 opacity-50" />
        <h2 className="text-2xl font-black uppercase tracking-wider text-slate-800">Acesso Negado</h2>
        <p className="text-sm font-medium max-w-md text-center">Você não tem permissão para acessar este módulo. Contate o administrador do sistema.</p>
      </div>
    );
  }
  return <>{children}</>;
}

function MainApplication() {
  const { isPlatformAdmin, firebaseUser, userProfile, loadingAuth, logout } = useAuth();
  const { activeBranchId, activeTerminalId } = useWorkspace();
  const [activeTab, setActiveTab] = useState<MenuTab>('inicio_dashboard');
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const companyId = userProfile?.companyId || 'empresa_principal';
  const branchId = activeBranchId || userProfile?.branchId || `${companyId}_matriz`;
  const terminalId = activeTerminalId || userProfile?.terminalId || `${companyId}_pdv01`;

  // Real-time listener for active cash register in the active company terminal
  useEffect(() => {
    if (!firebaseUser || !companyId) {
      setActiveRegister(null);
      return;
    }

    const q = query(
      collection(db, 'cash_registers'),
      where('companyId', '==', companyId),
      where('branchId', '==', branchId),
      where('terminalId', '==', terminalId),
      where('status', '==', 'OPEN'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setActiveRegister({ id: doc.id, ...doc.data() } as CashRegister);
      } else {
        setActiveRegister(null);
      }
    }, (error) => {
      console.warn("Cash register snapshot error:", error);
    });

    return () => unsubscribe();
  }, [firebaseUser, companyId, branchId, terminalId]);

  // Public Pulse QR Code URL Check (No login required for end customers scanning QR codes)
  const urlParams = new URLSearchParams(window.location.search);
  const isPulsePublic = urlParams.has('pulse') || urlParams.has('p') || urlParams.has('code') || 
    window.location.pathname.startsWith('/pulse/') || window.location.pathname.startsWith('/v/');

  if (isPulsePublic) {
    return <PulsePublicPortal />;
  }

  if (loadingAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Carregando Sessão Segura...
        </p>
      </div>
    );
  }

  if (!firebaseUser || !userProfile) {
    return <AuthScreen />;
  }

  return (
    <CompanyProvider user={userProfile}>
      <div className="h-screen w-screen flex bg-slate-100 overflow-hidden">
        
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          user={userProfile}
          activeRegister={activeRegister}
          onLogout={logout}
          onRoleChange={() => {}}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden pb-14 md:pb-0">
          
          {/* Top Header with Account Menu, Company Switcher, and Register Status */}
          <TopHeader 
            activeRegister={activeRegister} 
            onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
            onNavigate={(tab) => setActiveTab(tab)}
          />

          {/* Mobile Drawer Navigation */}
          <MobileDrawer
            isOpen={isMobileDrawerOpen}
            onClose={() => setIsMobileDrawerOpen(false)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            user={userProfile}
            activeRegister={activeRegister}
            onLogout={logout}
          />

          {/* Module Views */}
          <main className="flex-1 overflow-hidden flex flex-col">
            {/* 🏠 Início */}
            {activeTab === 'inicio_dashboard' && (
              <DashboardOverview 
                user={userProfile} 
                activeRegister={activeRegister} 
                onNavigate={(tab) => {
                  if (tab === 'checkout') setActiveTab('vendas_pos');
                  else if (tab === 'cash_register') setActiveTab('financeiro_caixa');
                  else if (tab === 'purchases') setActiveTab('compras_entradas');
                  else if (tab === 'assistant') setActiveTab('inicio_assistant');
                  else if (tab === 'reports') setActiveTab('relatorios');
                }} 
              />
            )}
            {activeTab === 'inicio_assistant' && <AiStoreAssistant user={userProfile} />}

            {/* 🛒 Vendas */}
            {activeTab === 'vendas_pos' && (
              <ProtectedRoute user={userProfile} permission="posAccess">
                <Checkout 
                  user={userProfile} 
                  activeRegister={activeRegister}
                  onOpenRegisterRequested={() => setActiveTab('financeiro_caixa')}
                />
              </ProtectedRoute>
            )}
            {activeTab === 'vendas_list' && (
              <ProtectedRoute user={userProfile} permission="posAccess">
                <SalesManager user={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'vendas_devolucoes' && (
              <ProtectedRoute user={userProfile} permission="cancelSale">
                <DevolucoesManager user={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'vendas_cancelamentos' && (
              <ProtectedRoute user={userProfile} permission="cancelSale">
                <CancelamentosManager user={userProfile} />
              </ProtectedRoute>
            )}

            {/* 📦 Estoque */}
            {activeTab === 'estoque_inventario' && (
              <ProtectedRoute user={userProfile} permission="manageStock">
                <InventoryList user={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'estoque_movimentacoes' && (
              <ProtectedRoute user={userProfile} permission="manageStock">
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
                  <StockMovementsHistory user={userProfile} />
                </div>
              </ProtectedRoute>
            )}
            {activeTab === 'estoque_ajustes' && (
              <ProtectedRoute user={userProfile} permission="manageStock">
                <StockAdjustments user={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'estoque_transferencias' && (
              <ProtectedRoute user={userProfile} permission="manageStock">
                <StockTransfers user={userProfile} />
              </ProtectedRoute>
            )}

            {/* 🏷️ Cadastros */}
            {activeTab === 'cadastros_produtos' && (
              <ProtectedRoute user={userProfile} permission="manageStock">
                <InventoryList user={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'cadastros_clientes_fidelidade' && (
              <ProtectedRoute user={userProfile} permission="posAccess">
                <ClientesFidelidadeManager user={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'cadastros_fornecedores' && (
              <ProtectedRoute user={userProfile} permission="manageStock">
                <SuppliersList user={userProfile} />
              </ProtectedRoute>
            )}

            {/* 📥 Compras */}
            {activeTab === 'compras_entradas' && (
              <ProtectedRoute user={userProfile} permission="manageStock">
                <PurchasesManager user={userProfile} />
              </ProtectedRoute>
            )}

            {/* ✂️ Serviços & Agenda & Pulse */}
            {activeTab === 'servicos_gestao' && (
              <ProtectedRoute user={userProfile} permission="manageStock">
                <ServicesManager />
              </ProtectedRoute>
            )}
            {activeTab === 'servicos_agenda' && (
              <ProtectedRoute user={userProfile} permission="posAccess">
                <AppointmentsCalendar onSendToPDV={(_item) => {
                  setActiveTab('vendas_pos');
                }} />
              </ProtectedRoute>
            )}
            {activeTab === 'pulse_dashboard' && (
              <ProtectedRoute user={userProfile} permission="posAccess">
                <PulseDashboard />
              </ProtectedRoute>
            )}

            {/* 💰 Financeiro */}
            {activeTab === 'financeiro_caixa' && (
              <ProtectedRoute user={userProfile} permission="manageFinancial">
                <CashRegisterView 
                  user={userProfile}
                  activeRegister={activeRegister}
                  onRefreshRegister={() => {}}
                />
              </ProtectedRoute>
            )}
            {activeTab === 'financeiro_contas' && (
              <ProtectedRoute user={userProfile} permission="manageFinancial">
                <FinancialManager user={userProfile} />
              </ProtectedRoute>
            )}

            {/* 📊 Relatórios */}
            {activeTab === 'relatorios' && (
              <ProtectedRoute user={userProfile} permission="viewReports">
                <ExecutiveReports user={userProfile} />
              </ProtectedRoute>
            )}

            {/* 👤 Minha Conta */}
            {activeTab === 'conta_perfil' && <ProfileSettings user={userProfile} />}
            {activeTab === 'conta_seguranca' && <SecuritySettings user={userProfile} />}

            {/* 🛠️ Técnico */}
            {activeTab === 'tecnico_dispositivos' && <TechnicalSettings user={userProfile} />}
            {activeTab === 'tecnico_sistema' && <TechnicalSettings user={userProfile} />}

            {/* ⚙️ Administração da Empresa */}
            {activeTab === 'admin_dashboard' && (
              <ProtectedRoute user={userProfile} adminOnly>
                <AdminDashboard user={userProfile} onNavigate={(tab) => setActiveTab(tab)} />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_branding' && (
              <ProtectedRoute user={userProfile} adminOnly>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
                  <div className="max-w-6xl mx-auto">
                    <Settings user={userProfile} />
                  </div>
                </div>
              </ProtectedRoute>
            )}
            {activeTab === 'admin_arquivos' && (
              <ProtectedRoute user={userProfile} adminOnly>
                <FileVault user={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_usuarios' && (
              <ProtectedRoute user={userProfile} adminOnly>
                <UserManager currentUser={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_equipe' && (
              <ProtectedRoute user={userProfile} adminOnly>
                <EmployeeManager />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_permissoes' && (
              <ProtectedRoute user={userProfile} adminOnly>
                <PermissionsMatrix />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_auditoria' && (
              <ProtectedRoute user={userProfile} adminOnly>
                <AuditLogs user={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_billing' && (
              <ProtectedRoute user={userProfile} adminOnly>
                <BillingSettings user={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_configuracoes' && (
              <ProtectedRoute user={userProfile} adminOnly>
                <BusinessRules user={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'fiscal_documentos' && (
              <ProtectedRoute user={userProfile} adminOnly>
                <FiscalManagement user={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'admin_filiais' && (
              <ProtectedRoute user={userProfile} adminOnly>
                <BranchManagement user={userProfile} />
              </ProtectedRoute>
            )}
            {activeTab === 'hq_command_center' && (
              <ProtectedRoute user={userProfile} adminOnly>
                <div className="flex-1 overflow-y-auto">
                  <VarejoProHQ />
                </div>
              </ProtectedRoute>
            )}
          </main>

          {/* Mobile Bottom Navigation Bar (0–767px) */}
          <MobileBottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenDrawer={() => setIsMobileDrawerOpen(true)}
            activeRegister={activeRegister}
          />
        </div>
      </div>
    </CompanyProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
        <WorkspaceProvider>
          <FeatureFlagProvider>
            <MainApplication />
          </FeatureFlagProvider>
        </WorkspaceProvider>
    </AuthProvider>
  );
}
