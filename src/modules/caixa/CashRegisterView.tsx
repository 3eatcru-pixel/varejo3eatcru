import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  DollarSign, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  History, 
  Printer, 
  Plus, 
  Calendar, 
  User, 
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Receipt,
  Download,
  Eye
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  CashRegister, 
  CashRegisterStatus, 
  PaymentMethod, 
  UserProfile 
} from '../../types';
import { getActiveCashRegister, getCashRegisterHistory } from '../../services/CashRegisterService';
import CashRegisterModal from './CashRegisterModal';
import CashRegisterAuditModal from './CashRegisterAuditModal';

interface CashRegisterViewProps {
  user: UserProfile;
  activeRegister: CashRegister | null;
  onRefreshRegister: () => void;
}

export default function CashRegisterView({
  user,
  activeRegister,
  onRefreshRegister
}: CashRegisterViewProps) {
  const [modalMode, setModalMode] = useState<'open' | 'sangria' | 'suprimento' | 'close' | null>(null);
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedRegisterForAudit, setSelectedRegisterForAudit] = useState<CashRegister | null>(null);

  const companyId = user.companyId || '';

  useEffect(() => {
    loadRegisterHistory();
  }, [companyId]);

  const loadRegisterHistory = async () => {
    if (!companyId) return;
    setLoadingHistory(true);
    try {
      const apiHistory = await getCashRegisterHistory();
      if (apiHistory && apiHistory.length > 0) {
        setHistory(apiHistory);
        return;
      }

      const q = query(
        collection(db, 'cash_registers'),
        where('companyId', '==', companyId),
        limit(50)
      );
      const snap = await getDocs(q);
      const list: CashRegister[] = [];
      snap.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() } as CashRegister;
        if (!item.companyId || item.companyId === companyId) {
          list.push(item);
        }
      });
      list.sort((a, b) => {
        const tA = a.openedAt ? new Date(a.openedAt).getTime() : 0;
        const tB = b.openedAt ? new Date(b.openedAt).getTime() : 0;
        return tB - tA;
      });
      setHistory(list);
    } catch (err) {
      console.error('Erro ao carregar histórico de caixa:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleModalSuccess = (newOrUpdatedRegister?: CashRegister | null) => {
    setModalMode(null);
    onRefreshRegister();
    loadRegisterHistory();
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;

    const headers = [
      'Status',
      'Data Abertura',
      'Data Fechamento',
      'Operador',
      'Saldo Inicial',
      'Vendas Dinheiro',
      'Vendas PIX',
      'Vendas Cartao',
      'Total Declarado',
      'Diferenca / Quebra',
      'Observacoes'
    ];

    const rows = history.map(r => {
      const totals = r.totalsByPaymentMethod || { [PaymentMethod.CASH]: 0, [PaymentMethod.PIX]: 0, [PaymentMethod.CREDIT_CARD]: 0, [PaymentMethod.DEBIT_CARD]: 0 };
      const cartao = (totals[PaymentMethod.CREDIT_CARD] || 0) + (totals[PaymentMethod.DEBIT_CARD] || 0);
      return [
        r.status === 'OPEN' ? 'ABERTO' : 'FECHADO',
        r.openedAt ? new Date(r.openedAt).toLocaleString('pt-BR') : '',
        r.closedAt ? new Date(r.closedAt).toLocaleString('pt-BR') : '',
        r.openedByName || '',
        (r.initialBalance || 0).toFixed(2),
        (totals[PaymentMethod.CASH] || 0).toFixed(2),
        (totals[PaymentMethod.PIX] || 0).toFixed(2),
        cartao.toFixed(2),
        r.finalBalanceDeclared !== undefined ? r.finalBalanceDeclared.toFixed(2) : '',
        r.cashDifference !== undefined ? r.cashDifference.toFixed(2) : '',
        r.notes || ''
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Auditoria_Caixa_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totals = activeRegister?.totalsByPaymentMethod || {
    [PaymentMethod.CASH]: 0,
    [PaymentMethod.PIX]: 0,
    [PaymentMethod.CREDIT_CARD]: 0,
    [PaymentMethod.DEBIT_CARD]: 0
  };

  const totalSalesAll = Object.values(totals).reduce((a, b) => a + b, 0);

  const sangriasTotal = (activeRegister?.operations || [])
    .filter(o => o.type === 'SANGRIA')
    .reduce((a, b) => a + b.amount, 0);

  const suprimentosTotal = (activeRegister?.operations || [])
    .filter(o => o.type === 'SUPRIMENTO')
    .reduce((a, b) => a + b.amount, 0);

  const expectedCashInDrawer = (activeRegister?.initialBalance || 0) + (totals[PaymentMethod.CASH] || 0) + suprimentosTotal - sangriasTotal;

  return (
    <div className="flex-1 bg-slate-100 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6">
      {/* Top Banner Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`p-3 sm:p-4 rounded-2xl border ${
            activeRegister 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            {activeRegister ? <Unlock className="w-6 h-6 sm:w-8 sm:h-8" /> : <Lock className="w-6 h-6 sm:w-8 sm:h-8" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${activeRegister ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider">
                {activeRegister ? 'Caixa Aberto' : 'Caixa Fechado'}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {activeRegister 
                ? `Aberto em ${new Date(activeRegister.openedAt).toLocaleString('pt-BR')} por ${activeRegister.openedByName}`
                : 'Nenhum turno de caixa ativo no momento. Abra o caixa para iniciar as vendas.'
              }
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          {activeRegister ? (
            <>
              <button
                onClick={() => setModalMode('sangria')}
                className="min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                <ArrowDownCircle className="w-4 h-4" />
                <span>Sangria</span>
              </button>
              <button
                onClick={() => setModalMode('suprimento')}
                className="min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>Suprimento</span>
              </button>
              <button
                onClick={() => setModalMode('close')}
                className="min-h-[44px] px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
              >
                <Lock className="w-4 h-4" />
                <span>Fechar Caixa</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setModalMode('open')}
              className="min-h-[44px] px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Novo Turno de Caixa</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Session Overview Stats */}
      {activeRegister && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Fundo de Troco Inicial</p>
            <p className="text-2xl font-black text-slate-800 mt-1">R$ {activeRegister.initialBalance.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Valor informado na abertura</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Total de Vendas (Turno)</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">R$ {totalSalesAll.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Soma de todos os meios de pagamento</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Sangrias / Retiradas</p>
            <p className="text-2xl font-black text-rose-600 mt-1">R$ {sangriasTotal.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Total de retiradas no turno</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Espécie Esperada em Gaveta</p>
            <p className="text-2xl font-black text-blue-600 mt-1">R$ {expectedCashInDrawer.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Troco + Vendas Dinheiro + Suprimentos - Sangrias</p>
          </div>
        </div>
      )}

      {/* Breakdown by Payment Method */}
      {activeRegister && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Vendas por Forma de Pagamento</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Dinheiro</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">R$ {(totals[PaymentMethod.CASH] || 0).toFixed(2)}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">PIX</span>
                <span className="text-lg font-black text-emerald-600 mt-1 block">R$ {(totals[PaymentMethod.PIX] || 0).toFixed(2)}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Cartão Crédito</span>
                <span className="text-lg font-black text-blue-600 mt-1 block">R$ {(totals[PaymentMethod.CREDIT_CARD] || 0).toFixed(2)}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Cartão Débito</span>
                <span className="text-lg font-black text-indigo-600 mt-1 block">R$ {(totals[PaymentMethod.DEBIT_CARD] || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Operations Log */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <span>Sangrias e Suprimentos</span>
            </h2>

            {activeRegister.operations && activeRegister.operations.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {activeRegister.operations.map((op) => (
                  <div key={op.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-black uppercase text-[10px] px-1.5 py-0.5 rounded ${
                          op.type === 'SANGRIA' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {op.type}
                        </span>
                        <span className="font-bold text-slate-700">{op.reason}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{op.operatorName}</p>
                    </div>
                    <span className={`font-black text-sm ${op.type === 'SANGRIA' ? 'text-rose-600' : 'text-blue-600'}`}>
                      {op.type === 'SANGRIA' ? '-' : '+'} R$ {op.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-6 text-center">Nenhuma sangria ou suprimento registrado neste turno.</p>
            )}
          </div>
        </div>
      )}

      {/* History of Cash Registers */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-600" />
            <span>Histórico de Turnos de Caixa</span>
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={history.length === 0}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={loadRegisterHistory}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Atualizar histórico"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
            Carregando sessões anteriores...
          </div>
        ) : history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Abertura</th>
                  <th className="py-3 px-3">Fechamento</th>
                  <th className="py-3 px-3">Operador</th>
                  <th className="py-3 px-3">Saldo Inicial</th>
                  <th className="py-3 px-3">Total Declarado</th>
                  <th className="py-3 px-3">Diferença / Quebra</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {history.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 font-black text-[10px] uppercase px-2 py-0.5 rounded-full ${
                        reg.status === 'OPEN' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {reg.status === 'OPEN' ? 'ABERTO' : 'FECHADO'}
                      </span>
                    </td>
                    <td className="py-3 px-3">{new Date(reg.openedAt).toLocaleString('pt-BR')}</td>
                    <td className="py-3 px-3">{reg.closedAt ? new Date(reg.closedAt).toLocaleString('pt-BR') : '-'}</td>
                    <td className="py-3 px-3 font-bold">{reg.openedByName}</td>
                    <td className="py-3 px-3 font-bold">R$ {reg.initialBalance.toFixed(2)}</td>
                    <td className="py-3 px-3 font-bold">
                      {reg.finalBalanceDeclared !== undefined ? `R$ ${reg.finalBalanceDeclared.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 px-3">
                      {reg.cashDifference !== undefined ? (
                        <span className={`font-bold ${
                          reg.cashDifference === 0 ? 'text-slate-600' :
                          reg.cashDifference < 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          R$ {reg.cashDifference.toFixed(2)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedRegisterForAudit(reg)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                        title="Ver Extrato e Imprimir Comprovante"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>Extrato</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-6 text-center">Nenhum registro de caixa encontrado.</p>
        )}
      </div>

      {/* Render Operation / Close Modal */}
      {modalMode && (
        <CashRegisterModal
          mode={modalMode}
          activeRegister={activeRegister}
          user={user}
          onClose={() => setModalMode(null)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Render Audit Detail Modal */}
      {selectedRegisterForAudit && (
        <CashRegisterAuditModal
          register={selectedRegisterForAudit}
          onClose={() => setSelectedRegisterForAudit(null)}
        />
      )}
    </div>
  );
}
