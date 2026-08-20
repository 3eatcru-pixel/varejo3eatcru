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
  Receipt, 
  Search, 
  XCircle, 
  CheckCircle2, 
  Printer, 
  AlertTriangle, 
  X,
  Eye,
  Filter,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  Sale, 
  SaleStatus, 
  UserProfile, 
  MovementType, 
  Product,
  CashRegister,
  StoreSettings
} from '../../types';
import { formatCurrency } from '../../lib/utils';
import { cancelSaleTransaction } from '../../services/SaleService';
import { logAuditEvent } from '../../lib/auditLogger';
import { useToast } from '../../components/Toast';

interface SalesManagerProps {
  user: UserProfile;
}

export default function SalesManager({ user }: SalesManagerProps) {
  const { showSuccess, showError, showWarning } = useToast();
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SaleStatus>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Cancellation State
  const [cancellingSale, setCancellingSale] = useState<Sale | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!user.companyId) return;
    const unsub = onSnapshot(doc(db, 'settings', `store_${user.companyId}`), (docSnap) => {
      if (docSnap.exists()) {
        setStoreSettings(docSnap.data() as StoreSettings);
      }
    }, (err) => {
      console.warn('Erro ao carregar configurações da loja:', err);
    });
    return () => unsub();
  }, [user.companyId]);

  useEffect(() => {
    const companyId = user.companyId || '';
    const q = query(
      collection(db, 'sales'),
      where('companyId', '==', companyId),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Sale))
        .sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
      setSales(data);
    }, (err) => {
      console.warn('Erro ao carregar vendas:', err);
    });
    return () => unsubscribe();
  }, [user.companyId]);

  // Atomic Cancellation with Stock Return & Split Payment Balance Reversal
  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSale || !cancellingSale.id) return;
    if (!cancellationReason.trim()) {
      setCancelError('Por favor, informe a justificativa do cancelamento.');
      return;
    }

    setSubmittingCancel(true);
    setCancelError(null);

    try {
      await cancelSaleTransaction(cancellingSale, cancellationReason, user);

      const saleCode = cancellingSale.code;
      setCancellingSale(null);
      setCancellationReason('');
      showSuccess(`Venda #${saleCode} cancelada com sucesso. Estoque e caixa estornados!`, 'Cancelamento Concluído');
    } catch (err: any) {
      console.error("Erro ao cancelar venda:", err);
      setCancelError(err.message || "Erro ao cancelar venda no Firestore.");
      showError(err.message || "Erro ao cancelar venda no Firestore.", "Falha no Cancelamento");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const filteredSales = sales.filter(s => {
    const matchesSearch = 
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cashierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.customerCpf && s.customerCpf.includes(searchTerm));

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 bg-slate-100 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>Gestão de Vendas & Devoluções</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Histórico completo de cupons, cancelamentos com estorno de estoque e reimpressão
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código (VD-XXXX), operador, cliente ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value={SaleStatus.COMPLETED}>Concluídas</option>
            <option value={SaleStatus.CANCELLED}>Canceladas</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
              <th className="py-3 px-3">Código</th>
              <th className="py-3 px-3">Data / Hora</th>
              <th className="py-3 px-3">Operador</th>
              <th className="py-3 px-3">Cliente</th>
              <th className="py-3 px-3">Pagamento</th>
              <th className="py-3 px-3">Total</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                  Nenhuma venda encontrada para os filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredSales.map((s) => (
                <tr key={s.id || s.code} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-3 font-black text-slate-900">{s.code}</td>
                  <td className="py-3.5 px-3 text-slate-500">
                    {s.createdAt ? new Date(s.createdAt).toLocaleString('pt-BR') : '-'}
                  </td>
                  <td className="py-3.5 px-3 font-bold">{s.cashierName}</td>
                  <td className="py-3.5 px-3">
                    {s.customerName ? (
                      <div>
                        <p className="font-bold text-slate-800">{s.customerName}</p>
                        {s.customerCpf && <p className="text-[10px] text-slate-400">{s.customerCpf}</p>}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Avulso</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-bold uppercase text-slate-600">{s.paymentMethod}</td>
                  <td className="py-3.5 px-3 font-black text-emerald-600">{formatCurrency(s.total)}</td>
                  <td className="py-3.5 px-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      s.status === SaleStatus.CANCELLED
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {s.status === SaleStatus.CANCELLED ? (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Cancelada</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Concluída</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedSale(s)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                        title="Ver Cupom / Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {s.status !== SaleStatus.CANCELLED && (
                        <button
                          onClick={() => { setCancellingSale(s); setCancellationReason(''); setCancelError(null); }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black uppercase transition-colors"
                          title="Cancelar Venda e Estornar Estoque"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div id="printable-receipt" className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-slate-200 font-mono text-xs text-slate-800 space-y-4 print:shadow-none print:border-none print:p-0 print:m-0">
            <button
              onClick={() => setSelectedSale(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-3 border-b border-dashed border-slate-200">
              <h3 className="font-black text-sm uppercase text-slate-900">{storeSettings?.storeName || 'VAREJOPRO POS'}</h3>
              <p className="text-[10px] text-slate-500">{storeSettings?.cnpj ? `CNPJ: ${storeSettings.cnpj}` : 'Comprovante de Venda'}</p>
              {storeSettings?.address && <p className="text-[10px] text-slate-500">{storeSettings.address}</p>}
              {!storeSettings?.cnpj && <p className="text-[10px] text-slate-500 mt-1">Comprovante de Venda</p>}
              <p className="text-xs font-black text-emerald-600 mt-1">CÓD: {selectedSale.code}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {selectedSale.createdAt ? new Date(selectedSale.createdAt).toLocaleString('pt-BR') : ''}
              </p>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs text-slate-800">
              {selectedSale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-medium">{item.quantity}x {item.productName}</span>
                  <span className="font-bold">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-rose-500 font-bold">
                  <span>Desconto:</span>
                  <span>- {formatCurrency(selectedSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span className="text-emerald-600">{formatCurrency(selectedSale.total)}</span>
              </div>

              {selectedSale.splitPayments && selectedSale.splitPayments.length > 0 ? (
                <div className="pt-2 border-t border-dashed border-slate-200 text-[10px] space-y-1">
                  <span className="font-bold text-slate-500 uppercase block">Pagamento Dividido:</span>
                  {selectedSale.splitPayments.map((sp, idx) => (
                    <div key={idx} className="flex justify-between text-slate-600">
                      <span>• {sp.method}:</span>
                      <span className="font-mono font-bold">{formatCurrency(sp.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Forma de Pagto:</span>
                  <span className="font-bold">{selectedSale.paymentMethod}</span>
                </div>
              )}

              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Operador:</span>
                <span className="font-bold">{selectedSale.cashierName}</span>
              </div>
              {selectedSale.customerName && (
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Cliente:</span>
                  <span className="font-bold">{selectedSale.customerName}</span>
                </div>
              )}

              {selectedSale.status === SaleStatus.CANCELLED && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  <p className="font-black uppercase text-[10px]">Venda Cancelada</p>
                  <p className="mt-0.5">Motivo: {selectedSale.cancellationReason}</p>
                  <p className="text-[10px] text-rose-500 mt-1">Por: {selectedSale.cancelledByName}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 no-print">
              <button
                type="button"
                onClick={() => {
                  let msg = `🧾 *CUPOM NÃO FISCAL - ${storeSettings?.storeName || user.name || 'VAREJOPRO'}*\n`;
                  msg += `📋 *Venda:* ${selectedSale.code}\n`;
                  msg += `📅 *Data:* ${selectedSale.createdAt ? new Date(selectedSale.createdAt).toLocaleString('pt-BR') : '-'}\n`;
                  msg += `👤 *Operador:* ${selectedSale.cashierName}\n`;
                  if (selectedSale.customerName) msg += `🤝 *Cliente:* ${selectedSale.customerName}\n`;
                  msg += `--------------------------------\n`;
                  msg += `*ITENS DO PEDIDO:*\n`;
                  selectedSale.items.forEach((item, idx) => {
                    msg += `${idx + 1}. ${item.productName}\n   ${item.quantity}x ${formatCurrency(item.price)} = *${formatCurrency(item.total)}*\n`;
                  });
                  msg += `--------------------------------\n`;
                  if (selectedSale.discount > 0) msg += `🔻 Desconto: ${formatCurrency(selectedSale.discount)}\n`;
                  msg += `💰 *TOTAL PAGO: ${formatCurrency(selectedSale.total)}*\n`;
                  msg += `💳 *Forma de Pgto:* ${selectedSale.paymentMethod}\n\n`;
                  msg += `Agradecemos a sua preferência! Volte sempre! ✨🛍️`;

                  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar Cupom Digital no WhatsApp</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                     document.body.classList.remove('print-58mm');
                     window.print();
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] uppercase rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Imprimir (80mm)
                </button>
                <button
                  onClick={() => {
                     document.body.classList.add('print-58mm');
                     window.print();
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] uppercase rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Imprimir (58mm)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellingSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setCancellingSale(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider">Cancelar Venda {cancellingSale.code}</h3>
                <p className="text-xs text-slate-400">O valor total de {formatCurrency(cancellingSale.total)} será estornado e o estoque dos itens será re-adicionado.</p>
              </div>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleConfirmCancellation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 tracking-wider mb-2">
                  Justificativa do Cancelamento
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Erro na escolha dos itens pelo cliente / Desistência"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCancellingSale(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                >
                  {submittingCancel ? (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                  ) : (
                    <span>Confirmar Cancelamento</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
