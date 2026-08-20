import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  orderBy, 
  limit 
} from 'firebase/firestore';
import { 
  XCircle, 
  Search, 
  Receipt, 
  Calendar, 
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { Sale, SaleStatus, UserProfile } from '../../types';
import { formatCurrency } from '../../lib/utils';

export default function CancelamentosManager({ user }: { user?: UserProfile }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const companyId = user?.companyId || '';

  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(db, 'sales'), 
      where('companyId', '==', companyId),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Sale))
        .filter(s => s.status === SaleStatus.CANCELLED)
        .sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
      setSales(data);
    }, (err) => {
      console.warn('Erro ao carregar cancelamentos:', err);
    });
    return () => unsubscribe();
  }, [companyId]);

  const filtered = sales.filter(s => 
    s.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.cancellationReason && s.cancellationReason.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <XCircle className="w-6 h-6 text-rose-500" />
              Auditoria de Cancelamentos de Cupons
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Histórico detalhado de vendas e cupons fiscais cancelados com registro de justificativas
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar cancelamentos por cupom, justificativa ou cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Cancelled Sales Cards */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">
              Registros de Cancelamento ({filtered.length})
            </span>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Auditado pelo Sistema
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-bold space-y-2">
                <XCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p>Nenhum registro de venda cancelada encontrado.</p>
              </div>
            ) : (
              filtered.map(sale => (
                <div key={sale.id} className="p-5 hover:bg-slate-50 transition-all space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">Cupom #{sale.id?.slice(-6)}</span>
                          <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                            CANCELADO
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 flex items-center gap-2 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Cancelado em: {sale.cancelledAt ? new Date(sale.cancelledAt).toLocaleString('pt-BR') : new Date(sale.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-slate-900 block">
                        {formatCurrency(sale.total)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {sale.items.length} itens estornados ao estoque
                      </span>
                    </div>
                  </div>

                  {/* Justification Box */}
                  <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100 text-xs font-bold text-slate-700 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block">
                        Justificativa do Cancelamento:
                      </span>
                      <p className="text-slate-800 mt-0.5">{sale.cancellationReason || 'Sem justificativa informada'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
