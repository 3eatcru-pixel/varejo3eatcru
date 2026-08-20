import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  Users, 
  Calendar, 
  ExternalLink, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles, 
  Eye, 
  Scissors, 
  Utensils, 
  Store, 
  Smartphone, 
  BarChart3, 
  Layers, 
  CheckCircle,
  X,
  Share2
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '../../contexts/AuthContext';
import PulsePublicPortal from './PulsePublicPortal';

interface PulseQRCode {
  id: string;
  code: string;
  title: string;
  description?: string;
  context: 'SERVICE_BOOKING' | 'TABLE_MENU' | 'STAFF_PROFILE' | 'PRODUCT_CATALOG' | 'COMPANY_GATEWAY';
  targetData?: {
    serviceIds?: string[];
    staffIds?: string[];
    tableNumber?: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
  scanCount: number;
  conversionCount: number;
  welcomeMessage?: string;
  createdAt: string;
}

export default function PulseDashboard() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.companyId || 'empresa_principal';

  const [qrcodes, setQrcodes] = useState<PulseQRCode[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContextFilter, setSelectedContextFilter] = useState<string>('ALL');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQr, setEditingQr] = useState<PulseQRCode | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<PulseQRCode | null>(null);
  const [showCustomerPreview, setShowCustomerPreview] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formContext, setFormContext] = useState<'SERVICE_BOOKING' | 'TABLE_MENU' | 'STAFF_PROFILE' | 'PRODUCT_CATALOG' | 'COMPANY_GATEWAY'>('SERVICE_BOOKING');
  const [formWelcome, setFormWelcome] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // QR Code Canvas ref for downloading/printing
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resQrs, resMetrics, resServ, resProf] = await Promise.all([
        fetch('/api/pulse/qrcodes'),
        fetch('/api/pulse/dashboard-metrics'),
        fetch('/api/services'),
        fetch('/api/professionals')
      ]);

      const dataQrs = await resQrs.json();
      const dataMetrics = await resMetrics.json();
      const dataServ = await resServ.json();
      const dataProf = await resProf.json();

      if (dataQrs.success) setQrcodes(dataQrs.qrcodes || []);
      if (dataMetrics.success) setMetrics(dataMetrics.metrics);
      if (dataServ.success) setServices(dataServ.services || []);
      if (dataProf.success) setProfessionals(dataProf.professionals || []);
    } catch (err) {
      console.error('Erro ao carregar dados do Pulse:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Generate QR Code image when print modal is opened
  useEffect(() => {
    if (showPrintModal) {
      const publicUrl = `${window.location.origin}/?pulse=${showPrintModal.code}`;
      QRCode.toDataURL(publicUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }, (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      });
    }
  }, [showPrintModal]);

  const handleOpenCreateModal = (qrToEdit?: PulseQRCode) => {
    if (qrToEdit) {
      setEditingQr(qrToEdit);
      setFormTitle(qrToEdit.title);
      setFormDesc(qrToEdit.description || '');
      setFormCode(qrToEdit.code);
      setFormContext(qrToEdit.context);
      setFormWelcome(qrToEdit.welcomeMessage || '');
      setSelectedServiceIds(qrToEdit.targetData?.serviceIds || []);
      setSelectedStaffIds(qrToEdit.targetData?.staffIds || []);
    } else {
      setEditingQr(null);
      setFormTitle('');
      setFormDesc('');
      setFormCode('');
      setFormContext('SERVICE_BOOKING');
      setFormWelcome('');
      setSelectedServiceIds([]);
      setSelectedStaffIds([]);
    }
    setShowCreateModal(true);
  };

  const handleSaveQrCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('O título do QR Code é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      const targetData: any = {};
      if (formContext === 'SERVICE_BOOKING') {
        targetData.serviceIds = selectedServiceIds;
        targetData.staffIds = selectedStaffIds;
      } else if (formContext === 'TABLE_MENU' || formContext === 'COMPANY_GATEWAY') {
        targetData.tableNumber = selectedStaffIds[0] || '';
      }

      const payload = {
        id: editingQr?.id || undefined,
        code: formCode.trim().toUpperCase() || undefined,
        title: formTitle.trim(),
        description: formDesc.trim(),
        context: formContext,
        welcomeMessage: formWelcome.trim(),
        targetData
      };

      const res = await fetch('/api/pulse/qrcodes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        fetchData();
      } else {
        alert(json.error || 'Erro ao salvar QR Code Pulse.');
      }
    } catch (err: any) {
      alert('Erro ao se comunicar com o servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (qr: PulseQRCode) => {
    const newStatus = qr.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch('/api/pulse/qrcodes/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: qr.id, status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleDeleteQr = async (id: string) => {
    if (!confirm('Deseja realmente excluir este QR Code Pulse?')) return;
    try {
      const res = await fetch(`/api/pulse/qrcodes/delete?id=${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/?pulse=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredQrs = qrcodes.filter((qr) => {
    const matchesSearch = qr.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          qr.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesContext = selectedContextFilter === 'ALL' || qr.context === selectedContextFilter;
    return matchesSearch && matchesContext;
  });

  if (showCustomerPreview) {
    return (
      <PulsePublicPortal 
        initialCode={showCustomerPreview} 
        onClose={() => setShowCustomerPreview(null)} 
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      
      {/* Header Title & Branding */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <QrCode className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-800">3eatcru Pulse</h1>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                Módulo Ativo
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Engajamento dinâmico por QR Code. Atualize preços e serviços sem precisar re-imprimir os códigos!
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenCreateModal()}
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Novo QR Code Pulse</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">QR Codes Ativos</span>
            <QrCode className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{metrics?.activeQrsCount || 0}</span>
            <span className="text-xs font-bold text-slate-400">de {metrics?.totalQrsCount || 0} criados</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Total Escaneamentos</span>
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{metrics?.totalScans || 0}</span>
            <span className="text-xs font-bold text-emerald-600">+100% via mobile</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Agendamentos Gerados</span>
            <Calendar className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{metrics?.totalAppointments || 0}</span>
            <span className="text-xs font-bold text-indigo-600">Direto na Agenda</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Taxa de Conversão</span>
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{metrics?.conversionRate || 0}%</span>
            <span className="text-xs font-bold text-slate-400">Escaneado x Agendado</span>
          </div>
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título ou código (ex: 8F72KQ)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">Contexto:</span>
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'SERVICE_BOOKING', label: 'Agendamento' },
            { id: 'TABLE_MENU', label: 'Cardápio / Mesa' },
            { id: 'STAFF_PROFILE', label: 'Profissional' },
            { id: 'COMPANY_GATEWAY', label: 'Portal Completo' }
          ].map((ctx) => (
            <button
              key={ctx.id}
              onClick={() => setSelectedContextFilter(ctx.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedContextFilter === ctx.id 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {ctx.label}
            </button>
          ))}
        </div>
      </div>

      {/* QR Codes Grid */}
      {filteredQrs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-sm">
          <QrCode className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-700 uppercase tracking-wider">Nenhum QR Code Pulse Encontrado</h3>
            <p className="text-xs font-medium text-slate-400 max-w-sm mx-auto">
              Crie seu primeiro QR Code dinâmico para colocar em plaquetas na recepção, nas mesas ou compartilhar nas redes sociais!
            </p>
          </div>
          <button
            onClick={() => handleOpenCreateModal()}
            className="px-5 py-2.5 bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all inline-flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Criar Primeiro QR Code
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQrs.map((qr) => {
            const isInactive = qr.status === 'INACTIVE';
            return (
              <div 
                key={qr.id} 
                className={`bg-white rounded-3xl border p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all ${
                  isInactive ? 'border-slate-200 opacity-60 bg-slate-50/50' : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badge & Code */}
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      {qr.context === 'SERVICE_BOOKING' && 'Agendamento Serviços'}
                      {qr.context === 'TABLE_MENU' && 'Cardápio / Mesa'}
                      {qr.context === 'STAFF_PROFILE' && 'Profissional'}
                      {qr.context === 'COMPANY_GATEWAY' && 'Portal Completo'}
                    </span>

                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      #{qr.code}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{qr.title}</h3>
                    {qr.description && (
                      <p className="text-xs font-medium text-slate-500 line-clamp-2 mt-0.5">{qr.description}</p>
                    )}
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Escaneamentos</span>
                      <span className="text-sm font-black text-slate-800">{qr.scanCount || 0}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Agendamentos</span>
                      <span className="text-sm font-black text-emerald-600">{qr.conversionCount || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    {/* Printable Plaqueta Modal */}
                    <button
                      onClick={() => setShowPrintModal(qr)}
                      title="Imprimir Plaqueta / QR Code"
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {/* Customer Preview View */}
                    <button
                      onClick={() => setShowCustomerPreview(qr.code)}
                      title="Testar Visão do Cliente"
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Copy Link */}
                    <button
                      onClick={() => handleCopyLink(qr.code)}
                      title="Copiar Link"
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                    >
                      {copiedCode === qr.code ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>

                    {/* Edit Target */}
                    <button
                      onClick={() => handleOpenCreateModal(qr)}
                      title="Editar Destino"
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Status Toggle */}
                    <button
                      onClick={() => handleToggleStatus(qr)}
                      title={isInactive ? 'Ativar QR Code' : 'Desativar QR Code'}
                      className={`p-1.5 rounded-xl transition-all ${
                        isInactive ? 'text-slate-400 hover:text-emerald-600' : 'text-emerald-600 hover:text-slate-400'
                      }`}
                    >
                      {isInactive ? <ToggleLeft className="w-6 h-6" /> : <ToggleRight className="w-6 h-6" />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteQr(qr.id)}
                      title="Excluir"
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT QR CODE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-slate-800">
                    {editingQr ? 'Editar QR Code Pulse' : 'Novo QR Code Pulse'}
                  </h2>
                  <p className="text-xs font-semibold text-slate-400">Configure o destino e comportamento dinâmico</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQrCode} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                  Título do QR Code (Ex: Recepção, Balcão, Mesa 05) *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Agende seu horário na recepção"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                  Mensagem de Boas-Vindas para o Cliente
                </label>
                <input
                  type="text"
                  value={formWelcome}
                  onChange={(e) => setFormWelcome(e.target.value)}
                  placeholder="Ex: Seja bem-vindo! Escolha seu serviço e horário livre."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                    Contexto de Entrada
                  </label>
                  <select
                    value={formContext}
                    onChange={(e: any) => setFormContext(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="SERVICE_BOOKING">Agendamento de Serviços</option>
                    <option value="TABLE_MENU">Cardápio / Mesa</option>
                    <option value="STAFF_PROFILE">Perfil de Profissional</option>
                    <option value="COMPANY_GATEWAY">Portal Completo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                    Código Personalizado (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="Auto (Ex: 8F72KQ)"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Table Number Field for Menu Context */}
              {(formContext === 'TABLE_MENU' || formContext === 'COMPANY_GATEWAY') && (
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                    Número / Identificação da Mesa (Opcional)
                  </label>
                  <input
                    type="text"
                    value={selectedStaffIds[0] || ''}
                    onChange={(e) => setSelectedStaffIds([e.target.value])} // Repurposing array for quick storage
                    placeholder="Ex: Mesa 04, Suíte 12..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Service Filter checkboxes if context is SERVICE_BOOKING */}
              {formContext === 'SERVICE_BOOKING' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                    Serviços Exibidos neste QR (Selecione ou Deixe Vazio para Todos)
                  </label>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    {services.map((serv) => {
                      const isChecked = selectedServiceIds.includes(serv.id);
                      return (
                        <label key={serv.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedServiceIds([...selectedServiceIds, serv.id]);
                              } else {
                                setSelectedServiceIds(selectedServiceIds.filter(id => id !== serv.id));
                              }
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{serv.name}</span>
                          <span className="text-[10px] text-emerald-600 font-bold ml-auto">
                            R$ {Number(serv.price || 0).toFixed(2)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
                >
                  {saving ? 'Salvando...' : 'Salvar QR Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE PLAQUETA / DISPLAY CARD MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-150">
            
            {/* Plaqueta Card Frame */}
            <div id="printable-plaqueta" className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl border-2 border-emerald-500/40 shadow-xl space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                  3eatcru Pulse
                </span>
                <h3 className="text-lg font-black uppercase tracking-wider text-white pt-1">
                  {showPrintModal.title}
                </h3>
                <p className="text-[11px] font-medium text-slate-300">
                  Aponte a câmera do celular para agendar instantaneamente!
                </p>
              </div>

              {/* Rendered QR Code */}
              <div className="p-3 bg-white rounded-2xl inline-block shadow-inner mx-auto">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs font-bold">
                    Gerando QR...
                  </div>
                )}
              </div>

              <div className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                Código: #{showPrintModal.code}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-2">
              <div className="flex gap-2">
                {/* Download PNG */}
                <a
                  href={qrDataUrl}
                  download={`pulse_qrcode_${showPrintModal.code}.png`}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Baixar PNG
                </a>

                {/* Print Button */}
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
              </div>

              <button
                onClick={() => setShowPrintModal(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
