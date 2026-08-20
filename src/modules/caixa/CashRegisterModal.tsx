import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  DollarSign, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  X,
  FileText,
  Calculator
} from 'lucide-react';
import { 
  CashRegister, 
  CashOperationType, 
  PaymentMethod, 
  UserProfile 
} from '../../types';
import { 
  openCashRegister, 
  addCashOperation, 
  closeCashRegister 
} from '../../services/CashRegisterService';

interface CashRegisterModalProps {
  mode: 'open' | 'sangria' | 'suprimento' | 'close';
  activeRegister: CashRegister | null;
  user: UserProfile;
  onClose: () => void;
  onSuccess: (updatedRegister?: CashRegister | null) => void;
}

export default function CashRegisterModal({
  mode,
  activeRegister,
  user,
  onClose,
  onSuccess
}: CashRegisterModalProps) {
  // Form States
  const [initialBalance, setInitialBalance] = useState<string>('100.00');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Closing Declared Values
  const [declaredCash, setDeclaredCash] = useState<string>('');
  const [declaredCredit, setDeclaredCredit] = useState<string>('');
  const [declaredDebit, setDeclaredDebit] = useState<string>('');
  const [declaredPix, setDeclaredPix] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closedSummary, setClosedSummary] = useState<CashRegister | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      setError('Você está offline. Verifique a conexão antes de realizar esta operação.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (mode === 'open') {
        const val = parseFloat(initialBalance.replace(',', '.'));
        if (isNaN(val) || val < 0) {
          throw new Error('Informe um fundo de troco válido.');
        }
        const newRegister = await openCashRegister(user, val, notes);
        onSuccess(newRegister);
      } else if (mode === 'sangria' || mode === 'suprimento') {
        if (!activeRegister) throw new Error('Caixa não está aberto.');
        const val = parseFloat(amount.replace(',', '.'));
        if (isNaN(val) || val <= 0) {
          throw new Error('Informe um valor maior que zero.');
        }
        if (!reason.trim()) {
          throw new Error('Informe a justificativa da operação.');
        }
        const opType = mode === 'sangria' ? CashOperationType.SANGRIA : CashOperationType.SUPRIMENTO;
        await addCashOperation(activeRegister.id, opType, val, reason, user);
        onSuccess();
      } else if (mode === 'close') {
        if (!activeRegister) throw new Error('Caixa não está aberto.');
        const cashVal = parseFloat(declaredCash.replace(',', '.')) || 0;
        const creditVal = parseFloat(declaredCredit.replace(',', '.')) || 0;
        const debitVal = parseFloat(declaredDebit.replace(',', '.')) || 0;
        const pixVal = parseFloat(declaredPix.replace(',', '.')) || 0;

        const closedReg = await closeCashRegister(
          activeRegister.id,
          user,
          cashVal,
          creditVal,
          debitVal,
          pixVal,
          notes
        );
        setClosedSummary(closedReg);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar operação de caixa.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Calculations for close preview
  const totals = activeRegister?.totalsByPaymentMethod || {
    [PaymentMethod.CASH]: 0,
    [PaymentMethod.PIX]: 0,
    [PaymentMethod.CREDIT_CARD]: 0,
    [PaymentMethod.DEBIT_CARD]: 0
  };

  const sangriasTotal = (activeRegister?.operations || [])
    .filter(o => o.type === CashOperationType.SANGRIA)
    .reduce((a, b) => a + b.amount, 0);

  const suprimentosTotal = (activeRegister?.operations || [])
    .filter(o => o.type === CashOperationType.SUPRIMENTO)
    .reduce((a, b) => a + b.amount, 0);

  const expectedCashInDrawer = (activeRegister?.initialBalance || 0) + (totals[PaymentMethod.CASH] || 0) + suprimentosTotal - sangriasTotal;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div id="printable-receipt" className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative my-8 print:bg-white print:text-black print:border-none print:shadow-none print:w-[80mm] print:p-0 print:m-0">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 no-print text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-xl ${
            mode === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            mode === 'sangria' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
            mode === 'suprimento' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {mode === 'open' && <Unlock className="w-6 h-6" />}
            {mode === 'sangria' && <ArrowDownCircle className="w-6 h-6" />}
            {mode === 'suprimento' && <ArrowUpCircle className="w-6 h-6" />}
            {mode === 'close' && <Lock className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-white">
              {mode === 'open' && 'Abertura de Caixa'}
              {mode === 'sangria' && 'Sangria de Caixa (Retirada)'}
              {mode === 'suprimento' && 'Suprimento de Caixa (Reforço)'}
              {mode === 'close' && (closedSummary ? 'Resumo de Fechamento de Caixa' : 'Fechamento de Caixa')}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Operador: <span className="text-slate-200 font-bold">{user.name}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* If closed summary generated */}
        {closedSummary ? (
          <div className="space-y-4 print:p-0 print:text-black">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Data/Hora Abertura:</span>
                <span className="font-bold text-white">{new Date(closedSummary.openedAt).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Data/Hora Fechamento:</span>
                <span className="font-bold text-white">{new Date(closedSummary.closedAt).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Fundo Inicial Troco:</span>
                <span className="font-bold text-emerald-400">R$ {closedSummary.initialBalance.toFixed(2)}</span>
              </div>

              {/* Conciliação discriminada por meio de pagamento */}
              <div className="border-t border-slate-800 pt-2.5 pb-1 space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                  Conciliação por Meio de Pagamento:
                </h4>
                
                <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-slate-500 border-b border-slate-800 pb-1">
                  <span>Meio</span>
                  <span className="text-right">Esperado</span>
                  <span className="text-right">Declarado</span>
                  <span className="text-right">Diferença</span>
                </div>

                {/* Dinheiro */}
                <div className="grid grid-cols-4 gap-1 text-[11px] font-bold py-0.5">
                  <span className="text-slate-300">Dinheiro Físico</span>
                  <span className="text-right text-slate-400">
                    R$ {(closedSummary.reconciliation?.expectedCash ?? expectedCashInDrawer).toFixed(2)}
                  </span>
                  <span className="text-right text-slate-200">
                    R$ {(closedSummary.reconciliation?.declaredCash ?? (parseFloat(declaredCash) || 0)).toFixed(2)}
                  </span>
                  <span className={`text-right ${
                    (closedSummary.cashDifference || 0) < 0 ? 'text-rose-400' :
                    (closedSummary.cashDifference || 0) > 0 ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    {(closedSummary.cashDifference || 0) === 0 ? 'R$ 0,00' :
                     (closedSummary.cashDifference || 0) > 0 ? `+ R$ ${(closedSummary.cashDifference || 0).toFixed(2)}` :
                     `- R$ ${Math.abs(closedSummary.cashDifference || 0).toFixed(2)}`}
                  </span>
                </div>

                {/* PIX */}
                <div className="grid grid-cols-4 gap-1 text-[11px] font-bold py-0.5">
                  <span className="text-slate-300">PIX</span>
                  <span className="text-right text-slate-400">
                    R$ {(closedSummary.totalsByPaymentMethod?.[PaymentMethod.PIX] || 0).toFixed(2)}
                  </span>
                  <span className="text-right text-slate-200">
                    R$ {(closedSummary.reconciliation?.declaredPix ?? (parseFloat(declaredPix) || 0)).toFixed(2)}
                  </span>
                  <span className={`text-right ${
                    (closedSummary.reconciliation?.diffPix || 0) < 0 ? 'text-rose-400' :
                    (closedSummary.reconciliation?.diffPix || 0) > 0 ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    {(closedSummary.reconciliation?.diffPix || 0) === 0 ? 'R$ 0,00' :
                     (closedSummary.reconciliation?.diffPix || 0) > 0 ? `+ R$ ${(closedSummary.reconciliation?.diffPix || 0).toFixed(2)}` :
                     `- R$ ${Math.abs(closedSummary.reconciliation?.diffPix || 0).toFixed(2)}`}
                  </span>
                </div>

                {/* Crédito */}
                <div className="grid grid-cols-4 gap-1 text-[11px] font-bold py-0.5">
                  <span className="text-slate-300">Crédito</span>
                  <span className="text-right text-slate-400">
                    R$ {(closedSummary.totalsByPaymentMethod?.[PaymentMethod.CREDIT_CARD] || 0).toFixed(2)}
                  </span>
                  <span className="text-right text-slate-200">
                    R$ {(closedSummary.reconciliation?.declaredCredit ?? (parseFloat(declaredCredit) || 0)).toFixed(2)}
                  </span>
                  <span className={`text-right ${
                    (closedSummary.reconciliation?.diffCredit || 0) < 0 ? 'text-rose-400' :
                    (closedSummary.reconciliation?.diffCredit || 0) > 0 ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    {(closedSummary.reconciliation?.diffCredit || 0) === 0 ? 'R$ 0,00' :
                     (closedSummary.reconciliation?.diffCredit || 0) > 0 ? `+ R$ ${(closedSummary.reconciliation?.diffCredit || 0).toFixed(2)}` :
                     `- R$ ${Math.abs(closedSummary.reconciliation?.diffCredit || 0).toFixed(2)}`}
                  </span>
                </div>

                {/* Débito */}
                <div className="grid grid-cols-4 gap-1 text-[11px] font-bold py-0.5">
                  <span className="text-slate-300">Débito</span>
                  <span className="text-right text-slate-400">
                    R$ {(closedSummary.totalsByPaymentMethod?.[PaymentMethod.DEBIT_CARD] || 0).toFixed(2)}
                  </span>
                  <span className="text-right text-slate-200">
                    R$ {(closedSummary.reconciliation?.declaredDebit ?? (parseFloat(declaredDebit) || 0)).toFixed(2)}
                  </span>
                  <span className={`text-right ${
                    (closedSummary.reconciliation?.diffDebit || 0) < 0 ? 'text-rose-400' :
                    (closedSummary.reconciliation?.diffDebit || 0) > 0 ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    {(closedSummary.reconciliation?.diffDebit || 0) === 0 ? 'R$ 0,00' :
                     (closedSummary.reconciliation?.diffDebit || 0) > 0 ? `+ R$ ${(closedSummary.reconciliation?.diffDebit || 0).toFixed(2)}` :
                     `- R$ ${Math.abs(closedSummary.reconciliation?.diffDebit || 0).toFixed(2)}`}
                  </span>
                </div>
              </div>

              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">Total Vendas Turno:</span>
                <span className="font-bold text-white">
                  R$ {Object.values(closedSummary.totalsByPaymentMethod || {}).reduce((a,b)=>a+b, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Total Geral Declarado:</span>
                <span className="font-bold text-white">R$ {(closedSummary.finalBalanceDeclared || 0).toFixed(2)}</span>
              </div>

              {/* Difference / Quebra */}
              <div className={`flex justify-between p-2.5 rounded-lg font-bold ${
                (closedSummary.cashDifference || 0) < 0 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : (closedSummary.cashDifference || 0) > 0 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                <span>Quebra / Diferença Gaveta (Dinheiro):</span>
                <span>
                  {(closedSummary.cashDifference || 0) === 0 && 'R$ 0,00 (Caixa Exato)'}
                  {(closedSummary.cashDifference || 0) < 0 && `- R$ ${Math.abs(closedSummary.cashDifference || 0).toFixed(2)} (Faltante)`}
                  {(closedSummary.cashDifference || 0) > 0 && `+ R$ ${(closedSummary.cashDifference || 0).toFixed(2)} (Sobra)`}
                </span>
              </div>
            </div>

            <div className="flex gap-3 no-print">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 border border-slate-700"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir Relatório</span>
              </button>
              <button
                type="button"
                onClick={() => onSuccess(null)}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Concluir</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* OPEN MODE */}
            {mode === 'open' && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 tracking-wider mb-2">
                  Fundo de Troco Inicial (Gaveta) - R$
                </label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="100.00"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-base text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Valor em espécie presente na gaveta antes de iniciar as vendas.
                </p>
              </div>
            )}

            {/* SANGRIA / SUPRIMENTO MODE */}
            {(mode === 'sangria' || mode === 'suprimento') && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 tracking-wider mb-2">
                    Valor da Operação - R$
                  </label>
                  <div className="relative">
                    <DollarSign className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-base text-white font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 tracking-wider mb-2">
                    Justificativa / Motivo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={mode === 'sangria' ? 'Ex: Sangria periódica para o cofre' : 'Ex: Reforço de moedas para troco'}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </>
            )}

            {/* CLOSE MODE */}
            {mode === 'close' && (
              <div className="space-y-4">
                {/* System calculations summary box */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-400">Saldo Inicial:</span>
                    <span className="text-white font-bold">R$ {(activeRegister?.initialBalance || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-400">Vendas Dinheiro:</span>
                    <span className="text-emerald-400 font-bold">R$ {(totals[PaymentMethod.CASH] || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-400">Sangrias (-):</span>
                    <span className="text-rose-400 font-bold">R$ {sangriasTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-400">Suprimentos (+):</span>
                    <span className="text-blue-400 font-bold">R$ {suprimentosTotal.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between font-black text-sm">
                    <span className="text-slate-300">Espécie Esperada em Gaveta:</span>
                    <span className="text-emerald-400">R$ {expectedCashInDrawer.toFixed(2)}</span>
                  </div>
                </div>

                {/* Operator Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Dinheiro Contado
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={declaredCash}
                      onChange={(e) => setDeclaredCash(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      PIX Total
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={declaredPix}
                      onChange={(e) => setDeclaredPix(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Cartão Crédito
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={declaredCredit}
                      onChange={(e) => setDeclaredCredit(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Cartão Débito
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={declaredDebit}
                      onChange={(e) => setDeclaredDebit(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Observações / Anotações de Fechamento
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Observações do turno ou justificativa de divergência..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-3 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  mode === 'sangria' 
                    ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/20' 
                    : mode === 'close'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {loading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {mode === 'open' && 'Confirmar Abertura'}
                      {mode === 'sangria' && 'Registrar Sangria'}
                      {mode === 'suprimento' && 'Registrar Suprimento'}
                      {mode === 'close' && 'Finalizar & Fechar Caixa'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
