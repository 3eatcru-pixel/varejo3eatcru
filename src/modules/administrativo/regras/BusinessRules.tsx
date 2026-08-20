import React, { useState } from 'react';
import { UserProfile } from '../../../types';
import { Sliders, CheckCircle2, ShoppingBag, Package, Truck, Clock, Percent, Calculator, ShieldCheck, Save, Loader2, Info } from 'lucide-react';
import { useToast } from '../../../components/Toast';

export default function BusinessRules({ user }: { user: UserProfile }) {
  const { showSuccess } = useToast();
  const [loading, setLoading] = useState(false);

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
    
    // Operação
    businessType: 'RETAIL',
    enableTableService: false,
    openCashRegisterOnStart: true,
  });

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showSuccess('Todas as regras de negócio e parâmetros operacionais foram atualizados.', 'Configurações Salvas');
    }, 1500);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Sliders className="w-6 h-6 text-amber-500" />
              Regras de Negócio & Operação
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Defina como o VarejoPro deve se comportar no dia a dia da sua empresa
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

          {/* Right: Operational Profile */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 rounded-[40px] p-6 text-white border border-slate-800 shadow-2xl space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Perfil da Operação
              </h3>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Negócio</label>
                  <select 
                    value={rules.businessType}
                    onChange={e => setRules({...rules, businessType: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="RETAIL">Varejo Convencional</option>
                    <option value="FOOD">Restaurante / Bar (Mesas)</option>
                    <option value="SERVICES">Prestação de Serviços</option>
                    <option value="WHOLESALE">Atacado</option>
                  </select>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-white uppercase tracking-wider">Abertura de Caixa</p>
                    <button 
                      onClick={() => setRules({...rules, openCashRegisterOnStart: !rules.openCashRegisterOnStart})}
                      className={`w-10 h-5 rounded-full relative transition-all ${rules.openCashRegisterOnStart ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${rules.openCashRegisterOnStart ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">Exigir abertura manual de caixa em todos os terminais ao iniciar o dia.</p>
                </div>

                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Modo Auditoria Ativo</span>
                  </div>
                  <p className="text-[9px] text-emerald-100/60 leading-relaxed">
                    Todas as alterações nestas regras são registradas na trilha de auditoria e notificadas aos administradores da empresa.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h4 className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">Ações Rápidas</h4>
                <div className="space-y-2">
                  <button className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    Resetar Parâmetros
                  </button>
                  <button className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    Exportar Configurações
                  </button>
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex gap-4">
              <div className="p-2.5 bg-blue-50 rounded-2xl shrink-0">
                <Info className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Precisa de Ajuda?</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">
                  As regras de negócio definem os limites e automações do seu sistema. Em caso de dúvida, consulte nossa Central de Conhecimento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
