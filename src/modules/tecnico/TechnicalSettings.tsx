import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { Monitor, Printer, Smartphone, Bluetooth, Wifi, RotateCcw, Cloud, CloudOff, Database, CheckCircle2, Sliders, Layout, HardDrive, RefreshCw } from 'lucide-react';
import { useToast } from '../../components/Toast';

export default function TechnicalSettings({ user }: { user: UserProfile }) {
  const { showSuccess } = useToast();
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  const handleRunDiagnostic = () => {
    setDiagnosticLoading(true);
    setTimeout(() => {
      setDiagnosticLoading(false);
      showSuccess('Diagnóstico de sistema concluído. Todos os módulos operacionais estão saudáveis.', 'Sistema Saudável');
    }, 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Monitor className="w-6 h-6 text-blue-500" />
            Configurações Técnicas & Periféricos
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Gerencie hardware, sincronização e preferências locais deste terminal
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Devices */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-blue-500" />
                  Dispositivos & Impressoras
                </h3>
                <button className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-200 hover:bg-blue-100 transition-all">
                  Buscar Dispositivos
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Printer Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Printer className="w-5 h-5 text-slate-600" />
                    </div>
                    <span className="text-[9px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black">CONECTADO</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Impressora Térmica Padrão</h4>
                    <p className="text-[10px] text-slate-500 font-medium">EPSON TM-T20X (USB)</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-white text-[10px] font-bold text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-100">Testar Impressão</button>
                    <button className="flex-1 py-2 bg-white text-[10px] font-bold text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-100">Configurar</button>
                  </div>
                </div>

                {/* Bluetooth/Scanner Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Bluetooth className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-[9px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black">EM BUSCA</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Leitor de Código de Barras</h4>
                    <p className="text-[10px] text-slate-500 font-medium">Buscando via Bluetooth HID...</p>
                  </div>
                  <button className="w-full py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md hover:bg-blue-700">Parear Dispositivo</button>
                </div>
              </div>

              {/* Other peripherals */}
              <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-100">
                {[
                  { label: 'Gaveta de Dinheiro', icon: HardDrive, status: 'Pronta' },
                  { label: 'Balança Integrada', icon: Database, status: 'Não Conectada' },
                  { label: 'Terminal de Cartão', icon: Smartphone, status: 'Conectado (API)' },
                  { label: 'Display de Cliente', icon: Monitor, status: 'Desativado' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-100 rounded-2xl flex flex-col items-center text-center space-y-1 hover:border-blue-300 transition-all cursor-pointer group">
                    <item.icon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    <p className="text-[9px] font-black text-slate-900 leading-tight">{item.label}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{item.status}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Offline Sync Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                    {offlineEnabled ? <Cloud className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black">Resiliência Offline (PWA)</h3>
                    <p className="text-xs text-blue-100 font-medium">Operação garantida mesmo sem internet</p>
                  </div>
                </div>
                <button 
                  onClick={() => setOfflineEnabled(!offlineEnabled)}
                  className={`w-12 h-6 rounded-full transition-all relative ${offlineEnabled ? 'bg-emerald-400' : 'bg-slate-400/40'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${offlineEnabled ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <div className="bg-black/20 rounded-2xl p-4 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-blue-200">
                  <span>Sincronização Local</span>
                  <span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3 animate-spin" /> Em Execução</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-400 h-full w-[85%] rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                </div>
                <p className="text-[10px] text-blue-100 leading-relaxed italic">
                  85% do catálogo de produtos e vendas offline sincronizados com o servidor central.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: System Prefs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Layout className="w-4 h-4 text-blue-500" />
                Preferências de Interface
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Modo Compacto</p>
                    <p className="text-[10px] text-slate-500">Exibir mais itens no PDV</p>
                  </div>
                  <input type="checkbox" className="w-4 h-4 accent-blue-600 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Notificações Sonoras</p>
                    <p className="text-[10px] text-slate-500">Alertas em vendas e erros</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-wider">Escala da UI</p>
                    <p className="text-[10px] text-slate-500">Ajuste de zoom da interface</p>
                  </div>
                  <select className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none">
                    <option>Padrão (100%)</option>
                    <option>Grande (110%)</option>
                    <option>Desktop (90%)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                Ferramentas de Suporte
              </h3>
              
              <div className="space-y-3">
                <button 
                  onClick={handleRunDiagnostic}
                  disabled={diagnosticLoading}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  {diagnosticLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                  {diagnosticLoading ? 'Executando...' : 'Diagnóstico de Rede'}
                </button>
                
                <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-all flex items-center justify-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  Limpar Cache Local
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Versão do App</span>
                <span className="text-[9px] text-emerald-400 font-mono">v1.0.8-prod</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
