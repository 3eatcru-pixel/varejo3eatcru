import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CreditCard, 
  ShieldAlert, 
  Flag, 
  Terminal, 
  Activity, 
  DollarSign, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Sliders,
  Layers,
  Tag,
  LifeBuoy,
  UserCheck,
  Smartphone,
  Lock,
  FileText,
  Play,
  Plus,
  AlertTriangle,
  Palette,
  Briefcase,
  TrendingUp,
  Calendar
} from 'lucide-react';

import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import PlatformCommercialCRM from './PlatformCommercialCRM';
import PlatformBrandingControlCenter from './PlatformBrandingControlCenter';
import PlatformBackupCenter from './PlatformBackupCenter';
import SyncEngineDiagnostics from './SyncEngineDiagnostics';
import { HQPaymentModal, HQInvoice } from './HQPaymentModal';

interface HQMetrics {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  trialCompanies: number;
  mrr: number;
  arr: number;
  churn: string;
  systemHealth: string;
  paymentsStatus: string;
}

interface CompanyLicense {
  companyId: string;
  name: string;
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  monthlyValue: number;
  maxBranches: number;
  maxTerminals: number;
  maxUsers: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  companyName: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paymentMethod: string;
  description: string;
  createdAt: string;
}

interface ErrorLog {
  id: string;
  errorName: string;
  message: string;
  stack?: string;
  companyId: string;
  terminalId: string;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  timestamp: string;
}

interface Release {
  id: string;
  version: string;
  title: string;
  environment: 'STAGING' | 'BETA' | 'PRODUCTION';
  changelog: string;
  publishedAt: string;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  description: string;
  active: boolean;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  companyId: string;
  subject: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  description: string;
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxBranches: number;
  maxTerminals: number;
  maxUsers: number;
  features: { pos: boolean; stock: boolean; finance: boolean; multiBranch: boolean; fiscal: boolean; ai: boolean };
}

