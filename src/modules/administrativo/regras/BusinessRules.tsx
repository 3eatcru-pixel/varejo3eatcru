import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../../types';
import { 
  Sliders, 
  CheckCircle2, 
  ShoppingBag, 
  Package, 
  Truck, 
  Clock, 
  Percent, 
  Calculator, 
  ShieldCheck, 
  Save, 
  Loader2, 
  Info,
  Store,
  UtensilsCrossed,
  Scissors,
  Building2,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useToast } from '../../../components/Toast';

export default function BusinessRules({ user }: { user: UserProfile }) {
  const { showSuccess, showError } = useToast();
  const companyId = user.companyId || 'empresa_principal';
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [rules, setRules] = useState({
    // Vendas
    allowNegativeStock: false,
    maxDiscountPercent: 30,
    requireAdminForHighDiscount: true,
    enableLoyaltyPoints: true,
    pointsPerReal: 1,
    
    // Entrega/Retirada
    enableDelivery: true,
    enableLocalPickup: true,
    defaultDeliveryFee: 10,
    
    // Estoque
    lowStockAlert: true,
    autoAdjustStockOnSale: true,
    requireCostPrice: true,
    
    // Operação / Segmento
    businessType: 'RETAIL', // 'RETAIL' | 'RESTAURANT' | 'SERVICES' | 'DISTRIBUTION'
    enableTableService: false,
    openCashRegisterOnStart: true,
  });

  useEffect(() => {
    const docRef = doc(db, 'settings', `rules_${companyId}`);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRules(prev => ({ ...prev, ...data }));
      }
      setInitialLoading(false);
    }, (err) => {
      console.warn('Erro ao carregar regras:', err);
      setInitialLoading(false);
    });

    return () => unsub();
  }, [companyId]);

  const handleSelectSegment = async (segment: 'RETAIL' | 'RESTAURANT' | 'SERVICES' | 'DISTRIBUTION') => {
    const updated = {
      ...rules,
      businessType: segment,
      enableTableService: segment === 'RESTAURANT'
    };
    setRules(updated);

    // Also update operational settings for synchronization
    try {
      let segmentsArray = ['VAREJO'];
      let operationsArray = ['BALCAO', 'RETIRADA'];
      if (segment === 'RESTAURANT') {
        segmentsArray = ['RESTAURANTE'];
        operationsArray = ['BALCAO', 'MESA', 'COMANDA', 'DELIVERY'];
      } else if (segment === 'SERVICES') {
        segmentsArray = ['SERVICOS'];
        operationsArray = ['BALCAO', 'AGENDAMENTO'];
      } else if (segment === 'DISTRIBUTION') {
        segmentsArray = ['DISTRIBUICAO', 'ATACADO'];
        operationsArray = ['BALCAO', 'ENTREGA', 'LOGISTICA'];
      }

      await setDoc(doc(db, 'settings', `operational_${companyId}`), {
        segments: segmentsArray,
        operations: operationsArray,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await setDoc(doc(db, 'settings', `rules_${companyId}`), {
        ...updated,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      showSuccess(`Tipo de empresa alterado para ${
        segment === 'RETAIL' ? 'Loja / Varejo' :
        segment === 'RESTAURANT' ? 'Restaurante / Bar' :
        segment === 'SERVICES' ? 'Serviços & Atendimento' : 'Distribuidora & Logística'
      }. O menu e os recursos foram adaptados automaticamente!`, 'Segmento Atualizado');
    } catch (e) {
      showError('Erro ao sincronizar segmento da empresa.');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', `rules_${companyId}`), {
        ...rules,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showSuccess('Todas as regras de negócio e parâmetros operacionais foram atualizados com sucesso.', 'Configurações Salvas');
    } catch (err: any) {
      showError('Falha ao salvar as regras de negócio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Sliders className="w-6 h-6 text-amber-500" />
              Tipo de Negócio & Regras de Operação
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Defina o segmento da sua empresa e como o sistema deve se comportar no dia a dia
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Save className="w-4 h-4 text-amber-400" />}
            {loading ? 'Processando...' : 'Salvar Regras'}
          </button>
        </div>

        {/* 🏢 Segment Selector (Clean & Invisible Extension Concept) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                Qual é o tipo da sua empresa?
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                O VarejoPro adapta menus e ferramentas automaticamente para a sua rotina diária
              </p>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-emerald-200">
              Adaptativo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {/* 1. Varejo Comum */}
            <div
              onClick={() => handleSelectSegment('RETAIL')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between relative ${
                rules.businessType === 'RETAIL'
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              {rules.businessType === 'RETAIL' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  <Store className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Loja / Varejo</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Moda, calçados, conveniência, mercados e comércio em geral. Experiência direta e simplificada.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center gap-1.5 text-[9px] font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                PDV rápido + Estoque limpo
              </div>
            </div>

            {/* 2. Restaurante / Bar */}
            <div
              onClick={() => handleSelectSegment('RESTAURANT')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between relative ${
                rules.businessType === 'RESTAURANT'
                  ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              {rules.businessType === 'RESTAURANT' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Restaurante / Bar</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Bares, cafeterias e restaurantes. Habilita gestão de mesas, comandas e chamadas de garçom.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center gap-1.5 text-[9px] font-bold text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Mesas + Comandas + Cozinha
              </div>
            </div>

            {/* 3. Serviços */}
            <div
              onClick={() => handleSelectSegment('SERVICES')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between relative ${
                rules.businessType === 'SERVICES'
                  ? 'border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              {rules.businessType === 'SERVICES' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                  <Scissors className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Serviços / Barbearia</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Salões de beleza, barbearias, oficinas e estética. Habilita agenda e profissionais.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center gap-1.5 text-[9px] font-bold text-indigo-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Agendamentos + Profissionais
              </div>
            </div>

            {/* 4. Distribuidora / WMS */}
            <div
              onClick={() => handleSelectSegment('DISTRIBUTION')}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between relative ${
                rules.businessType === 'DISTRIBUTION'
                  ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
              }`}
            >
              {rules.businessType === 'DISTRIBUTION' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Distribuidora / WMS</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Atacadistas, depósitos e distribuidoras. Habilita transferências entre depósitos e compras por NF-e.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center gap-1.5 text-[9px] font-bold text-blue-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Endereçamento + Multi-Depósito
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Main Rules */}
          <div className="lg:col-span-8 space-y-6">
            {/* Sales Rules */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                Vendas & PDV
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Vender sem Estoque</p>
                      <p className="text-[10px] text-slate-500 font-medium">Permitir estoque negativo no PDV</p>
                    </div>
                    <button 
                      onClick={() => setRules({...rules, allowNegativeStock: !rules.allowNegativeStock})}
                      className={`w-10 h-5 rounded-full relative transition-all ${rules.allowNegativeStock ? 'bg-amber-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${rules.allowNegativeStock ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Aprovação de Desconto</p>
                      <p className="text-[10px] text-slate-500 font-medium">Exigir senha para descontos altos</p>
                    </div>
                    <button 
                      onClick={() => setRules({...rules, requireAdminForHighDiscount: !rules.requireAdminForHighDiscount})}
                      className={`w-10 h-5 rounded-full relative transition-all ${rules.requireAdminForHighDiscount ? 'bg-amber-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${rules.requireAdminForHighDiscount ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Percent className="w-3 h-3 text-amber-600" /> Desconto Máximo Operador (%)
                    </label>
                    <input 
                      type="number" 
                      value={rules.maxDiscountPercent}
                      onChange={e => setRules({...rules, maxDiscountPercent: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Calculator className="w-3 h-3 text-amber-600" /> Fidelidade: Pontos por Real
                    </label>
                    <input 
                      type="number" 
                      value={rules.pointsPerReal}
                      onChange={e => setRules({...rules, pointsPerReal: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Rules */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-500" />
                Gestão de Estoque
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Alertas de Estoque Baixo</p>
                      <p className="text-[10px] text-slate-500 font-medium">Notificar quando atingir o mínimo</p>
                    </div>
                    <button 
                      onClick={() => setRules({...rules, lowStockAlert: !rules.lowStockAlert})}
                      className={`w-10 h-5 rounded-full relative transition-all ${rules.lowStockAlert ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${rules.lowStockAlert ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Custo Obrigatório</p>
                      <p className="text-[10px] text-slate-500 font-medium">Exigir preço de custo no cadastro</p>
                    </div>
                    <button 
                      onClick={() => setRules({...rules, requireCostPrice: !rules.requireCostPrice})}
                      className={`w-10 h-5 rounded-full relative transition-all ${rules.requireCostPrice ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${rules.requireCostPrice ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery & Logistics */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-500" />
                Entrega & Logística
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Ativar Delivery</p>
                      <p className="text-[10px] text-slate-500 font-medium">Habilitar módulo de entregas</p>
                    </div>
                    <button 
                      onClick={() => setRules({...rules, enableDelivery: !rules.enableDelivery})}
                      className={`w-10 h-5 rounded-full relative transition-all ${rules.enableDelivery ? 'bg-blue-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${rules.enableDelivery ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taxa de Entrega Padrão (R$)</label>
                  <input 
                    type="number" 
                    value={rules.defaultDeliveryFee}
                    onChange={e => setRules({...rules, defaultDeliveryFee: Number(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Operational Settings & Audit */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 rounded-[40px] p-6 text-white border border-slate-800 shadow-2xl space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Abertura de Caixa
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-white uppercase tracking-wider">Exigir Abertura de Turno</p>
                    <button 
                      onClick={() => setRules({...rules, openCashRegisterOnStart: !rules.openCashRegisterOnStart})}
                      className={`w-10 h-5 rounded-full relative transition-all ${rules.openCashRegisterOnStart ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${rules.openCashRegisterOnStart ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">Exigir conferência de troco inicial em todos os terminais ao iniciar o dia.</p>
                </div>

                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Modo Seguro Multi-Tenant</span>
                  </div>
                  <p className="text-[9px] text-emerald-100/60 leading-relaxed">
                    Todas as regras são isoladas no nível do tenant e registradas na trilha de auditoria contra fraudes e desvios de caixa.
                  </p>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex gap-4">
              <div className="p-2.5 bg-emerald-50 rounded-2xl shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Experiência Descomplicada</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">
                  O VarejoPro não requer módulos complexos ou instalações manuais. O sistema se molda dinamicamente ao seu negócio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
