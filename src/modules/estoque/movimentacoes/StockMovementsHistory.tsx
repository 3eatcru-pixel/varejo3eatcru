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
  History, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Filter,
  Package,
  Download
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { StockMovement, MovementType, UserProfile } from '../../../types';

export default function StockMovementsHistory({ user }: { user?: UserProfile }) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | MovementType>('ALL');

  const companyId = user?.companyId || '';

  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(db, 'stock_movements'), 
      where('companyId', '==', companyId),
      limit(200)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as StockMovement))
        .sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
      setMovements(data);
    }, (err) => {
      console.warn('Erro ao carregar histórico de movimentações:', err);
    });
    return () => unsubscribe();
  }, [companyId]);

  const filtered = movements.filter(m => {
    const matchesSearch = 
      m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.operatorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getMovementBadge = (type: MovementType) => {
    switch (type) {
      case MovementType.SALE:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
            <ArrowUpRight className="w-3 h-3" /> Venda
          </span>
        );
      case MovementType.ENTRY:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            <ArrowDownLeft className="w-3 h-3" /> Entrada
          </span>
        );
      case MovementType.RETURN:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            <RefreshCw className="w-3 h-3" /> Devolução
          </span>
        );
      case MovementType.ADJUSTMENT:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            <RefreshCw className="w-3 h-3" /> Ajuste Manual
          </span>
        );
      case MovementType.LOSS:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
            <ArrowUpRight className="w-3 h-3" /> Perda/Avaria
          </span>
        );
      default:
        return null;
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      return;
    }

    const headers = ['Data / Hora', 'Produto', 'Tipo de Movimento', 'Qtd Alterada', 'Estoque Resultante', 'Motivo / Documento', 'Operador Responsavel'];
    const rows = filtered.map(m => [
      m.createdAt ? new Date(m.createdAt).toLocaleString('pt-BR') : '',
      m.productName,
      m.type,
      m.quantityDelta > 0 ? `+${m.quantityDelta}` : String(m.quantityDelta),
      String(m.newStock),
      m.reason || '',
      m.operatorName || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Auditoria_Estoque_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <History className="w-6 h-6 text-purple-600" />
            <span>Auditoria de Movimentações de Estoque</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Rastreabilidade e histórico de todas as vendas, devoluções, perdas e entradas manuais
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4 text-purple-300" />
          <span>Exportar Histórico CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do produto, motivo ou operador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none"
          >
            <option value="ALL">Todas as Movimentações</option>
            <option value={MovementType.SALE}>Vendas</option>
            <option value={MovementType.ENTRY}>Entradas / Compras</option>
            <option value={MovementType.RETURN}>Devoluções</option>
            <option value={MovementType.ADJUSTMENT}>Ajustes Manuais</option>
            <option value={MovementType.LOSS}>Perdas / Avarias</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
              <th className="py-3 px-3">Data / Hora</th>
              <th className="py-3 px-3">Produto</th>
              <th className="py-3 px-3">Tipo</th>
              <th className="py-3 px-3">Qtd Alterada</th>
              <th className="py-3 px-3">Estoque Resultante</th>
              <th className="py-3 px-3">Motivo / Descrição</th>
              <th className="py-3 px-3">Operador</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  Nenhuma movimentação registrada.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-3 text-slate-500">
                    {m.createdAt ? new Date(m.createdAt).toLocaleString('pt-BR') : '-'}
                  </td>
                  <td className="py-3.5 px-3 font-black text-slate-900">{m.productName}</td>
                  <td className="py-3.5 px-3">{getMovementBadge(m.type)}</td>
                  <td className="py-3.5 px-3 font-black">
                    <span className={m.quantityDelta > 0 ? "text-emerald-600" : "text-rose-600"}>
                      {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-slate-800">{m.newStock} un</td>
                  <td className="py-3.5 px-3 text-slate-600">{m.reason}</td>
                  <td className="py-3.5 px-3 font-bold">{m.operatorName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
