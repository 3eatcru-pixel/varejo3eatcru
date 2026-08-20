import React from 'react';
import { 
  X, 
  Printer, 
  Receipt, 
  Calendar, 
  User, 
  DollarSign, 
  TrendingUp, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  AlertTriangle, 
  CheckCircle2,
  Lock,
  Unlock
} from 'lucide-react';
import { CashRegister, PaymentMethod } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface CashRegisterAuditModalProps {
  register: CashRegister | null;
  onClose: () => void;
}

export default function CashRegisterAuditModal({
  register,
  onClose
}: CashRegisterAuditModalProps) {
  if (!register) return null;

  const totals = register.totalsByPaymentMethod || {
    [PaymentMethod.CASH]: 0,
    [PaymentMethod.PIX]: 0,
    [PaymentMethod.CREDIT_CARD]: 0,
    [PaymentMethod.DEBIT_CARD]: 0
  };

  const totalSales = Object.values(totals).reduce((a, b) => a + b, 0);

  const sangrias = (register.operations || []).filter(o => o.type === 'SANGRIA');
  const suprimentos = (register.operations || []).filter(o => o.type === 'SUPRIMENTO');

  const sangriasTotal = sangrias.reduce((a, b) => a + b.amount, 0);
  const suprimentosTotal = suprimentos.reduce((a, b) => a + b.amount, 0);

  const expectedCashInDrawer = (register.initialBalance || 0) + (totals[PaymentMethod.CASH] || 0) + suprimentosTotal - sangriasTotal;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${
              register.status === 'OPEN' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-slate-800 text-slate-300'
            }`}>
              {register.status === 'OPEN' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">
                Auditoria de Turno de Caixa
              </h3>
              <p className="text-xs text-slate-400">
                {register.status === 'OPEN' ? 'Turno Ativo em Andamento' : 'Turno Encerrado e Auditado'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
              title="Imprimir Comprovante"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
          {/* Printable Ticket Receipt Styling */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono space-y-3">
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 font-sans">
                EXTRATO DE FECHAMENTO DE CAIXA
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">SISTEMA VAREJOPRO POS & ERP</p>
              <p className="text-[10px] text-slate-500">ID SESSÃO: {register.id.slice(0, 16)}</p>
            </div>

            {/* General Info */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold uppercase text-slate-900">{register.status === 'OPEN' ? 'ABERTO' : 'FECHADO'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Operador Abertura:</span>
                <span className="font-bold text-slate-900">{register.openedByName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data/Hora Abertura:</span>
                <span>{new Date(register.openedAt).toLocaleString('pt-BR')}</span>
              </div>
              {register.closedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Data/Hora Fechamento:</span>
                  <span>{new Date(register.closedAt).toLocaleString('pt-BR')}</span>
                </div>
              )}
            </div>

            {/* Balances Breakdown */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-between font-bold">
                <span>(+) Fundo de Troco Inicial:</span>
                <span>{formatCurrency(register.initialBalance)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>(+) Total Vendas Dinheiro:</span>
                <span>{formatCurrency(totals[PaymentMethod.CASH] || 0)}</span>
              </div>
              <div className="flex justify-between text-blue-600">
                <span>(+) Suprimentos de Caixa:</span>
                <span>{formatCurrency(suprimentosTotal)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>(-) Sangrias / Retiradas:</span>
                <span>- {formatCurrency(sangriasTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black pt-1 border-t border-slate-200">
                <span>(=) Espécie Esperada em Gaveta:</span>
                <span>{formatCurrency(expectedCashInDrawer)}</span>
              </div>
            </div>

            {/* Sales by Payment Method */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
              <div className="font-bold text-slate-700 uppercase text-[10px] mb-1">Vendas por Meio de Pagamento:</div>
              <div className="flex justify-between">
                <span>Dinheiro:</span>
                <span>{formatCurrency(totals[PaymentMethod.CASH] || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>PIX:</span>
                <span>{formatCurrency(totals[PaymentMethod.PIX] || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cartão de Crédito:</span>
                <span>{formatCurrency(totals[PaymentMethod.CREDIT_CARD] || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cartão de Débito:</span>
                <span>{formatCurrency(totals[PaymentMethod.DEBIT_CARD] || 0)}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL GERAL DE VENDAS:</span>
                <span className="text-emerald-700">{formatCurrency(totalSales)}</span>
              </div>
            </div>

            {/* Blind Close Comparison if closed */}
            {register.status === 'CLOSED' && (
              <div className="space-y-1.5 text-[11px] bg-slate-100 p-2.5 rounded-xl">
                <div className="font-bold uppercase text-[10px] text-slate-700">Conferência & Auditoria Cega:</div>
                <div className="flex justify-between">
                  <span>Dinheiro Informado:</span>
                  <span className="font-bold">{formatCurrency(register.reconciliation?.declaredCash ?? register.finalBalanceDeclared ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>PIX Informado:</span>
                  <span>{formatCurrency(register.reconciliation?.declaredPix ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cartões Informados:</span>
                  <span>{formatCurrency((register.reconciliation?.declaredCredit ?? 0) + (register.reconciliation?.declaredDebit ?? 0))}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                  <span>Total Geral Declarado:</span>
                  <span>{formatCurrency(register.finalBalanceDeclared ?? register.reconciliation?.totalDeclaredAll ?? 0)}</span>
                </div>
                <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                  <span>Diferença / Quebra:</span>
                  <span className={
                    (register.cashDifference || 0) === 0 ? 'text-slate-800' :
                    (register.cashDifference || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'
                  }>
                    {formatCurrency(register.cashDifference || 0)}
                  </span>
                </div>
              </div>
            )}

            {/* Operations List if any */}
            {register.operations && register.operations.length > 0 && (
              <div className="space-y-1 text-[10px] pt-1">
                <div className="font-bold uppercase text-slate-700">Movimentações de Gaveta:</div>
                {register.operations.map(op => (
                  <div key={op.id} className="flex justify-between text-slate-600">
                    <span>{op.type}: {op.reason} ({op.operatorName})</span>
                    <span className="font-bold">{formatCurrency(op.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end no-print">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
}