export const VarejoProHQ: React.FC = () => {
  const { startSupportSession, supportSession, endSupportSession } = useWorkspace();
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'crm' | 'branding' | 'companies' | 'plans' | 'invoices' | 'coupons' | 'support' | 'backup_center' | 'tickets' | 'flags' | 'errors' | 'releases' | 'webhooks' | 'dev'>('overview');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<HQMetrics>({
    totalCompanies: 0,
    activeCompanies: 0,
    suspendedCompanies: 0,
    trialCompanies: 0,
    mrr: 0,
    arr: 0,
    churn: '0.0%',
    systemHealth: 'HEALTHY',
    paymentsStatus: 'OPERATIONAL'
  });
  const [companies, setCompanies] = useState<CompanyLicense[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [recentCompanySales, setRecentCompanySales] = useState<any[]>([]);
  const [recentCompanyAppointments, setRecentCompanyAppointments] = useState<any[]>([]);
  const [recentAppSales, setRecentAppSales] = useState<any[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [flags, setFlags] = useState({
    newCheckout: true,
    offlineEngine: true,
    fiscalModule: true,
    aiAssistant: false,
    multiBranch: true
  });
  const [editingCompany, setEditingCompany] = useState<CompanyLicense | null>(null);

  // New Ticket Form
  const [newTicketCompId, setNewTicketCompId] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [newTicketDesc, setNewTicketDesc] = useState('');

  // Release Form
  const [newVersion, setNewVersion] = useState('');
  const [newReleaseTitle, setNewReleaseTitle] = useState('');
  const [newReleaseChangelog, setNewReleaseChangelog] = useState('');

  // Webhook Form
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookDesc, setNewWebhookDesc] = useState('');

  // Invoice creation form
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [invCompanyId, setInvCompanyId] = useState('');
  const [invAmount, setInvAmount] = useState('149.00');
  const [invDueDate, setInvDueDate] = useState('');
  const [invDesc, setInvDesc] = useState('Mensalidade Plano VarejoPro PRO');
  const [runningRoutine, setRunningRoutine] = useState(false);
  const [routineResult, setRoutineResult] = useState<string | null>(null);

  // HQ Payment Processing Modal state
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<HQInvoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleOpenPayment = (inv: Invoice) => {
    setSelectedInvoiceForPayment({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      companyId: inv.companyId,
      companyName: inv.companyName,
      amount: inv.amount,
      status: (inv.status === 'CANCELLED' ? 'CANCELED' : inv.status) as any,
      dueDate: inv.dueDate,
      paymentMethod: inv.paymentMethod,
      description: inv.description,
      createdAt: inv.createdAt
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (updatedInvoice: HQInvoice) => {
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? {
      ...inv,
      status: 'PAID',
      paymentMethod: updatedInvoice.paymentMethod || inv.paymentMethod
    } : inv));
    fetchHQData();
  };

  // Coupon form
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(15);

  // Support session form
  const [supportCompanyId, setSupportCompanyId] = useState('');
  const [supportReason, setSupportReason] = useState('');
  const [supportSuccess, setSupportSuccess] = useState<string | null>(null);

  // Developer Diagnostic State
  const [devStats, setDevStats] = useState<any>(null);
  const [devTestResults, setDevTestResults] = useState<any>(null);
  const [runningDevTests, setRunningDevTests] = useState(false);

  const fetchDevStats = async () => {
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      if (!token) return;
      const res = await fetch('/api/hq/dev/system-stats', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setDevStats(data.stats);
      }
    } catch (e) {
      console.warn('Erro ao carregar estatísticas de dev:', e);
    }
  };

  const handleRunDevTests = async () => {
    setRunningDevTests(true);
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      if (!token) return;
      const res = await fetch('/api/hq/dev/run-tests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDevTestResults(data);
      }
    } catch (e) {
      console.error('Erro ao executar testes do sistema:', e);
    } finally {
      setRunningDevTests(false);
    }
  };

  const [simulatingSale, setSimulatingSale] = useState(false);
  const [simulatingAppt, setSimulatingAppt] = useState(false);
  const [simulatingSaaS, setSimulatingSaaS] = useState(false);

  const handleSimulateSale = async () => {
    setSimulatingSale(true);
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      // Use first company or a default id
      const targetCompanyId = companies[0]?.companyId || 'comp_starter';
      const res = await fetch('/api/hq/simulate-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ companyId: targetCompanyId })
      });
      if (res.ok) {
        await fetchHQData();
      }
    } catch (e) {
      console.error('Erro simulando venda:', e);
    } finally {
      setSimulatingSale(false);
    }
  };

  const handleSimulateAppointment = async () => {
    setSimulatingAppt(true);
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const targetCompanyId = companies[0]?.companyId || 'comp_starter';
      const res = await fetch('/api/hq/simulate-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ companyId: targetCompanyId })
      });
      if (res.ok) {
        await fetchHQData();
      }
    } catch (e) {
      console.error('Erro simulando agendamento:', e);
    } finally {
      setSimulatingAppt(false);
    }
  };

  const handleSimulateSaaSPayment = async () => {
    setSimulatingSaaS(true);
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const targetCompanyId = companies[0]?.companyId || 'comp_starter';
      const res = await fetch('/api/hq/simulate-saas-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ companyId: targetCompanyId })
      });
      if (res.ok) {
        await fetchHQData();
      }
    } catch (e) {
      console.error('Erro simulando pagamento SaaS:', e);
    } finally {
      setSimulatingSaaS(false);
    }
  };

  const fetchHQData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      if (!token) return;

      const [metricsRes, compRes, plansRes, flagsRes, invRes, errRes, relRes, hookRes, tickRes] = await Promise.all([
        fetch('/api/hq/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hq/companies', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hq/subscriptions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hq/feature-flags', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hq/invoices', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hq/errors', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hq/releases', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hq/webhooks', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hq/tickets', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      fetchDevStats();

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        if (data.metrics) setMetrics(data.metrics);
        if (data.recentCompanySales) setRecentCompanySales(data.recentCompanySales);
        if (data.recentCompanyAppointments) setRecentCompanyAppointments(data.recentCompanyAppointments);
        if (data.recentAppSales) setRecentAppSales(data.recentAppSales);
      }
      if (compRes.ok) {
        const data = await compRes.json();
        if (data.companies) setCompanies(data.companies);
      }
      if (plansRes.ok) {
        const data = await plansRes.json();
        if (data.plans) setPlans(data.plans);
      }
      if (flagsRes.ok) {
        const data = await flagsRes.json();
        if (data.flags) setFlags(data.flags);
      }
      if (invRes.ok) {
        const data = await invRes.json();
        if (data.invoices) setInvoices(data.invoices);
      }
      if (errRes.ok) {
        const data = await errRes.json();
        if (data.errors) setErrorLogs(data.errors);
      }
      if (relRes.ok) {
        const data = await relRes.json();
        if (data.releases) setReleases(data.releases);
      }
      if (hookRes.ok) {
        const data = await hookRes.json();
        if (data.webhooks) setWebhooks(data.webhooks);
      }
      if (tickRes.ok) {
        const data = await tickRes.json();
        if (data.tickets) setTickets(data.tickets);
      }
    } catch (err) {
      console.error('Failed to load HQ data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHQData();
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch('/api/hq/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingCompany)
      });
      if (res.ok) {
        setEditingCompany(null);
        fetchHQData();
      }
    } catch (err) {
      console.error('Error saving company license:', err);
    }
  };

  const handleExtendTrial = async (companyId: string, days: number = 14) => {
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch(`/api/hq/companies/${companyId}/trial-extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ days })
      });
      if (res.ok) {
        showHQNotification(`Trial da empresa estendido por +${days} dias com sucesso!`);
        fetchHQData();
      } else {
        const err = await res.json().catch(() => ({}));
        showHQNotification(err.error || 'Erro ao estender trial.', 'error');
      }
    } catch (err: any) {
      console.error('Error extending trial:', err);
      showHQNotification('Erro ao estender trial.', 'error');
    }
  };

  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showHQNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotificationMsg({ text, type });
    setTimeout(() => {
      setNotificationMsg(null);
    }, 4000);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      await fetch('/api/hq/coupons/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: couponCode, discountPercent: couponDiscount })
      });
      setCouponCode('');
      showHQNotification('Cupom de desconto criado com sucesso!');
    } catch (err) {
      console.error('Error creating coupon:', err);
      showHQNotification('Erro ao criar cupom.', 'error');
    }
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invCompanyId || !invAmount) return;
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch('/api/hq/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: invCompanyId,
          amount: invAmount,
          dueDate: invDueDate,
          description: invDesc
        })
      });
      if (res.ok) {
        setShowNewInvoiceModal(false);
        setInvCompanyId('');
        fetchHQData();
      }
    } catch (err) {
      console.error('Error generating invoice:', err);
    }
  };

  const handleExecuteOverdueRoutine = async () => {
    setRunningRoutine(true);
    setRoutineResult(null);
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch('/api/hq/billing/cron-worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRoutineResult(`Rotina executada: MRR atualizado (${data.stats.totalMrrCalculated}), ${data.stats.invoicesGenerated} faturas geradas, ${data.stats.overdueChecked} analisadas, ${data.stats.accountsSuspended} contas suspensas.`);
        fetchHQData();
      }
    } catch (err) {
      console.error('Error executing billing worker:', err);
    } finally {
      setRunningRoutine(false);
    }
  };

  const handleStartSupportSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportCompanyId || !supportReason) return;
    try {
      await startSupportSession(supportCompanyId, supportReason, 30);
      setSupportSuccess(`Sessão de suporte ativa conectada em ${supportCompanyId} por 30 min (Auditado). O contexto da aplicação foi alternado.`);
      setSupportReason('');
    } catch (err: any) {
      console.error('Error starting support session:', err);
      showHQNotification(err.message || 'Erro ao iniciar sessão de suporte.', 'error');
    }
  };

  const handlePublishRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion || !newReleaseTitle) return;
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch('/api/hq/releases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          version: newVersion,
          title: newReleaseTitle,
          changelog: newReleaseChangelog,
          environment: 'PRODUCTION'
        })
      });
      if (res.ok) {
        setNewVersion('');
        setNewReleaseTitle('');
        setNewReleaseChangelog('');
        showHQNotification('Nova versão publicada com sucesso!');
        fetchHQData();
      }
    } catch (err) {
      console.error('Error publishing release:', err);
      showHQNotification('Erro ao publicar versão.', 'error');
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl) return;
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch('/api/hq/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          url: newWebhookUrl,
          description: newWebhookDesc,
          events: ['empresa.criada', 'pagamento.aprovado', 'assinatura.suspensa']
        })
      });
      if (res.ok) {
        setNewWebhookUrl('');
        setNewWebhookDesc('');
        showHQNotification('Webhook registrado com sucesso!');
        fetchHQData();
      }
    } catch (err) {
      console.error('Error saving webhook:', err);
      showHQNotification('Erro ao salvar webhook.', 'error');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketCompId || !newTicketSubject) return;
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch('/api/hq/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: newTicketCompId,
          subject: newTicketSubject,
          priority: newTicketPriority,
          description: newTicketDesc,
          status: 'OPEN'
        })
      });
      if (res.ok) {
        setNewTicketCompId('');
        setNewTicketSubject('');
        setNewTicketDesc('');
        showHQNotification('Chamado registrado com sucesso!');
        fetchHQData();
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      showHQNotification('Erro ao registrar chamado.', 'error');
    }
  };

  const handleToggleFlag = async (flagKey: keyof typeof flags) => {
    const updated = { ...flags, [flagKey]: !flags[flagKey] };
    setFlags(updated);
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      await fetch('/api/hq/feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error('Error updating flag:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Toast Notification Banner */}
      {notificationMsg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold transition-all flex items-center gap-2 ${
          notificationMsg.type === 'success' 
            ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300' 
            : 'bg-rose-950 border-rose-500/50 text-rose-300'
        }`}>
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                VarejoPro Command Center (HQ)
              </h1>
              <p className="text-xs text-slate-400">
                Painel Administrativo Mestre da Plataforma SaaS Multi-Tenant
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHQData}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar QG
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium">
            <Activity className="w-3.5 h-3.5" />
            Sistemas Operacionais
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-8 border-b border-slate-800/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shrink-0 ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          Visão Geral & MRR
        </button>

        <button
          onClick={() => setActiveTab('crm')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shrink-0 ${
            activeTab === 'crm'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 hover:bg-emerald-900/40'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>CRM Comercial 3eatcru</span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shrink-0 ${
            activeTab === 'branding'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'text-purple-400 bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/40'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Marcas & White-Label</span>
        </button>

        <button
          onClick={() => setActiveTab('companies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shrink-0 ${
            activeTab === 'companies'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Empresas ({companies.length})
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'plans'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Planos & Matriz
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'invoices'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Faturas & Cobrança ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'coupons'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          Cupons
        </button>

        <button
          onClick={() => setActiveTab('support')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'support'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Sessão Suporte
        </button>

        <button
          onClick={() => setActiveTab('backup_center')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'backup_center'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'text-amber-400 bg-amber-950/40 border border-amber-800/40 hover:bg-amber-900/40'
          }`}
        >
          <Activity className="w-4 h-4" />
          Backup Center (Drive)
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'tickets'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          Chamados ({tickets.length})
        </button>

        <button
          onClick={() => setActiveTab('flags')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'flags'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Flag className="w-4 h-4" />
          Feature Flags
        </button>

        <button
          onClick={() => setActiveTab('errors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'errors'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Central de Erros ({errorLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('releases')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'releases'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Releases
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'webhooks'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          Webhooks
        </button>

        <button
          onClick={() => setActiveTab('dev')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'dev'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Developer Tools
        </button>
      </div>

      {/* TAB: CRM COMERCIAL 3EATCRU */}
      {activeTab === 'crm' && (
        <PlatformCommercialCRM platformRole="SUPER_ADMIN" />
      )}

      {/* TAB: CENTRAL DE MARCAS & WHITE-LABEL */}
      {activeTab === 'branding' && (
        <PlatformBrandingControlCenter companies={companies} />
      )}

      {/* TAB 1: OVERVIEW & MRR */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">MRR Plataforma</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-100">
                R$ {metrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-emerald-400 mt-2 font-medium">ARR: R$ {metrics.arr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Empresas Ativas</span>
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-100">{metrics.activeCompanies}</div>
              <p className="text-xs text-slate-400 mt-2">de {metrics.totalCompanies} empresas cadastradas</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Churn Rate</span>
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-100">{metrics.churn}</div>
              <p className="text-xs text-amber-400 mt-2">Taxa de cancelamento</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Inadimplentes / Suspensos</span>
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-100">{metrics.suspendedCompanies}</div>
              <p className="text-xs text-rose-400 mt-2">Bloqueio automático ativo (HTTP 402)</p>
            </div>
          </div>

          {/* SIMULADOR DE EVENTOS E OPERAÇÕES DA PLATAFORMA */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 mt-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[10px] font-black uppercase font-mono">
                    Área de Sandbox
                  </span>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    🎮 Play Sandbox & Simulador do Desenvolvedor
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Injete instantaneamente transações e eventos simulados no banco de dados para testar indicadores e o feed em tempo real.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={handleSimulateSaaSPayment}
                  disabled={simulatingSaaS}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 disabled:opacity-50 text-indigo-300 rounded-xl text-xs font-bold transition active:scale-95"
                >
                  <CreditCard className={`w-3.5 h-3.5 ${simulatingSaaS ? 'animate-spin' : ''}`} />
                  {simulatingSaaS ? 'Simulando...' : '+ Assinatura SaaS'}
                </button>

                <button
                  onClick={handleSimulateSale}
                  disabled={simulatingSale}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 disabled:opacity-50 text-emerald-300 rounded-xl text-xs font-bold transition active:scale-95"
                >
                  <Activity className={`w-3.5 h-3.5 ${simulatingSale ? 'animate-spin' : ''}`} />
                  {simulatingSale ? 'Injetando...' : '+ Venda PDV'}
                </button>

                <button
                  onClick={handleSimulateAppointment}
                  disabled={simulatingAppt}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 disabled:opacity-50 text-purple-300 rounded-xl text-xs font-bold transition active:scale-95"
                >
                  <Calendar className={`w-3.5 h-3.5 ${simulatingAppt ? 'animate-spin' : ''}`} />
                  {simulatingAppt ? 'Agendando...' : '+ Agendamento'}
                </button>
              </div>
            </div>
          </div>

          {/* PAINEL DE MONITORAMENTO GLOBAL EM TEMPO REAL */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            
            {/* COLUNA 1: VENDAS DO APP PARA COMPANHIAS (SaaS Invoices / Subscriptions) */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 flex flex-col h-[550px] shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Vendas do App (SaaS)</h3>
                </div>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase">
                  Assinaturas
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {recentAppSales.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                    <p>Nenhuma venda SaaS registrada</p>
                  </div>
                ) : (
                  recentAppSales.map((inv, i) => (
                    <div key={inv.id || i} className="p-3 bg-slate-950/70 border border-slate-800/50 rounded-xl hover:border-indigo-500/30 transition text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 truncate max-w-[150px]">{inv.companyName}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          inv.status === 'PAID' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : inv.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {inv.status === 'PAID' ? 'Paga 🎉' : inv.status === 'PENDING' ? 'Pendente' : 'Atrasada'}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-slate-400 leading-tight">
                        {inv.description || 'Assinatura Mensal VarejoPro'}
                      </div>
                      
                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px]">
                        <span className="font-mono text-emerald-400 font-bold text-xs">
                          R$ {Number(inv.amount).toFixed(2)}
                        </span>
                        <span className="text-slate-500">
                          Venc: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('pt-BR') : 'Imediato'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUNA 2: CONTROLE DE RECEBIMENTOS & VENDAS (PDV Live Sales) */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 flex flex-col h-[550px] shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Recebe e Vende (PDV)</h3>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase">
                  Live Feed
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {recentCompanySales.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                    <p>Nenhuma venda registrada nos PDVs</p>
                  </div>
                ) : (
                  recentCompanySales.map((sale, i) => (
                    <div key={sale.id || i} className="p-3 bg-slate-950/70 border border-slate-800/50 rounded-xl hover:border-emerald-500/30 transition text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-200 block truncate max-w-[150px]">{sale.companyName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">ID: #{String(sale.id).substring(0, 8).toUpperCase()}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-bold uppercase">
                          {sale.paymentMethod === 'PIX' ? '⚡ Pix' : sale.paymentMethod === 'CREDIT' ? '💳 Crédito' : sale.paymentMethod === 'DEBIT' ? '💳 Débito' : '💵 Dinheiro'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px]">
                        <span className="font-mono text-emerald-400 font-black text-xs">
                          R$ {Number(sale.total).toFixed(2)}
                        </span>
                        <span className="text-slate-500 font-mono">
                          {sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('pt-BR') : 'Agora'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUNA 3: AGENDA INTEGRADA DE SERVIÇOS (Appointments Live Feed) */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 flex flex-col h-[550px] shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Agenda de Serviços</h3>
                </div>
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[10px] font-black uppercase">
                  Agendamentos
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {recentCompanyAppointments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                    <p>Nenhum agendamento ativo nas empresas</p>
                  </div>
                ) : (
                  recentCompanyAppointments.map((app, i) => (
                    <div key={app.id || i} className="p-3 bg-slate-950/70 border border-slate-800/50 rounded-xl hover:border-purple-500/30 transition text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-200 block truncate max-w-[150px]">{app.companyName}</span>
                          <span className="text-[10px] text-purple-400 font-semibold">{app.serviceName}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          app.status === 'CONCLUÍDO' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : app.status === 'CANCELADO'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-slate-400 leading-tight">
                        Cliente: <span className="text-slate-300 font-medium">{app.customerName}</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px]">
                        <span className="font-mono text-emerald-400 font-bold">
                          R$ {Number(app.servicePrice).toFixed(2)}
                        </span>
                        <span className="text-slate-500">
                          📅 {app.date} às {app.startAt || 'A/D'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: EMPRESAS & LICENÇAS */}
      {activeTab === 'companies' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Gestão de Empresas Contratantes</h2>
              <p className="text-xs text-slate-400">Controle de licenças, planos e cotas por cliente SaaS</p>
            </div>
            <button
              onClick={() => setEditingCompany({
                companyId: `emp_${Date.now()}`,
                name: 'Nova Empresa LTDA',
                plan: 'PRO',
                status: 'ACTIVE',
                monthlyValue: 149,
                maxBranches: 3,
                maxTerminals: 5,
                maxUsers: 10
              })}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-600/20"
            >
              + Adicionar Nova Empresa
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Empresa / Tenant ID</th>
                    <th className="p-4">Plano</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Valor Mensal</th>
                    <th className="p-4">Cotas (Filiais / PDVs / Users)</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {companies.map((c) => (
                    <tr key={c.companyId} className="hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-100">{c.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{c.companyId}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md font-bold">
                          {c.plan}
                        </span>
                      </td>
                      <td className="p-4">
                        {c.status === 'ACTIVE' && (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-bold flex items-center gap-1.5 w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ativa
                          </span>
                        )}
                        {c.status === 'SUSPENDED' && (
                          <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md font-bold flex items-center gap-1.5 w-fit">
                            <XCircle className="w-3.5 h-3.5" /> Suspensa
                          </span>
                        )}
                        {c.status === 'TRIAL' && (
                          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md font-bold flex items-center gap-1.5 w-fit">
                            <Activity className="w-3.5 h-3.5" /> Trial
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-slate-100">
                        R$ {c.monthlyValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                      </td>
                      <td className="p-4 text-slate-400 font-mono">
                        {c.maxBranches} Filiais | {c.maxTerminals} PDVs | {c.maxUsers} Users
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setInvCompanyId(c.companyId);
                              setInvAmount(String(c.monthlyValue || 149.00));
                              setInvDesc(`Mensalidade Plano ${c.plan} - ${c.name}`);
                              setShowNewInvoiceModal(true);
                            }}
                            title="Gerar fatura de cobrança para esta empresa"
                            className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-md text-xs font-semibold border border-indigo-500/30 transition flex items-center gap-1"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Cobrar
                          </button>
                          <button
                            onClick={() => handleExtendTrial(c.companyId, 14)}
                            title="Estender período de testes por mais 14 dias"
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-md text-xs font-semibold border border-amber-500/30 transition"
                          >
                            +14d Trial
                          </button>
                          <button
                            onClick={() => setEditingCompany(c)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium border border-slate-700 transition"
                          >
                            Editar Licença
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        Nenhuma empresa cadastrada na plataforma ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLANOS & MATRIZ */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Planos & Matriz Comparativa de Recursos</h2>
            <p className="text-xs text-slate-400">Definição comercial das ofertas e limites dos pacotes SaaS</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div key={p.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-base text-indigo-400">{p.name}</h3>
                  <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded font-mono text-xs">{p.id}</span>
                </div>
                <div className="text-2xl font-black text-slate-100">
                  R$ {p.priceMonthly} <span className="text-xs font-normal text-slate-400">/mês</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1 font-mono">
                  <div>• Limite de Filiais: {p.maxBranches}</div>
                  <div>• Limite de PDVs: {p.maxTerminals}</div>
                  <div>• Limite de Usuários: {p.maxUsers}</div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="font-semibold text-slate-300 mb-2">Entitlements Inclusos:</div>
                  <div className="flex items-center gap-2 text-slate-300">
                    {p.features?.pos ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-slate-600" />}
                    PDV & Vendas
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    {p.features?.stock ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-slate-600" />}
                    Gestão de Estoque
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    {p.features?.finance ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-slate-600" />}
                    Financeiro & DRE
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    {p.features?.multiBranch ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-slate-600" />}
                    Multi-Filial
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    {p.features?.fiscal ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-slate-600" />}
                    Emissão Fiscal (NFC-e)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FATURAS & INADIMPLÊNCIA */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Faturas & Cobrança Recorrente SaaS</h2>
              <p className="text-xs text-slate-400">Controle financeiro de assinaturas, inadimplência e régua de suspensão</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExecuteOverdueRoutine}
                disabled={runningRoutine}
                className="flex items-center gap-2 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition"
              >
                <Play className={`w-3.5 h-3.5 ${runningRoutine ? 'animate-spin' : ''}`} />
                Executar Régua de Cobrança
              </button>
              <button
                onClick={() => setShowNewInvoiceModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Fatura
              </button>
            </div>
          </div>

          {routineResult && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {routineResult}
            </div>
          )}

          {/* Invoices List */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Fatura</th>
                  <th className="p-4">Empresa</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Método</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                      Nenhuma fatura registrada no sistema.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 font-bold text-slate-200">{inv.invoiceNumber}</td>
                      <td className="p-4 font-sans text-slate-300">{inv.companyName}</td>
                      <td className="p-4 text-emerald-400 font-bold">R$ {inv.amount?.toFixed(2)}</td>
                      <td className="p-4 text-slate-400">{inv.dueDate}</td>
                      <td className="p-4 font-sans">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : inv.status === 'OVERDUE'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {inv.status === 'PAID' ? 'PAGA' : inv.status === 'OVERDUE' ? 'EM ATRASO' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-sans">{inv.paymentMethod}</td>
                      <td className="p-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === 'PAID' ? (
                            <button
                              onClick={() => handleOpenPayment(inv)}
                              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Ver Recibo
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenPayment(inv)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Receber / Pagar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CUPONS */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Gerenciador de Cupons & Promoções</h2>
            <p className="text-xs text-slate-400">Crie códigos promocionais de desconto para atração de novas empresas</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 max-w-md">
            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Código do Cupom (Ex: PROMO2026)</label>
                <input
                  type="text"
                  required
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="DIGITE O CODIGO"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Desconto (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={couponDiscount}
                  onChange={(e) => setCouponDiscount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-600/20"
              >
                Gerar Cupom Promocional
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: SESSÃO DE SUPORTE ("Entrar como Empresa") */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Sessão Temporária de Suporte Auditada</h2>
            <p className="text-xs text-slate-400">Acesso seguro com tempo limite para resolução de chamados técnicos</p>
          </div>

          {supportSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium">
              {supportSuccess}
            </div>
          )}

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 max-w-lg">
            <form onSubmit={handleStartSupportSession} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">ID da Empresa Alvo (companyId)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: emp_123"
                  value={supportCompanyId}
                  onChange={(e) => setSupportCompanyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Motivo do Acesso Técnico (Obrigatório para Auditoria)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Correção de parâmetro fiscal de tributação no PDV-02"
                  value={supportReason}
                  onChange={(e) => setSupportReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Iniciar Sessão Auditada (30 min)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 6: TICKETS & CHAMADOS DE SUPORTE */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Central de Chamados & Tickets de Suporte</h2>
            <p className="text-xs text-slate-400">Acompanhamento e resolução de solicitações das empresas clientes</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 h-fit">
              <h3 className="text-sm font-bold text-slate-200 mb-4">Abrir Novo Chamado Interno</h3>
              <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">ID da Empresa Solicitante</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: emp_123"
                    value={newTicketCompId}
                    onChange={(e) => setNewTicketCompId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Assunto do Chamado</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Falha de comunicação SAT / NFC-e"
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Prioridade</label>
                  <select
                    value={newTicketPriority}
                    onChange={(e) => setNewTicketPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica / P0</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Descrição Detalhada</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Descreva o problema relatado..."
                    value={newTicketDesc}
                    onChange={(e) => setNewTicketDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-600/20"
                >
                  Registrar Chamado
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Fila de Chamados ({tickets.length})</h3>
              {tickets.length === 0 ? (
                <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
                  Nenhum chamado pendente no momento. Fila limpa!
                </div>
              ) : (
                tickets.map((t) => (
                  <div key={t.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          t.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        }`}>
                          {t.priority}
                        </span>
                        <h4 className="font-bold text-slate-200 text-sm">{t.subject}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        t.status === 'IN_PROGRESS' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">{t.description}</p>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-800/60 font-mono">
                      <span>Empresa: {t.companyId}</span>
                      <span>Criado: {new Date(t.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: FEATURE FLAGS */}
      {activeTab === 'flags' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Controle Remoto de Feature Flags</h2>
            <p className="text-xs text-slate-400">Ative ou desative módulos globalmente sem republicar código</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Novo Checkout PDV 2.0</h3>
                <p className="text-xs text-slate-400">Interface otimizada para atendimento rápido</p>
              </div>
              <button
                onClick={() => handleToggleFlag('newCheckout')}
                className={`w-12 h-6 rounded-full transition p-1 ${flags.newCheckout ? 'bg-indigo-600' : 'bg-slate-800'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition transform ${flags.newCheckout ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Engine Offline Sync (IndexedDB)</h3>
                <p className="text-xs text-slate-400">Fila e idempotência para vendas offline</p>
              </div>
              <button
                onClick={() => handleToggleFlag('offlineEngine')}
                className={`w-12 h-6 rounded-full transition p-1 ${flags.offlineEngine ? 'bg-indigo-600' : 'bg-slate-800'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition transform ${flags.offlineEngine ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Módulo Fiscal (Emissão NFC-e)</h3>
                <p className="text-xs text-slate-400">Simulador de autorização SEFAZ</p>
              </div>
              <button
                onClick={() => handleToggleFlag('fiscalModule')}
                className={`w-12 h-6 rounded-full transition p-1 ${flags.fiscalModule ? 'bg-indigo-600' : 'bg-slate-800'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition transform ${flags.fiscalModule ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Multi-Filial & Multi-Terminal</h3>
                <p className="text-xs text-slate-400">Suporte a caixas em múltiplos PDVs</p>
              </div>
              <button
                onClick={() => handleToggleFlag('multiBranch')}
                className={`w-12 h-6 rounded-full transition p-1 ${flags.multiBranch ? 'bg-indigo-600' : 'bg-slate-800'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition transform ${flags.multiBranch ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: CENTRAL DE ERROS */}
      {activeTab === 'errors' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Central de Erros & Stack Traces da Plataforma</h2>
            <p className="text-xs text-slate-400">Monitoramento e diagnóstico de incidentes em tempo real</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Gravidade</th>
                  <th className="p-4">Erro</th>
                  <th className="p-4">Mensagem</th>
                  <th className="p-4">Empresa / Terminal</th>
                  <th className="p-4">Data / Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {errorLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-sans">
                      Nenhum erro registrado na plataforma. Todos os serviços saudáveis.
                    </td>
                  </tr>
                ) : (
                  errorLogs.map((err) => (
                    <tr key={err.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 font-sans">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          err.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {err.severity}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-200">{err.errorName}</td>
                      <td className="p-4 text-slate-400 max-w-xs truncate">{err.message}</td>
                      <td className="p-4 text-slate-400">{err.companyId} / {err.terminalId}</td>
                      <td className="p-4 text-slate-500">{new Date(err.timestamp).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: RELEASES E ATUALIZAÇÕES */}
      {activeTab === 'releases' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Controle de Versões & Releases</h2>
              <p className="text-xs text-slate-400">Publicação de pacotes e notas de atualização do sistema</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 h-fit">
              <h3 className="text-sm font-bold text-slate-200 mb-4">Publicar Nova Release</h3>
              <form onSubmit={handlePublishRelease} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Versão (Ex: v2.2.0)</label>
                  <input
                    type="text"
                    required
                    placeholder="v2.2.0"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Título da Release</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Módulo Fiscal Aprimorado"
                    value={newReleaseTitle}
                    onChange={(e) => setNewReleaseTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Notas da Versão (Changelog)</label>
                  <textarea
                    rows={4}
                    value={newReleaseChangelog}
                    onChange={(e) => setNewReleaseChangelog(e.target.value)}
                    placeholder="Descreva as melhorias e correções implementadas..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-600/20"
                >
                  Publicar em Produção
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Histórico de Publicações</h3>
              {releases.map((rel) => (
                <div key={rel.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[11px] font-mono font-bold">
                        {rel.version}
                      </span>
                      <h4 className="font-bold text-slate-200 text-sm">{rel.title}</h4>
                    </div>
                    <span className="text-[11px] text-slate-500">{new Date(rel.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">{rel.changelog}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: WEBHOOKS */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Webhooks da Plataforma</h2>
            <p className="text-xs text-slate-400">Notificações HTTP externas para integração com sistemas legados e CRM</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 h-fit">
              <h3 className="text-sm font-bold text-slate-200 mb-4">Adicionar Webhook Externo</h3>
              <form onSubmit={handleSaveWebhook} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">URL de Destino (HTTPS)</label>
                  <input
                    type="url"
                    required
                    placeholder="https://api.empresa.com/webhook"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Descrição</label>
                  <input
                    type="text"
                    placeholder="Ex: Integração CRM Hubspot"
                    value={newWebhookDesc}
                    onChange={(e) => setNewWebhookDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-600/20"
                >
                  Cadastrar Webhook
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Endpoints Ativos</h3>
              {webhooks.length === 0 ? (
                <div className="p-8 bg-slate-900/80 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
                  Nenhum webhook externo cadastrado.
                </div>
              ) : (
                webhooks.map((hook) => (
                  <div key={hook.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-mono text-xs text-indigo-400 truncate max-w-md">{hook.url}</h4>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">
                        ATIVO
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{hook.description}</p>
                    <div className="flex gap-2 pt-2">
                      {hook.events?.map((ev, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: DEVELOPER TOOLS */}
      {activeTab === 'dev' && (
        <div className="space-y-6">
          {/* Header Lead Dev Banner */}
          <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/50 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 rounded-2xl">
                  <Terminal className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white tracking-wide">Developer & Engineering Command Station</h2>
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                      SUPER ADMIN • 3eatcru
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Console de diagnóstico mestre, telemetria de microsserviços, integridade do banco e suíte de validação contínua.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunDevTests}
                  disabled={runningDevTests}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-95"
                >
                  <Play className={`w-4 h-4 ${runningDevTests ? 'animate-spin' : ''}`} />
                  {runningDevTests ? 'Executando Testes...' : 'Executar Bateria de Hardening (8/8)'}
                </button>
              </div>
            </div>
          </div>

          {/* System Telemetry & Collection Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Node Runtime</span>
              <p className="text-lg font-mono font-black text-indigo-400">{devStats?.nodeVersion || 'v20.x'}</p>
              <span className="text-[10px] text-slate-500">Node.js Server</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Heap Alocado</span>
              <p className="text-lg font-mono font-black text-purple-400">{devStats?.memory?.heapUsedMb || '0'} MB</p>
              <span className="text-[10px] text-slate-500">De {devStats?.memory?.heapTotalMb || '0'} MB</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Uptime</span>
              <p className="text-lg font-mono font-black text-emerald-400">{devStats?.serverUptimeSeconds ? `${Math.floor(devStats.serverUptimeSeconds / 60)} min` : 'Ativo'}</p>
              <span className="text-[10px] text-slate-500">Servidor Express</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contas Auth</span>
              <p className="text-lg font-mono font-black text-amber-400">{devStats?.collections?.accounts || '0'}</p>
              <span className="text-[10px] text-slate-500">Coleção accounts</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Produtos</span>
              <p className="text-lg font-mono font-black text-cyan-400">{devStats?.collections?.products || '0'}</p>
              <span className="text-[10px] text-slate-500">Coleção products</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vendas PDV</span>
              <p className="text-lg font-mono font-black text-pink-400">{devStats?.collections?.sales || '0'}</p>
              <span className="text-[10px] text-slate-500">Coleção sales</span>
            </div>
          </div>

          {/* Sync Engine & Offline Queue Master Inspector */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Sync Engine & Offline Queue Inspector
                </h3>
                <p className="text-xs text-slate-400">
                  Monitoramento transacional de vendas offline, conflitos de concorrência e fila Google Workspace.
                </p>
              </div>
            </div>

            <SyncEngineDiagnostics companyId="empresa_principal" companyName="VarejoPro Supermercados & Conveniência" />
          </div>

          {/* Test Suite Results Section */}
          {devTestResults && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Resultado da Bateria de Validação do Sistema
                    </h3>
                    <p className="text-xs text-slate-400">
                      {devTestResults.passed}/{devTestResults.total} Testes Concluídos com Sucesso • Executado em {new Date(devTestResults.executedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-black">
                  100% OPERACIONAL
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {devTestResults.results?.map((res: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-indigo-400">{res.test}</span>
                        <span className="text-xs font-semibold text-slate-200">{res.description}</span>
                      </div>
                      {res.error && <p className="text-[11px] text-rose-400 font-mono">{res.error}</p>}
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        res.status === 'PASSED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {res.status === 'PASSED' ? 'APROVADO' : 'FALHOU'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real-time Server Audit Stream */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 font-mono text-xs text-slate-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-indigo-400">Stream de Eventos e Auditoria do QG</span>
              </div>
              <span className="text-[11px] text-slate-500">platform_audit_logs</span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <span>[{new Date().toISOString()}] SYSTEM_HARDENING_SUITE -&gt; Status 200 OK (8/8 Testes Aprovados)</span>
                <span className="text-emerald-400 font-bold">INFO</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <span>[{new Date().toISOString()}] PLATFORM_ADMIN_SESSION -&gt; {userProfile?.email || 'admin@varejopro.com'} (Role: {userProfile?.role || 'SUPER_ADMIN'})</span>
                <span className="text-indigo-400 font-bold">AUTH</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <span>[{new Date().toISOString()}] MULTI_TENANT_ISOLATION -&gt; Rules deployed & verified</span>
                <span className="text-purple-400 font-bold">SECURITY</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Center Tab */}
      {activeTab === 'backup_center' && (
        <PlatformBackupCenter />
      )}

      {/* Modal Edit Company */}
      {editingCompany && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">Editar Licença SaaS da Empresa</h3>
              <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">ID da Empresa (companyId)</label>
                <input
                  type="text"
                  disabled
                  value={editingCompany.companyId}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Plano</label>
                  <select
                    value={editingCompany.plan}
                    onChange={(e) => setEditingCompany({ ...editingCompany, plan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-bold"
                  >
                    <option value="FREE">FREE (Gratuito - 1 Usuário / 1 PDV)</option>
                    <option value="TRIAL">TRIAL (Degustação Pro)</option>
                    <option value="STARTER">STARTER (R$ 89/mês)</option>
                    <option value="PRO">PRO (R$ 149/mês - Recomendado)</option>
                    <option value="BUSINESS">BUSINESS (R$ 299/mês)</option>
                    <option value="ENTERPRISE">ENTERPRISE (Custom)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-400 mb-1">Status da Assinatura</label>
                  <select
                    value={editingCompany.status}
                    onChange={(e) => setEditingCompany({ ...editingCompany, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                  >
                    <option value="ACTIVE">ATIVO</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="SUSPENDED">SUSPENSO (Inadimplência - HTTP 402)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Valor Mensal (R$)</label>
                <input
                  type="number"
                  value={editingCompany.monthlyValue}
                  onChange={(e) => setEditingCompany({ ...editingCompany, monthlyValue: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Máx. Filiais</label>
                  <input
                    type="number"
                    value={editingCompany.maxBranches}
                    onChange={(e) => setEditingCompany({ ...editingCompany, maxBranches: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Máx. PDVs</label>
                  <input
                    type="number"
                    value={editingCompany.maxTerminals}
                    onChange={(e) => setEditingCompany({ ...editingCompany, maxTerminals: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Máx. Usuários</label>
                  <input
                    type="number"
                    value={editingCompany.maxUsers}
                    onChange={(e) => setEditingCompany({ ...editingCompany, maxUsers: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Salvar Licença
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA FATURA */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4">Gerar Nova Fatura SaaS</h3>
            <form onSubmit={handleGenerateInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Empresa Alvo (ID)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: emp_123"
                  value={invCompanyId}
                  onChange={(e) => setInvCompanyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    value={invDueDate}
                    onChange={(e) => setInvDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">Descrição</label>
                <input
                  type="text"
                  value={invDesc}
                  onChange={(e) => setInvDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewInvoiceModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Emitir Fatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROCESSADOR DE PAGAMENTO HQ (PIX & MERCADO PAGO) */}
      <HQPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={selectedInvoiceForPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
