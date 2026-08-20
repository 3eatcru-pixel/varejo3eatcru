import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Store, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  ArrowLeft, 
  Scissors, 
  Phone, 
  MapPin, 
  MessageSquare, 
  ShoppingBag, 
  Check, 
  Utensils, 
  Star,
  ExternalLink,
  Share2,
  DollarSign,
  Users,
  X,
  RefreshCw,
  Plus,
  Eye,
  Settings,
  Grid
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface PulsePublicPortalProps {
  initialCode?: string;
  onClose?: () => void;
}

export default function PulsePublicPortal({ initialCode, onClose }: PulsePublicPortalProps) {
  const [operationalConfig, setOperationalConfig] = useState<any>(null);
  // Determine code from prop, query parameter or pathname
  const [pulseCode, setPulseCode] = useState<string>(() => {
    if (initialCode) return initialCode;
    const urlParams = new URLSearchParams(window.location.search);
    const qParam = urlParams.get('pulse') || urlParams.get('p') || urlParams.get('code');
    if (qParam) return qParam;
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2 && (pathParts[0] === 'pulse' || pathParts[0] === 'v')) {
      return pathParts[1];
    }
    return '8F72KQ'; // Default demo fallback code
  });

  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Payload resolved from backend
  const [data, setData] = useState<{
    qrCode: any;
    company: any;
    services: any[];
    professionals: any[];
    products: any[];
  } | null>(null);

  // Flow State
  const [step, setStep] = useState<'GATEWAY' | 'SERVICE_SELECT' | 'STAFF' | 'SLOT' | 'DETAILS' | 'CONFIRMED' | 'MENU' | 'CART'>('GATEWAY');
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('14:00');
  
  // Table Menu Flow State
  const [cartItems, setCartItems] = useState<{product: any, quantity: number}[]>([]);
  const [callingStaff, setCallingStaff] = useState(false);
  const [staffCalled, setStaffCalled] = useState(false);
  const [requestingPay, setRequestingPay] = useState(false);
  const [payRequested, setPayRequested] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<'PIX' | 'CARTÃO' | 'DINHEIRO'>('PIX');

  // Universal Atendimento Local state
  const [session, setSession] = useState<any | null>(null);
  const [showAddConsumoModal, setShowAddConsumoModal] = useState(false);
  const [addConsumoForm, setAddConsumoForm] = useState({ amount: '', description: '' });
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitParts, setSplitParts] = useState('2');
  const [splitResult, setSplitResult] = useState<any | null>(null);
  const [showConsumoModal, setShowConsumoModal] = useState(false);
  
  // Customer details form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [confirmedAppt, setConfirmedAppt] = useState<any | null>(null);

  const fetchPortalData = async (codeToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pulse/public/resolve/${codeToFetch}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.activeSession) {
          setSession(json.activeSession);
        }
        
        // Fetch operational settings from firestore
        const compId = json.company?.id;
        if (compId) {
          try {
            const opDoc = await getDoc(doc(db, 'settings', `operational_${compId}`));
            if (opDoc.exists()) {
              setOperationalConfig(opDoc.data());
            }
          } catch (e) {
            console.warn('Erro ao carregar configurações operacionais:', e);
          }
        }

        // Pre-select first service if available
        if (json.qrCode?.context === 'TABLE_MENU') {
          setStep('MENU');
        } else if (json.qrCode?.context === 'COMPANY_GATEWAY') {
          setStep('GATEWAY');
        } else {
          setStep('SERVICE_SELECT');
        }
      } else {
        setError(json.error || 'Não foi possível carregar as informações do QR Code Pulse.');
      }
    } catch (err: any) {
      setError('Erro de conexão ao carregar o portal Pulse.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pulseCode) {
      fetchPortalData(pulseCode);
    }
  }, [pulseCode]);

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      setPulseCode(inputCode.trim().toUpperCase());
    }
  };

  const handleCallStaff = async () => {
    setCallingStaff(true);
    setActionError(null);
    try {
      const url = session?.id 
        ? `/api/atendimento-local/${session.id}/chamar` 
        : '/api/pulse/public/call-staff';
      const body = session?.id 
        ? {} 
        : { code: pulseCode };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.success) {
        setStaffCalled(true);
        setTimeout(() => setStaffCalled(false), 5000);
      } else {
        setActionError(json.error || 'Erro ao chamar atendente.');
      }
    } catch (err) {
      setActionError('Erro de conexão ao chamar atendente.');
    } finally {
      setCallingStaff(false);
    }
  };

  const handleRequestPay = async () => {
    setRequestingPay(true);
    setActionError(null);
    try {
      const url = session?.id 
        ? `/api/atendimento-local/${session.id}/pagar` 
        : '/api/pulse/public/pay-table';
      const body = session?.id 
        ? { method: selectedPayMethod } 
        : { code: pulseCode, method: selectedPayMethod };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.success) {
        setPayRequested(true);
        if (session) {
          setSession({ ...session, status: 'AGUARDANDO_PAGAMENTO' });
        }
        setTimeout(() => setPayRequested(false), 8000);
      } else {
        setActionError(json.error || 'Erro ao solicitar pagamento.');
      }
    } catch (err) {
      setActionError('Erro de conexão ao solicitar fechamento de conta.');
    } finally {
      setRequestingPay(false);
    }
  };

  const handleAddConsumoSim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.id) return;
    const amountNum = parseFloat(addConsumoForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError('Valor inválido.');
      return;
    }

    try {
      // Simulate adding consumption via the authenticated endpoint as a fast demo 
      // (we will call the /consumo endpoint with standard fetch)
      const res = await fetch(`/api/atendimento-local/${session.id}/consumo`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Use master token or fallback for demo simplicity since it's a simulated client action
          'Authorization': `Bearer ${localStorage.getItem('varejopro_auth_token') || ''}`
        },
        body: JSON.stringify({ amount: amountNum, description: addConsumoForm.description || 'Consumo adicional' })
      });
      const json = await res.json();
      if (json.success) {
        setSession({ ...session, totalConsumo: json.totalConsumo, status: 'OCUPADO' });
        setShowAddConsumoModal(false);
        setAddConsumoForm({ amount: '', description: '' });
      } else {
        setActionError(json.error || 'Erro ao adicionar consumo. Verifique se está autenticado no sistema.');
      }
    } catch (err) {
      setActionError('Erro de conexão ao simular consumo.');
    }
  };

  const handleTransferSim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.id || !transferTarget.trim()) return;

    try {
      const res = await fetch(`/api/atendimento-local/${session.id}/transferir`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('varejopro_auth_token') || ''}`
        },
        body: JSON.stringify({ targetIdentifier: transferTarget.trim() })
      });
      const json = await res.json();
      if (json.success) {
        // Transfer successful, let's refresh page
        fetchPortalData(pulseCode);
        setShowTransferModal(false);
        setTransferTarget('');
        alert(`Sucesso! Atendimento transferido para ${transferTarget}.`);
      } else {
        setActionError(json.error || 'Erro ao transferir. É necessário estar autenticado no sistema.');
      }
    } catch (err) {
      setActionError('Erro de conexão ao transferir atendimento.');
    }
  };

  const handleSplitCalculation = () => {
    const parts = parseInt(splitParts);
    if (isNaN(parts) || parts <= 0) return;
    const total = session?.totalConsumo || 0;
    setSplitResult({
      parts,
      valuePerPart: total / parts,
      total
    });
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    setSubmitting(true);
    setActionError(null);
    try {
      const payload = {
        code: pulseCode,
        customerName: customerName || 'Mesa',
        items: cartItems.map(c => ({
          id: c.product.id,
          name: c.product.name,
          price: c.product.price,
          quantity: c.quantity
        })),
        notes: bookingNotes
      };

      const res = await fetch('/api/pulse/public/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (json.success) {
        setStep('CONFIRMED');
        setCartItems([]);
      } else {
        setActionError(json.error || 'Erro ao realizar pedido.');
      }
    } catch (err) {
      setActionError('Erro de comunicação. Não foi possível realizar o pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateCart = (product: any, delta: number) => {
    setCartItems(prev => {
      const existing = prev.find(p => p.product.id === product.id);
      if (existing) {
        const nextQty = existing.quantity + delta;
        if (nextQty <= 0) return prev.filter(p => p.product.id !== product.id);
        return prev.map(p => p.product.id === product.id ? { ...p, quantity: nextQty } : p);
      } else {
        if (delta > 0) return [...prev, { product, quantity: 1 }];
        return prev;
      }
    });
  };

  const cartTotal = cartItems.reduce((acc, item) => acc + (Number(item.product.price || 0) * item.quantity), 0);
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!customerName || !selectedService || !selectedTimeSlot) {
      setActionError('Por favor, preencha todos os campos obrigatórios (nome, serviço e horário).');
      return;
    }

    setSubmitting(true);
    try {
      const startAt = `${selectedDate}T${selectedTimeSlot}:00`;
      const payload = {
        code: pulseCode,
        customerName,
        customerPhone,
        customerEmail,
        serviceId: selectedService.id,
        professionalId: selectedStaff?.id || (data?.professionals[0]?.id || 'geral'),
        startAt,
        notes: bookingNotes
      };

      const res = await fetch('/api/pulse/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        setConfirmedAppt(json.appointment);
        setStep('CONFIRMED');
      } else {
        setActionError(json.error || 'Não foi possível concluir o agendamento.');
      }
    } catch (err: any) {
      setActionError('Erro de comunicação com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate available time slots for the day
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-900 text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center animate-pulse">
          <QrCode className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-100">3eatcru Varejo Pulse</h2>
          <p className="text-xs font-bold text-slate-400">Carregando portal do estabelecimento...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 space-y-6">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white uppercase tracking-wider">Código Não Encontrado</h3>
            <p className="text-xs font-medium text-slate-400 leading-relaxed">
              {error || 'Não foi possível encontrar este QR Code Pulse.'}
            </p>
          </div>

          <form onSubmit={handleManualCodeSubmit} className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-left">
              Digitar Código do QR Code:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Ex: 8F72KQ"
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-emerald-400 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all"
              >
                Buscar
              </button>
            </div>
          </form>

          {onClose && (
            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-white underline pt-2"
            >
              Voltar ao sistema
            </button>
          )}
        </div>
      </div>
    );
  }

  const { company, qrCode, services, professionals, products } = data;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center p-3 md:p-6 font-sans">
      
      {/* Top Mobile Bar */}
      <div className="w-full max-w-md flex items-center justify-between pb-4 border-b border-slate-800/60 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-white">3eatcru Varejo</span>
            <span className="text-[10px] font-extrabold tracking-widest text-emerald-400 block uppercase">Pulse Gateway</span>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-xl transition-all flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </button>
        )}
      </div>

      {/* Main Mobile Screen Container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col flex-1">
        
        {actionError && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-rose-300">{actionError}</p>
          </div>
        )}

        {/* Header Hero Branding */}
        <div 
          className="p-6 relative overflow-hidden border-b border-slate-800"
          style={{
            background: `linear-gradient(135deg, ${company.primaryColor || '#059669'} 0%, #0f172a 100%)`
          }}
        >
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-2 flex items-center justify-center shrink-0">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt={company.name} className="max-w-full max-h-full object-contain rounded-xl" />
                ) : (
                  <Store className="w-7 h-7 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-wide uppercase">{company.name}</h1>
                <p className="text-xs font-bold text-white/80 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {qrCode.title || 'Agendamento & Atendimento Digital'}
                </p>
              </div>
            </div>

            {qrCode.welcomeMessage && (
              <p className="text-xs font-medium text-white/90 bg-black/20 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                "{qrCode.welcomeMessage}"
              </p>
            )}

            {/* Quick Contact & Address */}
            <div className="flex items-center gap-4 text-[11px] font-semibold text-white/80 pt-1">
              {company.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-300" />
                  {company.phone}
                </span>
              )}
              {company.address && (
                <span className="flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin className="w-3 h-3 text-emerald-300 shrink-0" />
                  {company.address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Context Body */}
        <div className="p-5 flex-1 flex flex-col space-y-5">
          
          {/* COMPANY GATEWAY CONTEXT (Choice) */}
          {qrCode.context === 'COMPANY_GATEWAY' && step === 'GATEWAY' && (
            <div className="flex flex-col gap-4 flex-1">
              <div className="pb-2 border-b border-slate-800">
                <h2 className="text-sm font-black uppercase tracking-wider text-white">Como podemos ajudar?</h2>
                <p className="text-xs font-medium text-emerald-400">Escolha uma das opções abaixo</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setStep('MENU')}
                  className="w-full p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-2xl text-left transition-all flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Fazer um Pedido</h3>
                    <p className="text-[11px] font-medium text-slate-400">Acesse nosso cardápio digital</p>
                  </div>
                </button>

                <button
                  onClick={() => setStep('SERVICE_SELECT')}
                  className="w-full p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-2xl text-left transition-all flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Agendar Horário</h3>
                    <p className="text-[11px] font-medium text-slate-400">Marque um atendimento conosco</p>
                  </div>
                </button>

                <button
                  onClick={handleCallStaff}
                  disabled={callingStaff || staffCalled}
                  className="w-full p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-2xl text-left transition-all flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    {staffCalled ? <CheckCircle className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">
                      {staffCalled ? 'Garçom a Caminho' : callingStaff ? 'Chamando...' : 'Chamar Atendente'}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-400">Solicite ajuda na sua mesa</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: SERVICE SELECTOR (For SERVICE_BOOKING Context or Gateway selection) */}
          {step === 'SERVICE_SELECT' && (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">Escolha o Serviço</h2>
                  <p className="text-xs font-medium text-slate-400">Selecione o procedimento desejado</p>
                </div>
                {qrCode.context === 'COMPANY_GATEWAY' ? (
                  <button onClick={() => setStep('GATEWAY')} className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" /> Voltar
                  </button>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                    Passo 1 de 4
                  </span>
                )}
              </div>

              {services.length === 0 ? (
                <div className="p-8 text-center bg-slate-800/50 rounded-2xl border border-slate-800 space-y-2">
                  <Scissors className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">Nenhum serviço disponível para este QR Code.</p>
                </div>
              ) : (
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
                  {services.map((serv) => {
                    const isSelected = selectedService?.id === serv.id;
                    return (
                      <button
                        key={serv.id}
                        onClick={() => setSelectedService(serv)}
                        className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/10' 
                            : 'bg-slate-800/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <h3 className="text-xs font-black uppercase tracking-wider text-white">{serv.name}</h3>
                          {serv.description && (
                            <p className="text-[11px] font-medium text-slate-400 line-clamp-1">{serv.description}</p>
                          )}
                          <div className="flex items-center gap-2 pt-1 text-[10px] font-bold text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-400" />
                              {serv.durationMinutes} min
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-emerald-400 block">
                            R$ {Number(serv.price || 0).toFixed(2).replace('.', ',')}
                          </span>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 ml-auto ${
                            isSelected ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                disabled={!selectedService}
                onClick={() => setStep('STAFF')}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-auto"
              >
                <span>Avançar para Profissional</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: PROFESSIONAL SELECTOR */}
          {step === 'STAFF' && (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">Escolha o Profissional</h2>
                  <p className="text-xs font-medium text-slate-400">Quem irá realizar seu atendimento?</p>
                </div>
                <button
                  onClick={() => setStep('SERVICE_SELECT')}
                  className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Voltar
                </button>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
                {/* Any Available Staff Option */}
                <button
                  onClick={() => setSelectedStaff(null)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    selectedStaff === null 
                      ? 'bg-emerald-500/10 border-emerald-500 text-white' 
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">Qualquer um disponível</h3>
                      <p className="text-[11px] font-medium text-slate-400">Primeiro horário mais rápido</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedStaff === null ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-600'
                  }`}>
                    {selectedStaff === null && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>

                {professionals.map((prof) => {
                  const isSelected = selectedStaff?.id === prof.id;
                  return (
                    <button
                      key={prof.id}
                      onClick={() => setSelectedStaff(prof)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-500 text-white' 
                          : 'bg-slate-800/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-700 text-slate-200 flex items-center justify-center font-black text-sm uppercase">
                          {prof.displayName.substring(0, 2)}
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-white">{prof.displayName}</h3>
                          <p className="text-[11px] font-medium text-slate-400">Especialista Atendimento</p>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setStep('SLOT')}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-auto"
              >
                <span>Avançar para Horários</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 3: DATE & TIME SLOT SELECTOR */}
          {step === 'SLOT' && (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">Escolha a Data e Horário</h2>
                  <p className="text-xs font-medium text-slate-400">Horários em tempo real</p>
                </div>
                <button
                  onClick={() => setStep('STAFF')}
                  className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Voltar
                </button>
              </div>

              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Data do Atendimento
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Time Slots Grid */}
              <div className="space-y-1.5 flex-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Horários Disponíveis
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {timeSlots.map((slot) => {
                    const isSelected = selectedTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`py-3 px-2 rounded-xl text-xs font-black tracking-wider transition-all border ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                disabled={!selectedTimeSlot}
                onClick={() => setStep('DETAILS')}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-auto"
              >
                <span>Preencher Meus Dados</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 4: CUSTOMER DETAILS FORM */}
          {step === 'DETAILS' && (
            <form onSubmit={handleBookingSubmit} className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">Seus Dados de Contato</h2>
                  <p className="text-xs font-medium text-slate-400">Para confirmação instantânea</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('SLOT')}
                  className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Voltar
                </button>
              </div>

              {/* Selected Summary Card */}
              <div className="p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-2xl space-y-1 text-xs">
                <div className="flex justify-between items-center text-emerald-400 font-black uppercase tracking-wider">
                  <span>{selectedService?.name}</span>
                  <span>R$ {Number(selectedService?.price || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px] font-bold">
                  <span>Profissional: {selectedStaff?.displayName || 'Qualquer Disponível'}</span>
                  <span>Data: {selectedDate.split('-').reverse().join('/')} às {selectedTimeSlot}</span>
                </div>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Seu Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: Gabriel Santos"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    E-mail (opcional)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Observações
                  </label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Ex: Dificuldade de acesso, preferências..."
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-auto"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirmar Agendamento</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* UNIVERSAL LOCAL SERVICE ATENDIMENTO */}
          {step === 'MENU' && qrCode.context === 'TABLE_MENU' && (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              
              {/* Header Info */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">
                    {session?.type || 'Atendimento'} {session?.identifier || qrCode.targetData?.tableNumber || 'Local'}
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Setor: {session?.sector || 'Geral'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    session?.status === 'LIVRE' 
                      ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' 
                      : session?.status === 'AGUARDANDO_PAGAMENTO'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {session?.status || 'Conectado'}
                  </span>
                  <button 
                    type="button"
                    onClick={() => fetchPortalData(pulseCode)}
                    className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                    title="Atualizar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Total Consumption Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-800 p-5 rounded-2xl text-center space-y-3 relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <span className="text-[9px] font-black text-emerald-400 tracking-wider uppercase">Conta Digital</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consumo Atual</p>
                <h3 className="text-3xl font-black text-white">
                  R$ {Number(session?.totalConsumo || 0).toFixed(2).replace('.', ',')}
                </h3>
                
                {/* Dynamic Actions Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowConsumoModal(true)}
                    className="py-2.5 px-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-700/50 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" /> Ver Consumo
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAddConsumoModal(true)}
                    className="py-2.5 px-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Consumo
                  </button>
                  {(!operationalConfig || (operationalConfig.features || []).includes('DIVIDIR_CONTA')) && (
                    <button 
                      type="button"
                      onClick={() => {
                        handleSplitCalculation();
                        setShowSplitModal(true);
                      }}
                      className="py-2.5 px-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-700/50 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-400" /> Dividir Conta
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => setShowTransferModal(true)}
                    className="py-2.5 px-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-700/50 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Transferir
                  </button>
                </div>
              </div>

              {/* Action 1: Call Attendant */}
              {(!operationalConfig || (operationalConfig.features || []).includes('CHAMAR_FUNCIONARIO')) && (
                <div className="bg-slate-800/40 border border-slate-800/60 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-400" /> Chamar Atendimento
                    </h3>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Independentemente</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCallStaff}
                    disabled={callingStaff || staffCalled}
                    className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      staffCalled 
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                  >
                    {staffCalled ? (
                      <>
                        <CheckCircle className="w-4 h-4 stroke-[2.5]" /> Funcionário Chamado!
                      </>
                    ) : callingStaff ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 text-emerald-400" /> Solicitar Assistência
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Action 2: Pay Table */}
              {(!operationalConfig || (operationalConfig.features || []).includes('PAGAMENTO_LOCAL')) && (
                <div className="bg-slate-800/40 border border-slate-800/60 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> Fechamento e Checkout
                  </h3>

                  {/* Pay Method Select */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['PIX', 'CARTÃO', 'DINHEIRO'] as const).map((method) => {
                      const isSelected = selectedPayMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setSelectedPayMethod(method)}
                          className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {method}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestPay}
                    disabled={requestingPay || payRequested}
                    className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      payRequested 
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {payRequested ? (
                      <>
                        <CheckCircle className="w-4 h-4 stroke-[2.5]" /> Conta Solicitada!
                      </>
                    ) : requestingPay ? (
                      <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Solicitar Conta ({selectedPayMethod})
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Dynamic Modals / Interactive simulations */}
              {showAddConsumoModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl text-left">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                        <Plus className="w-4 h-4 text-emerald-400" /> Simular Consumo
                      </h4>
                      <button type="button" onClick={() => setShowAddConsumoModal(false)} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <form onSubmit={handleAddConsumoSim} className="space-y-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Valor (R$)</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          required 
                          value={addConsumoForm.amount}
                          onChange={(e) => setAddConsumoForm({ ...addConsumoForm, amount: e.target.value })}
                          placeholder="0,00"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Descrição</label>
                        <input 
                          type="text" 
                          value={addConsumoForm.description}
                          onChange={(e) => setAddConsumoForm({ ...addConsumoForm, description: e.target.value })}
                          placeholder="Ex: Cerveja, Almoço, Camiseta"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-3 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10"
                      >
                        Confirmar Consumo
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {showTransferModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl text-left">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-emerald-400" /> Transferir Atendimento
                      </h4>
                      <button type="button" onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <form onSubmit={handleTransferSim} className="space-y-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Novo Identificador</label>
                        <input 
                          type="text" 
                          required 
                          value={transferTarget}
                          onChange={(e) => setTransferTarget(e.target.value)}
                          placeholder="Ex: Mesa 15, Comanda 205"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                        Ao transferir, todo o consumo de R$ {Number(session?.totalConsumo || 0).toFixed(2)} será migrado para o novo identificador.
                      </p>
                      <button 
                        type="submit"
                        className="w-full py-3 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-600 transition-all"
                      >
                        Executar Transferência
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {showSplitModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl text-left">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" /> Dividir Pagamento
                      </h4>
                      <button type="button" onClick={() => setShowSplitModal(false)} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Dividir por quantas pessoas?</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            min="1" 
                            required 
                            value={splitParts}
                            onChange={(e) => {
                              setSplitParts(e.target.value);
                              const parts = parseInt(e.target.value);
                              if (parts > 0) {
                                setSplitResult({
                                  parts,
                                  valuePerPart: (session?.totalConsumo || 0) / parts,
                                  total: session?.totalConsumo || 0
                                });
                              }
                            }}
                            placeholder="Ex: 2, 3, 4"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      
                      {splitResult && (
                        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Valor por Pessoa</p>
                          <h5 className="text-2xl font-black text-emerald-400">
                            R$ {Number(splitResult.valuePerPart || 0).toFixed(2).replace('.', ',')}
                          </h5>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider pt-1">
                            Total: R$ {Number(splitResult.total || 0).toFixed(2).replace('.', ',')} | {splitResult.parts} pessoas
                          </p>
                        </div>
                      )}

                      <button 
                        type="button"
                        onClick={() => setShowSplitModal(false)}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-slate-700"
                      >
                        Fechar Calculadora
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showConsumoModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl text-left">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                        <Eye className="w-4 h-4 text-emerald-400" /> Itens Consumidos
                      </h4>
                      <button type="button" onClick={() => setShowConsumoModal(false)} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      <div className="p-3 bg-slate-800/50 border border-slate-800 rounded-2xl flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-white">Serviço de Mesa / Uso</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Consumo Ativo</p>
                        </div>
                        <span className="text-xs font-black text-emerald-400">
                          R$ {Number(session?.totalConsumo || 0).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 text-center py-2 font-semibold italic">
                        Os detalhes adicionais e notas fiscais são sincronizados diretamente com o terminal de vendas (PDV).
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowConsumoModal(false)}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-slate-700"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              )}

              {/* Universal Segment Footer */}
              <div className="text-center text-[9px] text-slate-500 font-black uppercase tracking-wider pt-2 border-t border-slate-800/50 flex justify-center items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span>VarejoPro Core • Atendimento Local Universal</span>
              </div>
            </div>
          )}

          {/* STEP: CART DETAILS */}
          {step === 'CART' && (
            <form onSubmit={handleOrderSubmit} className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">Revisar Pedido</h2>
                  <p className="text-xs font-medium text-emerald-400">Total: R$ {cartTotal.toFixed(2).replace('.', ',')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('MENU')}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Voltar
                </button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                <div className="space-y-2">
                  {cartItems.map((c) => (
                    <div key={c.product.id} className="flex justify-between items-center text-xs p-2 bg-slate-800 rounded-xl">
                      <span className="font-bold text-slate-200">{c.quantity}x {c.product.name}</span>
                      <span className="font-black text-emerald-400">R$ {(c.product.price * c.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 pt-3 border-t border-slate-800">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Seu Nome (para identificação)
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Como deseja ser chamado?"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Observações para a Cozinha
                  </label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Sem cebola, carne ao ponto..."
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-auto"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Enviar Pedido p/ Cozinha</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 5: CONFIRMATION SCREEN (Both Appointment and Order) */}
          {step === 'CONFIRMED' && (
            <div className="py-6 text-center space-y-6 flex-1 flex flex-col justify-center animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                <CheckCircle className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                  {qrCode.context === 'TABLE_MENU' ? 'Pedido Enviado!' : 'Agendamento Confirmado!'}
                </h2>
                <p className="text-xs font-medium text-slate-300 max-w-xs mx-auto">
                  {qrCode.context === 'TABLE_MENU' 
                    ? `Seu pedido foi enviado direto para a cozinha da ${company.name}.`
                    : `Seu horário foi enviado instantaneamente para a agenda da ${company.name}.`}
                </p>
              </div>

              {qrCode.context === 'TABLE_MENU' ? (
                <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-2xl text-left space-y-2 text-xs">
                  <div className="text-slate-300 text-[11px] font-bold space-y-1">
                    <p>👤 Cliente: {customerName}</p>
                    <p>📍 Mesa: {qrCode.targetData?.tableNumber || 'Não informada'}</p>
                    <p>📦 Total de Itens: {cartItems.reduce((a, b) => a + b.quantity, 0)}</p>
                    <p className="text-emerald-400 font-black text-xs pt-1">Total: R$ {cartTotal.toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-2xl text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center text-emerald-400 font-black uppercase tracking-wider pb-2 border-b border-slate-700">
                    <span>{selectedService?.name}</span>
                    <span>R$ {Number(selectedService?.price || 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="space-y-1 text-slate-300 text-[11px] font-bold">
                    <p>👤 Cliente: {customerName}</p>
                    <p>✂️ Profissional: {selectedStaff?.displayName || 'Equipe Disponível'}</p>
                    <p>📅 Data: {selectedDate.split('-').reverse().join('/')} às {selectedTimeSlot}</p>
                    <p>📍 Local: {company.name}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    if (qrCode.context === 'TABLE_MENU') {
                      setStep('MENU');
                      setCartItems([]);
                    } else if (qrCode.context === 'COMPANY_GATEWAY') {
                      setStep('GATEWAY');
                      setConfirmedAppt(null);
                    } else {
                      setStep('SERVICE_SELECT');
                      setConfirmedAppt(null);
                    }
                  }}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all"
                >
                  {qrCode.context === 'TABLE_MENU' ? 'Fazer Novo Pedido' : 'Fazer Outro Agendamento'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Public Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
          <span>Tecnologia</span>
          <span className="text-emerald-400 font-black">3eatcru Varejo Pulse</span>
          <span>• Sem Necessidade de Baixar App</span>
        </div>

      </div>
    </div>
  );
}
