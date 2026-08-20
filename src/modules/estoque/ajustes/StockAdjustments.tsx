import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  where,
  runTransaction 
} from 'firebase/firestore';
import { 
  SlidersHorizontal, 
  Search, 
  Plus, 
  Minus, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  FileText,
  ShieldAlert
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { Product, MovementType, UserProfile } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { hasPermission } from '../../../lib/permissions';
import { adjustStock } from '../../../services/StockService';

export default function StockAdjustments({ user }: { user?: UserProfile }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Adjustment Form State
  const [adjustmentType, setAdjustmentType] = useState<'SET' | 'ADD' | 'REMOVE'>('SET');
  const [targetQuantity, setTargetQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('Inventário Físico / Balanço');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const companyId = user?.companyId || '';
  const canAdjust = hasPermission(user, 'manageStock');

  useEffect(() => {
    const q = query(
      collection(db, 'products'),
      where('companyId', '==', companyId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Product))
        .sort((a, b) => a.name.localeCompare(b.name));
      setProducts(data);
    }, (err) => {
      console.warn('Erro ao carregar produtos em ajustes:', err);
    });
    return () => unsubscribe();
  }, [companyId]);

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setTargetQuantity(prod.stock.toString());
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdjust) {
      setErrorMsg('Você não possui permissão para realizar ajustes manuais de estoque.');
      return;
    }
    if (!selectedProduct || !selectedProduct.id) return;
    const qtyVal = parseInt(targetQuantity, 10);
    if (isNaN(qtyVal) || qtyVal < 0) {
      setErrorMsg('Informe uma quantidade válida igual ou maior que zero.');
      return;
    }

    if (!user) {
      setErrorMsg('Sessão de usuário inválida.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const resultingStock = await adjustStock(
        selectedProduct,
        adjustmentType,
        qtyVal,
        reason,
        user
      );

      setSuccessMsg(`Ajuste de estoque concluído com sucesso! Novo saldo de "${selectedProduct.name}": ${resultingStock} un.`);
      setSelectedProduct(null);
    } catch (err: any) {
      console.error("Stock adjustment error:", err);
      setErrorMsg(err.message || 'Erro ao salvar ajuste de estoque.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-6 h-6 text-indigo-500" />
              Ajustes & Acerto de Estoque
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Realizar acerto manual de contagem física, balanço, registro de perdas e avarias
            </p>
          </div>

          {!canAdjust && (
            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Modo somente leitura (permissão restrita ao perfil)</span>
            </div>
          )}
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
          {/* Product Picker */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-500" />
              1. Selecionar Produto para Ajuste
            </h3>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, código de barras ou SKU..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-2xl">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-bold">
                  Nenhum produto cadastrado ou encontrado.
                </div>
              ) : (
                filtered.map(prod => (
                  <button
                    key={prod.id}
                    onClick={() => handleSelectProduct(prod)}
                    className={`w-full p-3.5 text-left transition-all flex items-center justify-between ${
                      selectedProduct?.id === prod.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-black text-slate-900">{prod.name}</p>
                      <span className="text-[10px] text-slate-400 font-bold">
                        SKU: {prod.sku || '-'} • Barra: {prod.barcode || '-'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black block ${prod.stock <= (prod.minStock || 3) ? 'text-amber-600' : 'text-slate-900'}`}>
                        {prod.stock} un.
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">{formatCurrency(prod.price)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Adjustment Form Panel */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              2. Parâmetros de Acerto
            </h3>

            {selectedProduct ? (
              <form onSubmit={handleApplyAdjustment} className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Item Selecionado</span>
                  <p className="text-xs font-black text-slate-900 truncate">{selectedProduct.name}</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-1">
                    Estoque Atual: <strong className="text-slate-900">{selectedProduct.stock} un.</strong>
                  </p>
                </div>

                {/* Operation Mode */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Tipo de Ação</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('SET')}
                      className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                        adjustmentType === 'SET' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Fixar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('ADD')}
                      className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                        adjustmentType === 'ADD' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      + Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('REMOVE')}
                      className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                        adjustmentType === 'REMOVE' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      - Reduzir
                    </button>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    {adjustmentType === 'SET' ? 'Novo Saldo Total' : 'Quantidade para Ajustar'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={targetQuantity}
                    onChange={e => setTargetQuantity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Motivo do Ajuste</label>
                  <select
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none text-slate-700"
                  >
                    <option value="Inventário Físico / Balanço">Inventário Físico / Balanço</option>
                    <option value="Avaria / Produto Danificado">Avaria / Produto Danificado</option>
                    <option value="Validade Vencida">Validade Vencida</option>
                    <option value="Erro de Lançamento / Digitação">Erro de Lançamento / Digitação</option>
                    <option value="Outro Motivo Operacional">Outro Motivo Operacional</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !canAdjust}
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md ${
                    canAdjust 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {submitting ? 'Gravando Ajuste...' : 'Confirmar Ajuste de Estoque'}
                </button>
              </form>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-bold space-y-2">
                <SlidersHorizontal className="w-8 h-8 mx-auto text-slate-300" />
                <p>Selecione um produto na lista ao lado para ajustar a quantidade em estoque.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
