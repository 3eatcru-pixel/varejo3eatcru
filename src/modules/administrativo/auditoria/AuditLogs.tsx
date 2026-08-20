import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../../types';
import { ShieldAlert, Search, Filter, Download, Calendar, User, Activity, Clock } from 'lucide-react';

export default function AuditLogs({ user }: { user: UserProfile }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Simulation of logs fetch
      const dummyLogs = [
        { id: 1, action: 'SALE_CREATED', details: 'Venda #1001 finalizada por Marcos', userId: 'usr_1', userName: 'Marcos', ip: '192.168.0.1', timestamp: new Date().toISOString() },
        { id: 2, action: 'STOCK_ADJUSTED', details: 'Ajuste manual de estoque: Camiseta Pima (+10)', userId: 'usr_1', userName: 'Marcos', ip: '192.168.0.1', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, action: 'MEMBER_REMOVED', details: 'Funcionário João Silva removido da empresa', userId: 'usr_2', userName: 'Admin', ip: '177.20.xx.xx', timestamp: new Date(Date.now() - 7200000).toISOString() },
        { id: 4, action: 'DISCOUNT_GIVEN', details: 'Desconto de 25% aplicado na Venda #998', userId: 'usr_3', userName: 'Julia (Caixa)', ip: '10.0.0.5', timestamp: new Date(Date.now() - 86400000).toISOString() },
      ];
      setLogs(dummyLogs);
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
              <ShieldAlert className="w-6 h-6 text-rose-500" />
              Logs de Auditoria & Segurança
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Rastreamento imutável de todas as ações administrativas e financeiras críticas
            </p>
          </div>
          <button className="px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <Download className="w-4 h-4" />
            Exportar Relatório
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ação, usuário ou detalhe..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button className="px-4 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Hoje
          </button>
          <button className="px-4 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Mais Filtros
          </button>
        </div>

        {/* Audit Feed */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ação / Evento</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuário</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Detalhes</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">IP / Terminal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px]">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        log.action.includes('SALE') ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        log.action.includes('DELETE') || log.action.includes('REMOVED') ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-500" />
                        </div>
                        <span className="text-xs font-black text-slate-900">{log.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-600 font-medium line-clamp-1">{log.details}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <code className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {log.ip}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Warning Footer */}
        <div className="p-4 bg-slate-900 rounded-3xl text-white border border-slate-800 flex items-center gap-4 shadow-xl">
          <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black uppercase tracking-wider">Integridade de Auditoria Garantida</h4>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5">
              Estes registros são imutáveis e protegidos contra edição manual. Em caso de discrepâncias financeiras, os logs de auditoria são a fonte primária de verdade para reconciliação e conformidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
