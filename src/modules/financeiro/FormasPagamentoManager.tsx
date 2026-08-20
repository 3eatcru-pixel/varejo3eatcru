import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  QrCode, 
  Percent, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Sliders, 
  ShieldCheck, 
  Plus,
  Trash2,
  Lock,
  Wallet
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, PaymentMethod } from '../../types';
import { useToast } from '../../components/Toast';

export interface PaymentMethodConfig {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  type: 'CASH' | 'PIX' | 'CREDIT' | 'DEBIT' | 'CREDIT_STORE' | 'VOUCHER';
  taxPercent: number;
  settlementDays: number; // D+0, D+1, D+30
  maxInstallments?: number;
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  bannerColors?: string;
}

const DEFAULT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'dinheiro',
    code: 'CASH',
    name: 'Dinheiro em Espécie',
    enabled: true,
    type: 'CASH',
    taxPercent: 0,
    settlementDays: 0,
    bannerColors: 'bg-emerald-500 text-white'
  },
  {
    id: 'pix',
    code: 'PIX',
    name: 'PIX Instantâneo',
    enabled: true,
    type: 'PIX',
    taxPercent: 0.99,
    settlementDays: 0,
    pixKey: 'contato@minhaempresa.com.br',
    pixKeyType: 'EMAIL',
    bannerColors: 'bg-teal-500 text-white'
  },
  {
    id: 'debito',
    code: 'DEBIT_CARD',
    name: 'Cartão de Débito',
    enabled: true,
    type: 'DEBIT',
    taxPercent: 1.49,
    settlementDays: 1,
    bannerColors: 'bg-blue-600 text-white'
  },
  {
    id: 'credito',
    code: 'CREDIT_CARD',
    name: 'Cartão de Crédito',
    enabled: true,
    type: 'CREDIT',
    taxPercent: 2.99,
    settlementDays: 30,
    maxInstallments: 12,
    bannerColors: 'bg-indigo-600 text-white'
  },
  {
    id: 'crediario',
    code: 'STORE_CREDIT',
    name: 'Fiado / Crediário Próprio',
    enabled: true,
    type: 'CREDIT_STORE',
    taxPercent: 0,
    settlementDays: 30,
    bannerColors: 'bg-amber-600 text-white'
  }
];

export default function FormasPagamentoManager({ user }: { user: UserProfile }) {
  const { showSuccess, showError } = useToast();
  const companyId = user.companyId || 'empresa_principal';

  const [methods, setMethods] = useState<PaymentMethodConfig[]>(DEFAULT_METHODS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const docRef = doc(db, 'settings', `payment_methods_${companyId}`);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.methods && Array.isArray(data.methods)) {
          setMethods(data.methods);
        }
      }
      setLoading(false);
    }, (err) => {
      console.warn('Erro ao carregar formas de pagamento:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [companyId]);

  const handleToggle = (id: string) => {
    setMethods(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const handleUpdateField = (id: string, field: keyof PaymentMethodConfig, value: any) => {
    setMethods(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'settings', `payment_methods_${companyId}`);
      await setDoc(docRef, {
        methods,
        companyId,
        updatedAt: new Date().toISOString(),
        updatedBy: user.email || user.name
      }, { merge: true });
      showSuccess('Formas de pagamento e taxas da maquininha atualizadas com sucesso!', 'Configuração Salva');
    } catch (err: any) {
      showError('Falha ao salvar configurações de pagamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2.5">
              <CreditCard className="w-6 h-6 text-emerald-600" />
              Formas de Pagamento & Taxas
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Configure as bandeiras aceitas no Caixa (PDV), taxas de maquininha e prazos de recebimento
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

        {/* Methods List */}
        <div className="space-y-4">
          {methods.map((method) => (
            <div 
              key={method.id}
              className={`bg-white rounded-3xl p-5 border transition-all ${
                method.enabled ? 'border-slate-200 shadow-sm' : 'border-slate-200/60 opacity-60 bg-slate-50/50'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                    method.type === 'CASH' ? 'bg-emerald-100 text-emerald-700' :
                    method.type === 'PIX' ? 'bg-teal-100 text-teal-700' :
                    method.type === 'DEBIT' ? 'bg-blue-100 text-blue-700' :
                    method.type === 'CREDIT' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {method.type === 'CASH' ? <DollarSign className="w-5 h-5" /> :
                     method.type === 'PIX' ? <QrCode className="w-5 h-5" /> :
                     <CreditCard className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      {method.name}
                      {method.enabled ? (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">
                          Ativo no PDV
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">
                          Inativo
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400">
                      Código do sistema: <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded text-[10px]">{method.code}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600">Disponível no Caixa:</span>
                  <button
                    type="button"
                    onClick={() => handleToggle(method.id)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${
                      method.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      method.enabled ? 'right-1' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Specific Config Inputs */}
              {method.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Percent className="w-3 h-3 text-emerald-600" />
                      Taxa / Desconto Maquininha (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={method.taxPercent}
                      onChange={e => handleUpdateField(method.id, 'taxPercent', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      Prazo de Liquidação
                    </label>
                    <select
                      value={method.settlementDays}
                      onChange={e => handleUpdateField(method.id, 'settlementDays', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="0">D+0 (Imediato / No mesmo dia)</option>
                      <option value="1">D+1 (1 dia útil)</option>
                      <option value="2">D+2 (2 dias úteis)</option>
                      <option value="14">D+14 (14 dias corridos)</option>
                      <option value="30">D+30 (30 dias corridos)</option>
                    </select>
                  </div>

                  {method.type === 'CREDIT' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Máximo de Parcelas
                      </label>
                      <select
                        value={method.maxInstallments || 12}
                        onChange={e => handleUpdateField(method.id, 'maxInstallments', parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="1">1x (À vista apenas)</option>
                        <option value="3">Até 3x</option>
                        <option value="6">Até 6x</option>
                        <option value="10">Até 10x</option>
                        <option value="12">Até 12x</option>
                      </select>
                    </div>
                  )}

                  {method.type === 'PIX' && (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Chave PIX da Empresa
                      </label>
                      <input
                        type="text"
                        placeholder="Chave CNPJ, E-mail, Celular ou Aleatória"
                        value={method.pixKey || ''}
                        onChange={e => handleUpdateField(method.id, 'pixKey', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Security / Audit Card */}
        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-900 font-medium leading-relaxed">
            As taxas configuradas aqui são usadas automaticamente no cálculo de DRE e conciliação bancária do Financeiro.
          </p>
        </div>
      </div>
    </div>
  );
}
