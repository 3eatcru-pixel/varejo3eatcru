import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Users, 
  Monitor, 
  Store, 
  FileText, 
  Cloud, 
  ArrowRight,
  Clock
} from 'lucide-react';
import { PLATFORM_PLANS, PlanTier, CompanyEntitlements } from '../types/licensing';
import { DeviceService } from '../services/deviceService';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: PlanTier;
  entitlements?: CompanyEntitlements | null;
  onSuccess?: () => void;
  blockedFeatureTitle?: string;
  blockedFeatureMessage?: string;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  currentPlan = 'FREE',
  entitlements,
  onSuccess,
  blockedFeatureTitle,
  blockedFeatureMessage
}) => {
  const [loadingTrial, setLoadingTrial] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('PRO');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartTrial = async () => {
    try {
      setLoadingTrial(true);
      setFeedback(null);
      await DeviceService.startTrial();
      setFeedback('🎉 Trial PRO de 14 dias ativado com sucesso! Aproveite.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedback(`Erro: ${err.message || 'Não foi possível ativar o trial.'}`);
    } finally {
      setLoadingTrial(false);
    }
  };

  const isFreePlan = (currentPlan === 'FREE' || entitlements?.planTier === 'FREE') && entitlements?.status !== 'TRIAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        
        {/* Header */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <Zap className="w-3.5 h-3.5" /> Planos & Entitlements VarejoPro
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              {blockedFeatureTitle || 'Evolua sua operação comercial'}
            </h2>
            
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {blockedFeatureMessage || 'Comece com o plano gratuito e desbloqueie múltiplos operadores, terminais adicionais, controle fiscal completo e nuvem à medida que sua empresa cresce.'}
            </p>

            {isFreePlan && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleStartTrial}
                  disabled={loadingTrial}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {loadingTrial ? 'Ativando Trial...' : 'Ativar Trial PRO Gratuito (14 dias)'}
                </button>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Sem necessidade de cartão de crédito
                </span>
              </div>
            )}

            {feedback && (
              <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${feedback.includes('🎉') ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                {feedback}
              </div>
            )}
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-900/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* STARTER */}
            <div className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${selectedPlan === 'STARTER' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20 shadow-md' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800'}`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{PLATFORM_PLANS.STARTER.name}</h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {PLATFORM_PLANS.STARTER.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{PLATFORM_PLANS.STARTER.description}</p>
                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">R$ {PLATFORM_PLANS.STARTER.priceMonthly}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/mês</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Até <strong>3 Usuários</strong> com cargos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Até <strong>2 Dispositivos PDV</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>1 Filial Matriz</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>1.000 Produtos & Clientes</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPlan('STARTER')}
                className={`mt-6 w-full py-2 px-4 rounded-lg font-medium text-xs transition-colors ${selectedPlan === 'STARTER' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                {selectedPlan === 'STARTER' ? 'Plano Selecionado' : 'Escolher Starter'}
              </button>
            </div>

            {/* PRO */}
            <div className={`relative rounded-xl border p-5 flex flex-col justify-between transition-all ${selectedPlan === 'PRO' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20 shadow-lg' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800'}`}>
              <div className="absolute -top-3 right-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                Recomendado
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{PLATFORM_PLANS.PRO.name}</h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    {PLATFORM_PLANS.PRO.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{PLATFORM_PLANS.PRO.description}</p>
                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">R$ {PLATFORM_PLANS.PRO.priceMonthly}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/mês</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Até <strong>10 Usuários</strong> com cargos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Até <strong>5 Dispositivos PDV</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Até <strong>2 Filiais</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Emissão Fiscal NFC-e / NF-e</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Backup Google Drive & Workspace</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPlan('PRO')}
                className={`mt-6 w-full py-2 px-4 rounded-lg font-medium text-xs transition-colors ${selectedPlan === 'PRO' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20' : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                {selectedPlan === 'PRO' ? 'Plano Selecionado' : 'Escolher Pro'}
              </button>
            </div>

            {/* BUSINESS */}
            <div className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${selectedPlan === 'BUSINESS' ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-2 ring-purple-500/20 shadow-md' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800'}`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{PLATFORM_PLANS.BUSINESS.name}</h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                    {PLATFORM_PLANS.BUSINESS.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{PLATFORM_PLANS.BUSINESS.description}</p>
                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">R$ {PLATFORM_PLANS.BUSINESS.priceMonthly}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">/mês</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Até <strong>25 Usuários</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Até <strong>15 Dispositivos PDV</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Até <strong>5 Filiais</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Assistente Executivo de IA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>Suporte VIP Prioritário</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPlan('BUSINESS')}
                className={`mt-6 w-full py-2 px-4 rounded-lg font-medium text-xs transition-colors ${selectedPlan === 'BUSINESS' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                {selectedPlan === 'BUSINESS' ? 'Plano Selecionado' : 'Escolher Business'}
              </button>
            </div>

          </div>

          {/* Footer actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
              Precisa de limites customizados para rede ou franquia? Entre em contato com a equipe HQ.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Fechar
              </button>
              <a
                href="https://wa.me/5511999999999?text=Olá!%20Gostaria%20de%20fazer%20upgrade%20do%20VarejoPro%20para%20o%20plano%20"
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
              >
                Contratar Plano {selectedPlan} <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
