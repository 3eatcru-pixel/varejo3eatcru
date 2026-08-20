import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Grid, 
  Check, 
  Sparkles, 
  UserCheck, 
  CreditCard, 
  Users, 
  Printer, 
  Smartphone, 
  Sliders, 
  Plus, 
  X, 
  AlertCircle, 
  Layers, 
  Utensils, 
  Calendar, 
  Activity, 
  RotateCcw,
  Compass
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../../../types';
import { useToast } from '../../../components/Toast';

interface OperationalProfile {
  segments: string[];
  operations: string[];
  features: string[];
  customSegments?: string[];
  updatedAt?: string;
}

export default function OperationalProfileSettings({ user }: { user: UserProfile }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State elements
  const [segments, setSegments] = useState<string[]>(['VAREJO']);
  const [operations, setOperations] = useState<string[]>(['BALCAO']);
  const [features, setFeatures] = useState<string[]>(['IMPRESSAO']);
  const [customSegments, setCustomSegments] = useState<string[]>([]);
  const [newCustomSegmentName, setNewCustomSegmentName] = useState('');
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);

  // Firestore path
  const docRef = doc(db, 'settings', `operational_${user.companyId || 'empresa_principal'}`);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as OperationalProfile;
        setSegments(data.segments || ['VAREJO']);
        setOperations(data.operations || ['BALCAO']);
        setFeatures(data.features || ['IMPRESSAO']);
        setCustomSegments(data.customSegments || []);
      } else {
        // Default seed settings if not exist
        setSegments(['VAREJO']);
        setOperations(['BALCAO']);
        setFeatures(['IMPRESSAO']);
        setCustomSegments([]);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Erro ao carregar perfil operacional:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [user.companyId]);

  const handleSave = async (updatedSegs = segments, updatedOps = operations, updatedFeats = features, updatedCustom = customSegments) => {
    setSaving(true);
    try {
      await setDoc(docRef, {
        segments: updatedSegs,
        operations: updatedOps,
        features: updatedFeats,
        customSegments: updatedCustom,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showSuccess('Perfil Operacional atualizado com sucesso no VarejoPro!', 'Sucesso');
    } catch (err) {
      showError('Falha ao salvar as configurações operacionais.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSegment = (code: string) => {
    let next;
    if (segments.includes(code)) {
      next = segments.filter(s => s !== code);
    } else {
      next = [...segments, code];
    }
    setSegments(next);
    handleSave(next, operations, features, customSegments);
  };

  const toggleOperation = (code: string) => {
    let next;
    if (operations.includes(code)) {
      next = operations.filter(o => o !== code);
    } else {
      next = [...operations, code];
    }
    setOperations(next);
    handleSave(segments, next, features, customSegments);
  };

  const toggleFeature = (code: string) => {
    let next;
    if (features.includes(code)) {
      next = features.filter(f => f !== code);
    } else {
      next = [...features, code];
    }
    setFeatures(next);
    handleSave(segments, operations, next, customSegments);
  };

  // Preset Handlers
  const applyPreset = (type: 'varejo' | 'bar' | 'restaurante' | 'servico') => {
    let nextSegs: string[] = [];
    let nextOps: string[] = [];
    let nextFeats: string[] = [];

    if (type === 'varejo') {
      nextSegs = ['VAREJO'];
      nextOps = ['BALCAO', 'RETIRADA'];
      nextFeats = ['IMPRESSAO'];
    } else if (type === 'bar') {
      nextSegs = ['BAR'];
      nextOps = ['BALCAO', 'MESA', 'COMANDA'];
      nextFeats = ['PULSE', 'CHAMAR_FUNCIONARIO', 'PAGAMENTO_LOCAL', 'DIVIDIR_CONTA', 'IMPRESSAO'];
    } else if (type === 'restaurante') {
      nextSegs = ['RESTAURANTE'];
      nextOps = ['BALCAO', 'MESA', 'DELIVERY', 'RETIRADA'];
      nextFeats = ['PULSE', 'KDS', 'CHAMAR_FUNCIONARIO', 'PAGAMENTO_LOCAL', 'DIVIDIR_CONTA', 'IMPRESSAO'];
    } else if (type === 'servico') {
      nextSegs = ['SERVICOS'];
      nextOps = ['BALCAO', 'AGENDAMENTO'];
      nextFeats = ['IMPRESSAO'];
    }

    setSegments(nextSegs);
    setOperations(nextOps);
    setFeatures(nextFeats);
    handleSave(nextSegs, nextOps, nextFeats, customSegments);
    showSuccess(`Preset operacional aplicado com sucesso!`, 'Perfil Pronto');
  };

  const handleAddCustomSegment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomSegmentName.trim()) return;

    const code = 'CUSTOM_' + newCustomSegmentName.trim().toUpperCase().replace(/\s+/g, '_');
    if (customSegments.includes(code) || segments.includes(code)) {
      showError('Este segmento ou categoria já existe.');
      return;
    }

    const nextCustom = [...customSegments, code];
    const nextSegs = [...segments, code];
    
    setCustomSegments(nextCustom);
    setSegments(nextSegs);
    setNewCustomSegmentName('');
    setShowAddCustomModal(false);

    handleSave(nextSegs, operations, features, nextCustom);
    showSuccess(`Segmento personalizado "${newCustomSegmentName}" criado com sucesso!`, 'Sucesso');
  };

  const handleRemoveCustomSegment = (code: string) => {
    const nextCustom = customSegments.filter(c => c !== code);
    const nextSegs = segments.filter(s => s !== code);
    
    setCustomSegments(nextCustom);
    setSegments(nextSegs);

    handleSave(nextSegs, operations, features, nextCustom);
    showSuccess('Segmento personalizado removido.', 'Removido');
  };

  // Deterministic Feature Resolver Preview values
  const hasTableService = operations.includes('MESA') || segments.includes('RESTAURANTE') || segments.includes('BAR');
  const hasPulse = features.includes('PULSE');
  const hasKds = features.includes('KDS');
  const hasComanda = operations.includes('COMANDA');
  const hasServices = segments.includes('SERVICOS') || segments.includes('OFICINA') || operations.includes('AGENDAMENTO');
  const hasDelivery = operations.includes('DELIVERY');

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <Activity className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Intro Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-md border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            <span>Arquitetura Inteligente VarejoPro</span>
          </div>
          <h3 className="text-lg font-black text-white">
            Perfil Operacional da Empresa & Resolvedor de Recursos
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Não amarre o software a uma única categoria. Diga ao VarejoPro como sua operação funciona! 
            As categorias selecionadas ativam determinísticamente o menu lateral, opções do PDV e canais como o portal Pulse de forma escalável.
          </p>
        </div>

        {/* Quick Presets Grid */}
        <div className="bg-slate-900/60 p-3 rounded-2xl border border-indigo-500/20 space-y-2 shrink-0 w-full lg:w-auto">
          <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider text-center lg:text-left">⚡ Presets de Configuração Rápida</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset('varejo')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase rounded-lg transition-all border border-slate-700 text-center"
            >
              🛒 Loja / Varejo
            </button>
            <button
              type="button"
              onClick={() => applyPreset('bar')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase rounded-lg transition-all border border-slate-700 text-center"
            >
              🍺 Bar / Pub
            </button>
            <button
              type="button"
              onClick={() => applyPreset('restaurante')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase rounded-lg transition-all border border-slate-700 text-center"
            >
              🍽️ Restaurante
            </button>
            <button
              type="button"
              onClick={() => applyPreset('servico')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase rounded-lg transition-all border border-slate-700 text-center"
            >
              💇 Serviços
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Configuration: 8 cols */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Level 1: Segmentos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-500" />
                  1. Segmento (O que a empresa é)
                </h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Selecione um ou mais segmentos de atuação da sua operação comercial</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomModal(true)}
                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Criar Categoria
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { code: 'VAREJO', label: '🛒 Varejo / Comércio', desc: 'Lojas de roupa, mercados, calçados' },
                { code: 'BAR', label: '🍺 Bar / Adega', desc: 'Cervejarias, pubs, tabacarias' },
                { code: 'RESTAURANTE', label: '🍽️ Restaurante / Diner', desc: 'Restaurantes, lanchonetes' },
                { code: 'CAFETERIA', label: '☕ Cafeteria / Bistrô', desc: 'Bistrôs, docerias, cafés' },
                { code: 'PADARIA', label: '🥖 Padaria / Panificação', desc: 'Padarias, confeitarias' },
                { code: 'SERVICOS', label: '💇 Serviços / Beleza', desc: 'Barbearias, salões, estética' },
                { code: 'OFICINA', label: '🔧 Oficina / Assistência', desc: 'Oficinas mecânicas, consertos' },
                { code: 'DISTRIBUIDORA', label: '📦 Distribuidora', desc: 'Bebidas, alimentos, atacados' },
              ].map((s) => {
                const isActive = segments.includes(s.code);
                return (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => toggleSegment(s.code)}
                    className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between h-24 ${
                      isActive
                        ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-400/20'
                        : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-black text-slate-800">{s.label}</span>
                    <span className="text-[9px] text-slate-400 font-bold leading-tight mt-1">{s.desc}</span>
                    <div className="flex justify-end w-full mt-1">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {isActive && <Check className="w-2.5 h-2.5" />}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Custom Segments */}
              {customSegments.map((cCode) => {
                const isActive = segments.includes(cCode);
                const readableName = cCode.replace('CUSTOM_', '').replace(/_/g, ' ');
                return (
                  <div
                    key={cCode}
                    className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between h-24 relative group ${
                      isActive
                        ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-400/20'
                        : 'bg-slate-50/50 border-slate-200'
                    }`}
                  >
                    <button 
                      type="button"
                      onClick={() => handleRemoveCustomSegment(cCode)}
                      className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                      title="Deletar categoria personalizada"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSegment(cCode)}
                      className="w-full h-full text-left flex flex-col justify-between"
                    >
                      <span className="text-xs font-black text-slate-800 truncate pr-4">➕ {readableName}</span>
                      <span className="text-[9px] text-slate-400 font-bold leading-tight mt-1">Categoria personalizada da sua empresa</span>
                      <div className="flex justify-end w-full mt-1">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {isActive && <Check className="w-2.5 h-2.5" />}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Level 2: Operações */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-500" />
                2. Modelo de Operação (Como ela trabalha)
              </h4>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Determine os canais de atendimento e venda disponíveis para os operadores</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { code: 'BALCAO', label: '🏷️ Venda Balcão', desc: 'Venda rápida direta no caixa (PDV comum)' },
                { code: 'MESA', label: '🍽️ Venda Mesa/Local', desc: 'Pedidos vinculados a mesas físicas' },
                { code: 'COMANDA', label: '📑 Comanda Individual', desc: 'Pedidos registrados por número de ficha' },
                { code: 'DELIVERY', label: '🛵 Delivery', desc: 'Entrega domiciliar com dados de endereço' },
                { code: 'RETIRADA', label: '📦 Retirada / Takeout', desc: 'Compra online ou local para retirada posterior' },
                { code: 'AGENDAMENTO', label: '📅 Agendamento', desc: 'Serviços marcados com hora e data' },
              ].map((o) => {
                const isActive = operations.includes(o.code);
                return (
                  <button
                    key={o.code}
                    type="button"
                    onClick={() => toggleOperation(o.code)}
                    className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between h-24 ${
                      isActive
                        ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/20'
                        : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-black text-slate-800">{o.label}</span>
                    <span className="text-[9px] text-slate-400 font-bold leading-tight mt-1">{o.desc}</span>
                    <div className="flex justify-end w-full mt-1">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {isActive && <Check className="w-2.5 h-2.5" />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 3: Recursos / Plugins */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                3. Plugins & Recursos Ativos (O que ela precisa)
              </h4>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Habilite módulos complementares e recursos inteligentes para otimizar o fluxo de atendimento</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { code: 'PULSE', label: '⚡ Pulse (QR Code)', desc: 'Portal de auto-serviço do cliente via QR Code' },
                { code: 'KDS', label: '🍳 Tela de Cozinha (KDS)', desc: 'Mapeia os pedidos para preparação na cozinha' },
                { code: 'CHAMAR_FUNCIONARIO', label: '🙋 Chamar Funcionário', desc: 'Ativa chamada do garçom/vendedor no Pulse' },
                { code: 'PAGAMENTO_LOCAL', label: '💳 Pagamento Local', desc: 'Permite que o cliente chame a conta do local' },
                { code: 'DIVIDIR_CONTA', label: '👥 Dividir Conta', desc: 'Calculadora de divisão de conta no Pulse' },
                { code: 'IMPRESSAO', label: '🖨️ Impressão de Cupom', desc: 'Imprime via Bluetooth/Wi-Fi automaticamente' },
              ].map((f) => {
                const isActive = features.includes(f.code);
                return (
                  <button
                    key={f.code}
                    type="button"
                    onClick={() => toggleFeature(f.code)}
                    className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between h-24 ${
                      isActive
                        ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-400/20'
                        : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-black text-slate-800">{f.label}</span>
                    <span className="text-[9px] text-slate-400 font-bold leading-tight mt-1">{f.desc}</span>
                    <div className="flex justify-end w-full mt-1">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {isActive && <Check className="w-2.5 h-2.5" />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Live Feature Resolver Preview: 4 cols */}
        <div className="lg:col-span-4 bg-slate-900 rounded-3xl p-5 text-white flex flex-col justify-between border border-slate-800 shadow-xl h-fit space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-indigo-400" /> Feature Resolver
              </span>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 font-bold tracking-wider">
                DETERMINÍSTICO
              </span>
            </div>

            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              O motor de regras converte em tempo real as configurações operacionais da empresa acima nas abas de sistema ativas abaixo:
            </p>

            <div className="space-y-2.5">
              {/* Feature 1: Pulse */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-100">Portal Pulse</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Código: features.pulseEnabled</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${hasPulse ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                  {hasPulse ? 'Habilitado' : 'Desativado'}
                </span>
              </div>

              {/* Feature 2: Mesa */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-100">Serviço de Mesa</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Código: features.tableService</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${hasTableService ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                  {hasTableService ? 'Habilitado' : 'Desativado'}
                </span>
              </div>

              {/* Feature 3: KDS */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-100">KDS (Cozinha)</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Código: features.kdsEnabled</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${hasKds ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                  {hasKds ? 'Habilitado' : 'Desativado'}
                </span>
              </div>

              {/* Feature 4: Comanda */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-100">Fichas / Comandas</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Código: features.comandaEnabled</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${hasComanda ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                  {hasComanda ? 'Habilitado' : 'Desativado'}
                </span>
              </div>

              {/* Feature 5: Serviços */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-100">Gestão & Agenda</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Código: features.servicesEnabled</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${hasServices ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                  {hasServices ? 'Habilitado' : 'Desativado'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-start gap-2.5 text-[10px] text-slate-400 font-semibold leading-relaxed">
                <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>As alterações são sincronizadas com segurança em nuvem. Operadores logados recebem as mudanças em tempo real sem precisar reiniciar!</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Sincronizando...' : 'Salvar Perfil Operacional'}
            </button>
          </div>
        </div>
      </div>

      {/* Add Custom Segment Category Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl text-left text-white">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Criar Categoria/Segmento
              </h4>
              <button type="button" onClick={() => setShowAddCustomModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCustomSegment} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Nome da Categoria</label>
                <input 
                  type="text" 
                  required 
                  value={newCustomSegmentName}
                  onChange={(e) => setNewCustomSegmentName(e.target.value)}
                  placeholder="Ex: Casa de Eventos, Petshop, Mercado"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Ao criar uma categoria personalizada, ela aparecerá no painel para que você configure de forma livre e flexível quais operações e recursos sua operação requer.
              </p>
              <button 
                type="submit"
                className="w-full py-3 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-600 transition-all"
              >
                Salvar Categoria Personalizada
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
