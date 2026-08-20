import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  runTransaction,
  limit,
  where 
} from 'firebase/firestore';
import { 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  User, 
  Receipt,
  ArrowLeftRight
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { Sale, SaleStatus, MovementType, UserProfile, Client } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { logAuditEvent } from '../../lib/auditLogger';
import { getLoyaltyTier } from '../../services/ClientService';
import { processRefundTransaction } from '../../services/SaleService';

export default function DevolucoesManager({ user }: { user?: UserProfile }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  // Partial returns state
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState('Defeito no Produto');
  const [refundMethod, setRefundMethod] = useState<'CREDIT' | 'CASH' | 'PIX'>('CREDIT');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const companyId = user?.companyId || '';

  useEffect(() => {
    const q = query(
      collection(db, 'sales'),
      where('companyId', '==', companyId),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Sale))
        .sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
      setSales(data.filter(s => s.status === SaleStatus.COMPLETED));
    }, (err) => {
      console.warn('Erro ao carregar vendas para devolução:', err);
    });
    return () => unsubscribe();
  }, [companyId]);

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    // Initialize return quantities to 0 for each item
    const initialQty: Record<string, number> = {};
    sale.items.forEach(item => {
      initialQty[item.productId] = item.quantity; // Default to full item quantity for easy return
    });
    setReturnQuantities(initialQty);
  };

  const calculateTotalRefundAmount = (): number => {
    if (!selectedSale) return 0;
    return selectedSale.items.reduce((sum, item) => {
      const returnQty = returnQuantities[item.productId] || 0;
      return sum + (item.price * returnQty);
    }, 0);
  };

  const handleProcessReturn = async () => {
    if (!selectedSale || !selectedSale.id) return;
    
    const refundAmount = calculateTotalRefundAmount();
    if (refundAmount <= 0) {
      setErrorMsg('Selecione ao menos um item com quantidade maior que zero para devolução.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const idempotencyKey = `refund_${selectedSale.id}_${Date.now()}`;
      
      await processRefundTransaction(
        selectedSale.id,
        returnQuantities,
        returnReason,
        refundMethod,
        user!,
        idempotencyKey
      );

      await logAuditEvent({
        userId: user?.uid,
        userName: user?.name,
        action: 'DEVOLUCAO_DE_VENDA',
        module: 'VENDAS',
        companyId,
        details: `Devolução/Estorno processado para Cupom #${selectedSale.id.slice(-6)}. Valor Estornado: ${formatCurrency(refundAmount)}. Método: ${refundMethod}.`
      });

      setSuccessMsg(`Devolução do Cupom #${selectedSale.id.slice(-6)} concluída com sucesso! Valor estornado: ${formatCurrency(refundAmount)}.`);
      setSelectedSale(null);
    } catch (err: any) {
      console.error("Return process error:", err);
      setErrorMsg(err.message || 'Erro ao processar devolução.');
    } finally {
      setSubmitting(false);
    }
  };
// ... (rest of file)

  const filteredSales = sales.filter(s => 
    s.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.customerCpf && s.customerCpf.includes(searchTerm))
  );

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-amber-500" />
              Gestão de Devoluções & Trocas Idempotentes
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Processar devolução de mercadorias, estorno financeiro e reposição atômica de estoque
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar por código de cupom, cliente ou CPF..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Vendas Concluídas Elegíveis ({filteredSales.length})
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {filteredSales.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-bold">
                    Nenhuma venda concluída encontrada para devolução.
                  </div>
                ) : (
                  filteredSales.map(sale => {
                    const isSelected = selectedSale?.id === sale.id;
                    return (
                      <div 
                        key={sale.id}
                        onClick={() => handleSelectSale(sale)}
                        className={`p-4 cursor-pointer transition-all flex items-center justify-between hover:bg-slate-50 ${isSelected ? 'bg-amber-50/60 border-l-4 border-amber-500' : ''}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-black text-slate-800">Cupom #{sale.id?.slice(-6)}</span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(sale.createdAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-bold flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {sale.customerName || 'Cliente Balcão'}
                            </span>
                            <span className="text-slate-400">|</span>
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3 text-slate-400" />
                              {sale.items.length} itens
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900 block">
                            {formatCurrency(sale.total)}
                          </span>
                          <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-1">
                            Selecionar
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Return Execution Panel */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ArrowLeftRight className="w-4 h-4 text-amber-500" />
              Painel do Processamento
            </h3>

            {selectedSale ? (
              <div className="space-y-5">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>Cupom:</span>
                    <span className="font-black text-slate-900">#{selectedSale.id?.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>Cliente:</span>
                    <span className="font-black text-slate-900">{selectedSale.customerName || 'Balcão'}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>Total da Venda:</span>
                    <span className="font-black text-slate-900">{formatCurrency(selectedSale.total)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 pt-1 border-t border-slate-200">
                    <span>Valor a Estornar:</span>
                    <span className="font-black text-emerald-600 text-sm">{formatCurrency(calculateTotalRefundAmount())}</span>
                  </div>
                </div>

                {/* Items selection for return */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Selecione a quantidade a devolver:
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedSale.items.map((item, idx) => {
                      const currentQty = returnQuantities[item.productId] ?? item.quantity;
                      return (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl text-xs font-bold space-y-2 border border-slate-200">
                          <div className="flex justify-between text-slate-800 font-black">
                            <span>{item.productName}</span>
                            <span>{formatCurrency(item.price * currentQty)}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500 text-[11px]">
                            <span>Comprado: {item.quantity} un.</span>
                            <div className="flex items-center gap-2">
                              <span>Devolver:</span>
                              <input 
                                type="number"
                                min="0"
                                max={item.quantity}
                                value={currentQty}
                                onChange={e => {
                                  const val = Math.max(0, Math.min(item.quantity, parseInt(e.target.value, 10) || 0));
                                  setReturnQuantities(prev => ({ ...prev, [item.productId]: val }));
                                }}
                                className="w-16 bg-white border border-slate-300 rounded-lg p-1 text-center font-black text-slate-900 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Motivo da Devolução / Troca
                  </label>
                  <select 
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Defeito no Produto">Defeito no Produto</option>
                    <option value="Tamanho Incorreto">Tamanho Incorreto</option>
                    <option value="Arrependimento do Cliente">Arrependimento do Cliente</option>
                    <option value="Produto Danificado">Produto Danificado</option>
                    <option value="Outro Motivo">Outro Motivo</option>
                  </select>
                </div>

                {/* Refund Method */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Forma de Estorno / Reembolso
                  </label>
                  <select 
                    value={refundMethod}
                    onChange={e => setRefundMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="CREDIT">Crédito na Loja (Vale-Troca)</option>
                    <option value="CASH">Devolução em Dinheiro (Caixa)</option>
                    <option value="PIX">Estorno via PIX / Transferência</option>
                  </select>
                </div>

                <button
                  onClick={handleProcessReturn}
                  disabled={submitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {submitting ? 'Processando Devolução...' : 'Confirmar Devolução e Repor Estoque'}
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-bold space-y-2">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Selecione uma venda da lista ao lado para iniciar a devolução.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
