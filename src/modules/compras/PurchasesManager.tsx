import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  query, 
  where,
  orderBy, 
  limit, 
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { logAuditEvent } from '../../lib/auditLogger';
import { 
  PackageCheck, 
  Plus, 
  Search, 
  Truck, 
  Calendar, 
  DollarSign, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Trash2,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  Purchase, 
  PurchaseItem, 
  Supplier, 
  Product, 
  UserProfile, 
  MovementType, 
  StockMovement, 
  RecordType, 
  RecordStatus, 
  FinancialRecord 
} from '../../types';
import { formatCurrency } from '../../lib/utils';
import { processPurchaseTransaction, PurchasePayload } from '../../services/PurchaseService';
import { useToast } from '../../components/Toast';
import XmlNfeImportModal from './XmlNfeImportModal';
import SupplierContactHubModal from '../cadastros/SupplierContactHubModal';

interface PurchasesManagerProps {
  user: UserProfile;
}

export default function PurchasesManager({ user }: PurchasesManagerProps) {
  const { showSuccess, showError, showWarning } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [contactSupplier, setContactSupplier] = useState<Supplier | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Boleto 30 dias');
  const [notes, setNotes] = useState('');

  // Cart items for purchase entry
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  
  // Item adding temporary fields
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemCost, setItemCost] = useState(0);

  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const companyId = user.companyId || '';

  useEffect(() => {
    if (!companyId) return;

    // Listen to Purchases
    const qPur = query(collection(db, 'purchases'), where('companyId', '==', companyId), limit(100));
    const unsubPur = onSnapshot(qPur, (snap) => {
      const list: Purchase[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Purchase);
      });
      list.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
      setPurchases(list);
      setLoading(false);
    }, (err) => {
      console.warn('Erro ao carregar compras:', err);
      setLoading(false);
    });

    // Listen to Suppliers
    const unsubSup = onSnapshot(query(collection(db, 'suppliers'), where('companyId', '==', companyId)), (snap) => {
      const list: Supplier[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Supplier);
      });
      setSuppliers(list);
    }, () => {});

    // Listen to Products
    const unsubProd = onSnapshot(query(collection(db, 'products'), where('companyId', '==', companyId)), (snap) => {
      const list: Product[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Product);
      });
      setProducts(list);
    }, () => {});

    return () => {
      unsubPur();
      unsubSup();
      unsubProd();
    };
  }, [companyId]);

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setItemCost(prod.costPrice || prod.price * 0.6);
    }
  };

  const addItemToPurchase = () => {
    if (!selectedProductId || itemQty <= 0) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const newItem: PurchaseItem = {
      productId: prod.id,
      productName: prod.name,
      quantity: Number(itemQty),
      unitCost: Number(itemCost),
      totalCost: Number(itemQty) * Number(itemCost)
    };

    setPurchaseItems(prev => [...prev, newItem]);
    setSelectedProductId('');
    setItemQty(1);
    setItemCost(0);
  };

  const removeItem = (index: number) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalPurchaseCost = purchaseItems.reduce((acc, item) => acc + item.totalCost, 0);

  const handleSavePurchase = async () => {
    if (!selectedSupplierId) {
      showWarning('Selecione um fornecedor para a nota de compra.', 'Fornecedor Obrigatório');
      return;
    }
    if (purchaseItems.length === 0) {
      showWarning('Adicione pelo menos um produto à compra.', 'Lista de Itens Vazia');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);

    setSaving(true);
    try {
      const payload: PurchasePayload = {
        supplierId: selectedSupplierId,
        supplierName: supplier?.name || 'Fornecedor Diversos',
        invoiceNumber,
        paymentMethod,
        notes,
        purchaseItems,
        totalPurchaseCost,
        user
      };

      await processPurchaseTransaction(payload);

      // Reset Modal
      setIsModalOpen(false);
      setPurchaseItems([]);
      setInvoiceNumber('');
      setSelectedSupplierId('');
      setNotes('');
      showSuccess(`Compra gravada e estoque atualizado com sucesso!`, 'Entrada Realizada');
    } catch (err: any) {
      console.error("Error saving purchase:", err);
      showError('Erro ao gravar entrada de compra: ' + (err.message || err), 'Erro na Transação');
    } finally {
      setSaving(false);
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-emerald-600" />
            <span>Entrada de Compras & Mercadorias</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Lance notas fiscais de compras para atualizar estoque e gerar Contas a Pagar automaticamente
          </p>
        </div>

        <div className="flex items-center gap-2">
          {suppliers.length > 0 && (
            <button
              onClick={() => setContactSupplier(suppliers[0])}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0"
              title="Criar e enviar cotação / pedido de reposição via WhatsApp ou E-mail"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Solicitar Cotação / WhatsApp</span>
            </button>
          )}

          <button
            onClick={() => setIsXmlModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0"
            title="Importar arquivo XML da NFe emitida pelo fornecedor"
          >
            <FileText className="w-4 h-4" />
            <span>Importar XML NFe</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Entrada Manual</span>
          </button>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, fornecedor ou NF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs font-bold text-slate-500">
          Total Registradas: <span className="text-slate-900 font-black">{purchases.length} NFs</span>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-bold">Carregando compras...</div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-medium">
            Nenhuma compra de fornecedor encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Código / NF</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4">Itens</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Pagamento</th>
                  <th className="py-3 px-4 text-center">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPurchases.map(pur => (
                  <tr key={pur.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-black text-slate-900">
                      <div>{pur.code}</div>
                      <span className="text-[10px] text-slate-400 font-normal">NF: {pur.invoiceNumber || 'S/N'}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{pur.supplierName}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {pur.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600">
                      {formatCurrency(pur.totalCost)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase">
                        {pur.paymentMethod || 'Prazo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                      {pur.createdAt?.toDate ? pur.createdAt.toDate().toLocaleDateString('pt-BR') : 'Hoje'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Purchase Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">Lançar Nova Compra / Entrada NF</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Header Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Fornecedor *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecione o Fornecedor...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Número Nota Fiscal (NF)</label>
                  <input
                    type="text"
                    placeholder="Ex: 10542"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:border-emerald-500"
                  >
                    <option value="Boleto 30 dias">Boleto 30 dias</option>
                    <option value="PIX à vista">PIX à vista</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
              </div>

              {/* Add Item Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-500 block">Adicionar Produto na Entrada</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Produto do Catálogo</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none"
                    >
                      <option value="">Selecione o Produto...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Estoque atual: {p.stock})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Qtd Comprada</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Custo Un (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemCost}
                      onChange={(e) => setItemCost(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addItemToPurchase}
                  className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Incluir Item na Lista</span>
                </button>
              </div>

              {/* Added Items Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-500">Itens na Nota Fiscal</span>
                
                {purchaseItems.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 text-xs">
                    Nenhum item adicionado ainda.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 font-bold text-[10px] uppercase">
                          <th className="py-2 px-3">Produto</th>
                          <th className="py-2 px-3 text-center">Qtd</th>
                          <th className="py-2 px-3 text-right">Custo Un</th>
                          <th className="py-2 px-3 text-right">Total</th>
                          <th className="py-2 px-3 text-center">Remover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {purchaseItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-bold text-slate-800">{item.productName}</td>
                            <td className="py-2 px-3 text-center">{item.quantity}</td>
                            <td className="py-2 px-3 text-right">{formatCurrency(item.unitCost)}</td>
                            <td className="py-2 px-3 text-right font-black text-emerald-600">{formatCurrency(item.totalCost)}</td>
                            <td className="py-2 px-3 text-center">
                              <button 
                                onClick={() => removeItem(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Total & Summary */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Total do Pedido de Compra</p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-0.5">Gerará Conta a Pagar e Aumentará o Estoque</p>
                </div>
                <p className="text-xl font-black text-emerald-400">{formatCurrency(totalPurchaseCost)}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePurchase}
                disabled={saving || purchaseItems.length === 0}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md disabled:opacity-50"
              >
                {saving ? 'Processando Entrada...' : 'Concluir & Atualizar Estoque'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* XML NFe Importer Modal */}
      {isXmlModalOpen && (
        <XmlNfeImportModal
          products={products}
          suppliers={suppliers}
          user={user}
          onClose={() => setIsXmlModalOpen(false)}
          onSuccess={() => setIsXmlModalOpen(false)}
        />
      )}

      {/* Supplier Contact & Quote Hub Modal */}
      {contactSupplier && (
        <SupplierContactHubModal
          supplier={contactSupplier}
          user={user}
          products={products}
          onClose={() => setContactSupplier(null)}
        />
      )}
    </div>
  );
}
