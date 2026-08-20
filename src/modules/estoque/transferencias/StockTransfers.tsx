import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc,
  runTransaction,
  where
} from 'firebase/firestore';
import { 
  ArrowLeftRight, 
  Search, 
  Package, 
  CheckCircle2, 
  Building2
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { Product, UserProfile } from '../../../types';
import { transferStock } from '../../../services/StockService';

export default function StockTransfers({ user }: { user?: UserProfile }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Transfer Form State
  const [fromLocation, setFromLocation] = useState('Depósito Central');
  const [toLocation, setToLocation] = useState('Loja Principal - Vitrine');
  const [transferQty, setTransferQty] = useState('1');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const companyId = user?.companyId || '';

  useEffect(() => {
    const q = query(
      collection(db, 'products'),
      where('companyId', '==', companyId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Product))
        .sort((a, b) => a.name.localeCompare(b.name));
      setProducts(data);
    }, (err) => {
      console.warn('Erro ao carregar produtos em transferências:', err);
    });
    return () => unsubscribe();
  }, [companyId]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = parseInt(transferQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    if (fromLocation === toLocation) {
      setErrorMsg('O local de origem e destino devem ser diferentes.');
      return;
    }

    if (!user) {
      setErrorMsg('Sessão de usuário inválida.');
      return;
    }

    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await transferStock(
        selectedProduct,
        fromLocation,
        toLocation,
        qty,
        notes,
        user
      );

      setSuccessMsg(`Transferência de ${qty}x "${selectedProduct.name}" realizada com sucesso de [${fromLocation}] para [${toLocation}].`);
      setSelectedProduct(null);
      setTransferQty('1');
      setNotes('');
    } catch (err: any) {
      console.error("Transfer error:", err);
      setErrorMsg(err.message || "Erro ao realizar transferência de estoque.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <ArrowLeftRight className="w-6 h-6 text-teal-500" />
              Transferências Atômicas entre Locais & Estoques
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Movimentar mercadorias com consistência transacional no Firestore
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
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Pesquisar produto para transferência..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Produtos Selecionáveis ({filtered.length})
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {filtered.map(prod => {
                  const isSelected = selectedProduct?.id === prod.id;
                  return (
                    <div 
                      key={prod.id} 
                      onClick={() => setSelectedProduct(prod)}
                      className={`p-4 cursor-pointer hover:bg-slate-50 transition-all flex items-center justify-between ${isSelected ? 'bg-teal-50/60 border-l-4 border-teal-500' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">{prod.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">SKU: {prod.sku || 'N/A'} | Local: {prod.location || 'Depósito Central'}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block">
                          {prod.stock} un. disponíveis
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-teal-500" />
              Lançamento de Transferência
            </h3>

            {selectedProduct ? (
              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Item Selecionado</span>
                  <p className="text-xs font-black text-slate-900 mt-0.5">{selectedProduct.name}</p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Origem
                  </label>
                  <select 
                    value={fromLocation}
                    onChange={e => setFromLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none"
                  >
                    <option value="Depósito Central">Depósito Central</option>
                    <option value="Loja Principal - Reserva">Loja Principal - Reserva</option>
                    <option value="Filial 02">Filial 02</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Destino
                  </label>
                  <select 
                    value={toLocation}
                    onChange={e => setToLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none"
                  >
                    <option value="Loja Principal - Vitrine">Loja Principal - Vitrine</option>
                    <option value="Depósito Central">Depósito Central</option>
                    <option value="Filial 02">Filial 02</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Quantidade a Transferir
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    max={selectedProduct.stock}
                    value={transferQty}
                    onChange={e => setTransferQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Observações / Lote
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ex: Guia de transporte interna #104"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  {submitting ? 'Registrando...' : 'Confirmar Transferência'}
                </button>
              </form>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-bold space-y-2">
                <Package className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Selecione um produto da lista ao lado para realizar a transferência.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
