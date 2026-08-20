import React, { useState } from 'react';
import { UserProfile } from '../../../types';
import { CreditCard, CheckCircle2, Zap, Shield, Calendar, History, ArrowRight, Package, Receipt, Plus, AlertCircle, Download } from 'lucide-react';
import { useToast } from '../../../components/Toast';

export default function BillingSettings({ user }: { user: UserProfile }) {
  const { showSuccess } = useToast();
  const [loading, setLoading] = useState(false);

  const plans = [
    { name: 'Starter', price: 'R$ 99', interval: '/mês', features: ['Até 2 usuários', '1 Filial', 'PDV Básico', 'Suporte E-mail'], current: false },
    { name: 'Profissional', price: 'R$ 199', interval: '/mês', features: ['Até 10 usuários', 'Multi-filial', 'Pulse QR Ilimitado', 'Estoque Avançado', 'Suporte Priority'], current: true },
    { name: 'Enterprise', price: 'R$ 499', interval: '/mês', features: ['Usuários Ilimitados', 'HQ Command Center', 'API de Integração', 'Account Manager Dedicado'], current: false },
  ];

  const handleUpgrade = () => {
    showSuccess('Redirecionando para o checkout seguro...', 'Upgrade de Plano');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-cyan-600" />
              Assinatura & Gestão de Plano
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Gerencie seu faturamento, formas de pagamento e recursos do VarejoPro
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
            <Shield className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Pagamentos Seguros SSL</span>
          </div>
        </div>

        {/* Current Subscription Status */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap className="w-40 h-40 text-slate-900" />
          </div>
          
          <div className="flex-1 space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full border border-cyan-100">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Plano Ativo</span>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900">Profissional</h3>
              <p className="text-sm font-bold text-slate-500 mt-1">Sua empresa possui acesso a todos os recursos avançados de gestão e Pulse QR.</p>
            </div>
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 leading-none">Próxima Cobrança</p>
                  <p className="text-xs font-black text-slate-900 mt-1">12 de Setembro, 2026</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <Receipt className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 leading-none">Valor Mensal</p>
                  <p className="text-xs font-black text-slate-900 mt-1">R$ 199,00</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col gap-3 relative z-10">
            <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2">
              Alterar Forma de Pagamento
            </button>
            <button className="px-8 py-4 bg-white text-slate-600 rounded-2xl font-black text-xs uppercase tracking-wider border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
              Ver Histórico de Faturas
            </button>
          </div>
        </div>

        {/* Quotas & Usage */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Usuários', used: 4, limit: 10, unit: 'usuários' },
            { label: 'Pulse QR', used: 15, limit: 'Ilimitado', unit: 'pontos' },
            { label: 'Filiais', used: 1, limit: 3, unit: 'unidades' },
            { label: 'Arquivos', used: 1.4, limit: 50, unit: 'MB' },
          ].map((quota, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{quota.label}</p>
                <p className="text-[10px] font-black text-slate-900">{quota.used} / {quota.limit}</p>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-cyan-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: typeof quota.limit === 'number' ? `${(quota.used / quota.limit) * 100}%` : '100%' }}
                />
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                {typeof quota.limit === 'number' ? `Você usou ${Math.round((quota.used / quota.limit) * 100)}% da sua cota.` : 'Recurso liberado sem limites no seu plano.'}
              </p>
            </div>
          ))}
        </div>

        {/* Upgrade Plans Grid */}
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">Planos & Recursos</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">Selecione o plano ideal para a escala do seu negócio</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, idx) => (
              <div 
                key={idx} 
                className={`bg-white rounded-[32px] p-8 border-2 transition-all relative flex flex-col ${
                  plan.current 
                    ? 'border-cyan-500 shadow-2xl shadow-cyan-500/10 scale-105 z-10' 
                    : 'border-slate-100 hover:border-slate-300'
                }`}
              >
                {plan.current && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-cyan-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                    Plano Atual
                  </div>
                )}
                
                <div className="mb-6">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">{plan.name}</h4>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                    <span className="text-xs font-bold text-slate-400">{plan.interval}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-xs font-bold text-slate-600 leading-tight">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  disabled={plan.current}
                  onClick={handleUpgrade}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    plan.current
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10'
                  }`}
                >
                  {plan.current ? 'Sua Assinatura Atual' : 'Migrar para este Plano'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            Histórico de Pagamentos
          </h3>
          <div className="space-y-4">
            {[
              { id: 'FAT-2026-08', date: '12 Ago, 2026', amount: 'R$ 199,00', status: 'PAID' },
              { id: 'FAT-2026-07', date: '12 Jul, 2026', amount: 'R$ 199,00', status: 'PAID' },
              { id: 'FAT-2026-06', date: '12 Jun, 2026', amount: 'R$ 199,00', status: 'PAID' },
            ].map((invoice, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-slate-300 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{invoice.id}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{invoice.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <p className="text-xs font-black text-slate-900">{invoice.amount}</p>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded border border-emerald-200">
                    Pago
                  </span>
                  <Download className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Need Help? */}
        <div className="flex items-center justify-center gap-8 py-8 border-t border-slate-200">
          <p className="text-xs font-bold text-slate-400">Dúvidas sobre faturamento?</p>
          <button className="px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
            Falar com Financeiro
          </button>
          <button className="px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
            Central de Ajuda
          </button>
        </div>
      </div>
    </div>
  );
}
