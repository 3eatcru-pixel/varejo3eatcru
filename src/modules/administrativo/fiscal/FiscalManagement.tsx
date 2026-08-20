import React, { useState } from 'react';
import { UserProfile } from '../../../types';
import { Receipt, ShieldCheck, FileText, Landmark, Percent, AlertCircle, Save, Loader2, Download, ExternalLink, Settings2, ShieldAlert } from 'lucide-react';
import { useToast } from '../../../components/Toast';

export default function FiscalManagement({ user }: { user: UserProfile }) {
  const { showSuccess } = useToast();
  const [loading, setLoading] = useState(false);

  const [fiscalData, setFiscalData] = useState({
    cnpj: '12.345.678/0001-90',
    ie: '123.456.789.000',
    taxRegime: 'SIMPLES_NACIONAL',
    nfeSeries: '1',
    nfceSeries: '1',
    cscToken: 'ABCD-1234-EFGH-5678',
    cscId: '000001',
    certificateStatus: 'ACTIVE',
    certificateExpiry: '2026-12-15',
  });

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showSuccess('Configurações fiscais e dados de emissão atualizados com sucesso.', 'Dados Fiscais Salvos');
    }, 1500);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-rose-500" />
              Fiscal & Gestão de Impostos
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Configure seu regime tributário, certificados digitais e séries de emissão
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" /> : <Save className="w-4 h-4 text-rose-400" />}
              {loading ? 'Processando...' : 'Salvar Dados Fiscais'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Fiscal Data */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tax Regime */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-rose-500" />
                  Regime Tributário & Identificação
                </h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded border border-emerald-200">
                  CONFORMIDADE ATIVA
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CNPJ da Empresa</label>
                  <input 
                    type="text" 
                    value={fiscalData.cnpj}
                    disabled
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-400 cursor-not-allowed" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inscrição Estadual (IE)</label>
                  <input 
                    type="text" 
                    value={fiscalData.ie}
                    onChange={e => setFiscalData({...fiscalData, ie: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Regime Tributário</label>
                <select 
                  value={fiscalData.taxRegime}
                  onChange={e => setFiscalData({...fiscalData, taxRegime: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                  <option value="SIMPLES_NACIONAL_EXCESSO">Simples Nacional - Excesso de Sublimite</option>
                  <option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
                  <option value="LUCRO_REAL">Lucro Real</option>
                </select>
              </div>
            </div>

            {/* Invoicing Series */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-500" />
                Emissão de Documentos (NF-e / NFC-e)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Série NF-e (Produto)</label>
                    <input 
                      type="text" 
                      value={fiscalData.nfeSeries}
                      onChange={e => setFiscalData({...fiscalData, nfeSeries: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Série NFC-e (Consumidor)</label>
                    <input 
                      type="text" 
                      value={fiscalData.nfceSeries}
                      onChange={e => setFiscalData({...fiscalData, nfceSeries: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none" 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID do Token CSC (NFC-e)</label>
                    <input 
                      type="text" 
                      value={fiscalData.cscId}
                      onChange={e => setFiscalData({...fiscalData, cscId: e.target.value})}
                      placeholder="Ex: 000001"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Código CSC (NFC-e)</label>
                    <input 
                      type="password" 
                      value={fiscalData.cscToken}
                      onChange={e => setFiscalData({...fiscalData, cscToken: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Certificado Digital Card */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Certificado Digital A1
                </h3>
                <div className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ATIVO & VÁLIDO
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                <div className="p-4 bg-white/5 rounded-3xl border border-white/10">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <div className="flex-1 space-y-1 text-center md:text-left">
                  <p className="text-sm font-black">CERTIFICADO_A1_EMPRESA.pfx</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Expira em: {new Date(fiscalData.certificateExpiry).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    Baixar
                  </button>
                  <button className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-500/20">
                    Substituir
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tax Assistance */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Percent className="w-4 h-4 text-rose-500" />
                Aliquotas Padrão
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400">ICMS Médio</span>
                    <span className="text-xs font-black text-slate-900">18.0%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full">
                    <div className="bg-rose-500 h-full w-[18%]" />
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400">PIS/COFINS</span>
                    <span className="text-xs font-black text-slate-900">3.65%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 rounded-full">
                    <div className="bg-rose-500 h-full w-[3.65%]" />
                  </div>
                </div>
                <button className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center gap-2">
                  <Settings2 className="w-3.5 h-3.5" />
                  Configurar Tabelas Taxonomicas
                </button>
              </div>
            </div>

            {/* Compliance Info */}
            <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 space-y-3">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="w-5 h-5" />
                <h4 className="text-xs font-black uppercase tracking-wider">Atenção Fiscal</h4>
              </div>
              <p className="text-[10px] text-rose-700 font-medium leading-relaxed">
                As configurações fiscais impactam diretamente a validade jurídica das suas vendas. Certifique-se de validar os dados com seu contador antes de iniciar a emissão em produção.
              </p>
              <button className="w-full py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20">
                <Download className="w-3.5 h-3.5" />
                Guia de Configuração Fiscal
              </button>
            </div>

            {/* SEFAZ Links */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Links Úteis SEFAZ</h4>
              <div className="space-y-2">
                {[
                  { label: 'Consulta NF-e', url: '#' },
                  { label: 'Portal Simples Nacional', url: '#' },
                  { label: 'Validar XML', url: '#' },
                ].map((link, idx) => (
                  <a key={idx} href={link.url} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-all group">
                    {link.label}
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-rose-500" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
