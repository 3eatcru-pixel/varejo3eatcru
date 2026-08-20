import { PlanTier } from '../../types/licensing';
import React, { useState } from 'react';
import { 
  Building2, 
  Eye, 
  Palette, 
  Image, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  Layers,
  Save
} from 'lucide-react';
import { CompanyBranding } from '../../types/branding';
import { formatCurrency } from '../../lib/utils';

interface Props {
  companies: any[];
  onUpdateBranding?: (companyId: string, branding: Partial<CompanyBranding>) => void;
}

export default function PlatformBrandingControlCenter({ companies, onUpdateBranding }: Props) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id || 'empresa_principal');
  const selectedComp = companies.find(c => c.id === selectedCompanyId) || companies[0];

  const [previewTier, setPreviewTier] = useState<PlanTier>('PRO');
  const [allowCustomDomain, setAllowCustomDomain] = useState(true);
  const [allowWhiteLabel, setAllowWhiteLabel] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider">
            Gestão Multi-Tenant & White-Label 3eatcru
          </span>
          <h2 className="text-xl font-black uppercase tracking-wider text-white mt-1 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" />
            <span>Central de Identidade & Marcas dos Clientes</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Supervisione como cada empresa cliente enxerga o sistema com logo, cores e personalização de marca.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCompanyId}
            onChange={e => setSelectedCompanyId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-emerald-500"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>
                {c.name || c.tradeName || c.id} ({c.plan || 'PRO'})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Client Plan Branding Entitlements (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block">
              Empresa Selecionada
            </span>
            <h3 className="text-lg font-black text-white mt-0.5">
              {selectedComp?.name || selectedComp?.tradeName || 'Empresa Cliente'}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedComp?.id || 'empresa_principal'}</p>
          </div>

          <div className="space-y-4 text-xs">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Nível de White-Label Liberado pela 3eatcru
            </h4>

            <div className="grid grid-cols-2 gap-2">
              {[
                { tier: 'STARTER', label: 'STARTER', desc: 'Logo simples no cabeçalho' },
                { tier: 'PRO', label: 'PRO', desc: 'Logo + Cores + Favicon' },
                { tier: 'BUSINESS', label: 'BUSINESS', desc: 'Identidade Total + White-Label' },
                { tier: 'ENTERPRISE', label: 'ENTERPRISE', desc: 'Marca própria + Domínio custom' }
              ].map(t => (
                <button
                  key={t.tier}
                  type="button"
                  onClick={() => setPreviewTier(t.tier as any)}
                  className={`p-3 rounded-2xl border text-left transition ${
                    previewTier === t.tier 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-black uppercase">{t.label}</p>
                  <p className="text-[9px] opacity-80">{t.desc}</p>
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                <div>
                  <p className="font-bold text-white text-xs">Remover "Tecnologia VarejoPro"</p>
                  <p className="text-[10px] text-slate-400">Permitir anonimização 100% white-label</p>
                </div>
                <input
                  type="checkbox"
                  checked={allowWhiteLabel}
                  onChange={e => setAllowWhiteLabel(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                <div>
                  <p className="font-bold text-white text-xs">Suporte a Domínio Próprio</p>
                  <p className="text-[10px] text-slate-400">ex: app.mercadosilva.com.br</p>
                </div>
                <input
                  type="checkbox"
                  checked={allowCustomDomain}
                  onChange={e => setAllowCustomDomain(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Mockup of How Client Sees the ERP (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-white space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Simulação da Experiência do Cliente ({selectedComp?.name || 'Cliente'})</span>
            </h3>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              WHITE-LABEL ATIVO
            </span>
          </div>

          {/* Browser Window Mockup */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Browser top bar */}
            <div className="h-8 bg-slate-950 px-3 flex items-center gap-2 border-b border-slate-800 text-[10px] font-mono text-slate-400">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="ml-2 px-3 py-0.5 bg-slate-900 rounded text-slate-300 truncate">
                {allowCustomDomain ? `app.${(selectedComp?.name || 'loja').toLowerCase().replace(/\s+/g, '')}.com.br` : 'app.varejopro.com.br'}
              </span>
            </div>

            {/* Simulated App View */}
            <div className="flex h-64">
              {/* Simulated Sidebar */}
              <div className="w-44 bg-slate-950 p-3 border-r border-slate-800 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-1.5 bg-slate-900 rounded-xl border border-slate-800">
                    <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-slate-950 text-xs">
                      {(selectedComp?.name || 'M')[0]}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-[10px] text-white truncate">{selectedComp?.name || 'Mercado Silva'}</p>
                      <p className="text-[8px] text-slate-400">PDV & Gestão</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-[9px] font-medium text-slate-400">
                    <div className="p-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg flex items-center gap-1.5">
                      <span>📊 Dashboard</span>
                    </div>
                    <div className="p-1.5 hover:bg-slate-900 rounded-lg">🛒 Frente de Caixa</div>
                    <div className="p-1.5 hover:bg-slate-900 rounded-lg">📦 Estoque</div>
                    <div className="p-1.5 hover:bg-slate-900 rounded-lg">💳 Financeiro</div>
                  </div>
                </div>

                {!allowWhiteLabel ? (
                  <p className="text-[7px] text-slate-500 text-center uppercase tracking-wider">
                    Tecnologia 3eatcru • VarejoPro
                  </p>
                ) : (
                  <p className="text-[7px] text-slate-600 text-center uppercase tracking-wider">
                    Sistema Personalizado
                  </p>
                )}
              </div>

              {/* Simulated Main Content */}
              <div className="flex-1 bg-slate-900 p-4 space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h5 className="text-xs font-bold text-white">Painel Operacional — {selectedComp?.name || 'Loja'}</h5>
                  <span className="text-[9px] text-emerald-400 font-mono">Caixa Aberto (PDV-01)</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[8px] text-slate-400 block uppercase">Vendas Hoje</span>
                    <span className="text-xs font-black text-emerald-400">R$ 4.280,00</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[8px] text-slate-400 block uppercase">Pedidos Emitidos</span>
                    <span className="text-xs font-black text-cyan-400">38 Cupons</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[9px] text-slate-300 space-y-1">
                  <p className="font-bold text-white text-[10px]">✨ Ambiente 100% Customizado</p>
                  <p className="text-slate-400 text-[8px]">
                    O lojista e seus operadores utilizam o sistema com a identidade visual própria, aumentando o valor percebido da solução 3eatcru.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
