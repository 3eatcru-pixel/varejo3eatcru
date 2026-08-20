import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { 
  FileCheck, 
  Building2, 
  Key, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  FileCode,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { FiscalConfig, UserProfile, TaxRegime, CompanyRole } from '../../types';
import { updateFiscalSettings } from '../../services/FiscalService';
import { useToast } from '../../components/Toast';

export default function FiscalSettings({ user }: { user: UserProfile }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [config, setConfig] = useState<FiscalConfig>({
    companyName: 'VAREJOPRO COMERCIO VAREJISTA LTDA',
    tradeName: 'VarejoPro Supermercados & Loja',
    cnpj: '00.000.000/0001-91',
    stateRegistration: '123.456.789.110',
    taxRegime: TaxRegime.SIMPLES_NACIONAL,
    nfceCscId: '000001',
    nfceCscToken: '12345678-ABCD-EFGH-1234-567890ABCDEF',
    nfceSeries: 1,
    nfeSeries: 1,
    certificateExpiry: '2027-12-31'
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const companyId = user.companyId || '';
  const isAdmin = user.role === CompanyRole.ADMIN || user.role === CompanyRole.MANAGER;

  useEffect(() => {
    if (!companyId) return;
    const fiscalRef = doc(db, 'settings', `fiscal_${companyId}`);
    const unsubscribe = onSnapshot(fiscalRef, async (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as FiscalConfig);
      } else {
        // Fetch default fallback once
        try {
          const defaultRef = doc(db, 'settings', 'fiscal');
          const dSnap = await getDoc(defaultRef);
          if (dSnap.exists()) {
            setConfig(dSnap.data() as FiscalConfig);
          }
        } catch (err) {
          console.warn("Erro ao buscar fallback de dados fiscais:", err);
        }
      }
    }, (err) => {
      console.warn("Erro no listener de configurações fiscais:", err);
    });
    return () => unsubscribe();
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showError("Apenas administradores e gerentes podem alterar configurações fiscais.", "Permissão Negada");
      return;
    }

    setSaving(true);
    setSavedSuccess(false);

    try {
      await updateFiscalSettings(config, user);

      setSavedSuccess(true);
      showSuccess("Parâmetros fiscais e certificados salvos com sucesso!", "Configuração Salva");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error("Erro ao salvar dados fiscais:", err);
      showError("Erro ao salvar dados fiscais no Firestore.", "Erro ao Salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-emerald-600" />
            <span>Módulo Fiscal & Configuração de NFC-e / NF-e <span className="ml-2 text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Modo Demonstração</span></span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Parâmetros de emissão fiscal, CSC do QrCode NFC-e, séries e enquadramento tributário
          </p>
        </div>

        {!isAdmin && (
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Somente Leitura (Requer perfil Administrador)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          {savedSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Configurações fiscais salvas com sucesso no banco de dados!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Dados do Emitente */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                Dados do Emitente (Empresa)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Razão Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={config.companyName}
                    onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={config.tradeName || ''}
                    onChange={(e) => setConfig({ ...config, tradeName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    required
                    value={config.cnpj}
                    onChange={(e) => setConfig({ ...config, cnpj: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    type="text"
                    value={config.stateRegistration || ''}
                    onChange={(e) => setConfig({ ...config, stateRegistration: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Regime Tributário
                  </label>
                  <select
                    value={config.taxRegime}
                    onChange={(e) => setConfig({ ...config, taxRegime: e.target.value as TaxRegime })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-700"
                  >
                    <option value={TaxRegime.SIMPLES_NACIONAL}>Simples Nacional</option>
                    <option value={TaxRegime.SIMPLES_NACIONAL_EXCESSO}>Simples Nacional (Excesso de Sublimite)</option>
                    <option value={TaxRegime.REGIME_NORMAL}>Regime Normal (Lucro Presumido / Real)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Parâmetros NFC-e */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Key className="w-4 h-4 text-emerald-500" />
                Parâmetros SEFAZ & CSC NFC-e
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Identificador CSC (ex: 000001)
                  </label>
                  <input
                    type="text"
                    value={config.nfceCscId}
                    onChange={(e) => setConfig({ ...config, nfceCscId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    placeholder="000001"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Token CSC (Código de Segurança)
                  </label>
                  <input
                    type="text"
                    value={config.nfceCscToken}
                    onChange={(e) => setConfig({ ...config, nfceCscToken: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    placeholder="Chave alfanumérica fornecida pela SEFAZ"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Série NFC-e (Consumidor)
                  </label>
                  <input
                    type="number"
                    value={config.nfceSeries}
                    onChange={(e) => setConfig({ ...config, nfceSeries: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Série NF-e (Modelo 55)
                  </label>
                  <input
                    type="number"
                    value={config.nfeSeries}
                    onChange={(e) => setConfig({ ...config, nfeSeries: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving || !isAdmin}
                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 ${
                  isAdmin 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Salvando...' : 'Salvar Dados Fiscais'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Status / Certificate Panel */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">Certificado Digital A1</h3>
                <p className="text-[10px] text-slate-400">Assinatura eletrônica de documentos fiscais</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-bold">Ativo & Válido</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Validade:</span>
                <span className="font-bold">{config.certificateExpiry || '31/12/2027'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ambiente:</span>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded uppercase">Homologação</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-500" />
              Estrutura de Tributação Automática
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              O sistema calcula automaticamente as alíquotas de ICMS, PIS e COFINS cadastradas nos produtos durante a emissão do cupom fiscal NFC-e e gera a chave de acesso com código de barras QrCode de consulta pública da SEFAZ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
