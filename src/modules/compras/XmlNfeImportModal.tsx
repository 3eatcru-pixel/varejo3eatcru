import React, { useState, useRef } from 'react';
import { 
  FileCode, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  Package, 
  ArrowRight, 
  DollarSign, 
  Plus, 
  Layers, 
  FileText,
  Copy,
  Check,
  Building2
} from 'lucide-react';
import { 
  parseNfeXml, 
  ParsedNfeData, 
  ParsedNfeProduct 
} from '../../services/NfeXmlParser';
import { Product, Supplier, UserProfile, PurchaseItem } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useToast } from '../../components/Toast';
import { createProduct } from '../../services/ProductService';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { processPurchaseTransaction, PurchasePayload } from '../../services/PurchaseService';

interface XmlNfeImportModalProps {
  products: Product[];
  suppliers: Supplier[];
  user: UserProfile;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemMapping {
  itemIndex: number;
  action: 'match' | 'create';
  matchedProductId: string;
  newProductName: string;
  newProductCategory: string;
  salePrice: number;
}

export default function XmlNfeImportModal({
  products,
  suppliers,
  user,
  onClose,
  onSuccess
}: XmlNfeImportModalProps) {
  const { showSuccess, showError, showWarning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nfeData, setNfeData] = useState<ParsedNfeData | null>(null);
  const [mappings, setMappings] = useState<Record<number, ItemMapping>>({});
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [autoCreateSupplier, setAutoCreateSupplier] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const companyId = user.companyId || '';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xml')) {
      showError('O arquivo selecionado deve ser um XML (.xml) válido de Nota Fiscal Eletrônica.', 'Arquivo Inválido');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseNfeXml(text);
        setNfeData(parsed);

        // 1. Try to find matching supplier by CNPJ or Name
        const cleanCnpj = parsed.supplier.cnpj.replace(/\D/g, '');
        const matchedSup = suppliers.find(s => {
          const sCnpj = (s.cnpj || '').replace(/\D/g, '');
          return (cleanCnpj && sCnpj && sCnpj === cleanCnpj) || 
                 (s.name.toLowerCase() === parsed.supplier.xNome.toLowerCase());
        });

        if (matchedSup) {
          setSelectedSupplierId(matchedSup.id);
          setAutoCreateSupplier(false);
        } else {
          setSelectedSupplierId('');
          setAutoCreateSupplier(true);
        }

        // 2. Build default mappings for items
        const initialMappings: Record<number, ItemMapping> = {};
        parsed.items.forEach(item => {
          // Find matching product by barcode (EAN) or name
          let matched: Product | undefined;
          if (item.cEAN) {
            matched = products.find(p => p.barcode === item.cEAN || p.sku === item.cEAN);
          }
          if (!matched) {
            matched = products.find(p => p.name.toLowerCase() === item.xProd.toLowerCase());
          }

          if (matched) {
            initialMappings[item.itemIndex] = {
              itemIndex: item.itemIndex,
              action: 'match',
              matchedProductId: matched.id,
              newProductName: item.xProd,
              newProductCategory: matched.category || 'Geral',
              salePrice: matched.price
            };
          } else {
            // New product suggestion
            initialMappings[item.itemIndex] = {
              itemIndex: item.itemIndex,
              action: 'create',
              matchedProductId: '',
              newProductName: item.xProd,
              newProductCategory: 'Geral',
              salePrice: parseFloat((item.vUnCom * 1.5).toFixed(2))
            };
          }
        });

        setMappings(initialMappings);
        showSuccess(`NFe Nº ${parsed.nNF} (${parsed.items.length} itens) importada para conferência!`, 'XML Lido com Sucesso');
      } catch (err: any) {
        showError('Erro ao interpretar XML: ' + err.message, 'Falha no XML');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const copyAccessKey = () => {
    if (nfeData?.accessKey) {
      navigator.clipboard.writeText(nfeData.accessKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleConfirmImport = async () => {
    if (!nfeData) return;

    setLoading(true);
    try {
      // 1. Resolve Supplier
      let finalSupplierId = selectedSupplierId;
      let finalSupplierName = '';

      if (autoCreateSupplier || !finalSupplierId) {
        const supPayload = {
          name: nfeData.supplier.xNome,
          tradingName: nfeData.supplier.xFant || nfeData.supplier.xNome,
          cnpj: nfeData.supplier.cnpj,
          phone: nfeData.supplier.phone || '',
          city: nfeData.supplier.city || '',
          state: nfeData.supplier.state || '',
          address: nfeData.supplier.address || '',
          companyId,
          createdAt: new Date().toISOString()
        };
        const supRef = await addDoc(collection(db, 'suppliers'), supPayload);
        finalSupplierId = supRef.id;
        finalSupplierName = supPayload.name;
      } else {
        const existing = suppliers.find(s => s.id === finalSupplierId);
        finalSupplierName = existing?.name || nfeData.supplier.xNome;
      }

      // 2. Process Items (Create new products if needed)
      const purchaseItems: PurchaseItem[] = [];

      for (const item of nfeData.items) {
        const mapping = mappings[item.itemIndex];
        let prodId = mapping.matchedProductId;
        let prodName = mapping.newProductName || item.xProd;

        if (mapping.action === 'create' || !prodId) {
          // Create product in catalog
          const newProdId = await createProduct({
            name: prodName,
            price: Number(mapping.salePrice) || Number((item.vUnCom * 1.5).toFixed(2)),
            costPrice: Number(item.vUnCom),
            stock: 0, // Transaction will increment
            category: mapping.newProductCategory || 'Geral',
            barcode: item.cEAN || undefined,
            sku: item.cProd || undefined,
            supplierId: finalSupplierId,
            supplierName: finalSupplierName,
            companyId
          }, user);

          prodId = newProdId;
        }

        purchaseItems.push({
          productId: prodId,
          productName: prodName,
          quantity: item.qCom,
          unitCost: item.vUnCom,
          totalCost: item.vProd
        });
      }

      // 3. Process Purchase Transaction
      const payload: PurchasePayload = {
        supplierId: finalSupplierId,
        supplierName: finalSupplierName,
        invoiceNumber: nfeData.nNF,
        paymentMethod: nfeData.duplicates.length > 0 
          ? `Boleto Faturado (${nfeData.duplicates.length}x)` 
          : 'Boleto 30 dias',
        notes: `Importação automática via XML NFe (Chave: ${nfeData.accessKey || 'N/A'})`,
        purchaseItems,
        totalPurchaseCost: nfeData.totalNfeValue || purchaseItems.reduce((acc, i) => acc + i.totalCost, 0),
        user
      };

      await processPurchaseTransaction(payload);

      showSuccess(`Entrada da NFe Nº ${nfeData.nNF} finalizada! ${purchaseItems.length} produtos atualizados no estoque.`, 'Entrada Concluída');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao processar importação da NFe:', err);
      showError('Erro ao gravar entrada de NFe: ' + (err.message || err), 'Falha na Gravação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-white">
                Importação de XML de Nota Fiscal (NFe / DANFE)
              </h2>
              <p className="text-xs text-slate-400">
                Carregue o arquivo XML emitido pelo fornecedor para dar entrada automática em lote no estoque e financeiro.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!nfeData ? (
            /* Upload Drop Area */
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                dragOver 
                  ? 'border-emerald-500 bg-emerald-500/10' 
                  : 'border-slate-800 hover:border-emerald-500/50 bg-slate-950/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black uppercase tracking-wider text-white mb-1">
                Arraste o arquivo XML da NFe ou clique para selecionar
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                Compatível com padrão SEFAZ Brasil (layout procNFe v4.00). O sistema reconhece fornecedor, itens, quantidades, valores e códigos de barras.
              </p>
            </div>
          ) : (
            /* Parsed NFe Review Interface */
            <div className="space-y-6">
              {/* NFe Summary Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Nota Fiscal Info */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Dados da Nota</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      NFe {nfeData.nNF} / Série {nfeData.serie}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p>Emissão: <span className="font-bold text-white">{nfeData.dhEmi.substring(0, 10)}</span></p>
                    <p>Valor Total: <span className="font-black text-emerald-400">{formatCurrency(nfeData.totalNfeValue)}</span></p>
                  </div>
                  {nfeData.accessKey && (
                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900">
                      <span className="truncate font-mono">Chave: {nfeData.accessKey.substring(0, 18)}...</span>
                      <button 
                        type="button" 
                        onClick={copyAccessKey} 
                        className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                      >
                        {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey ? 'Copiada' : 'Copiar'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Fornecedor Info */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fornecedor Emitente</span>
                    {autoCreateSupplier ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Novo Fornecedor (Será Cadastrado)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Fornecedor Vinculado
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-white">{nfeData.supplier.xNome}</h4>
                      <p className="text-xs text-slate-400 font-mono">
                        CNPJ: {nfeData.supplier.cnpj} • {nfeData.supplier.city}/{nfeData.supplier.state}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedSupplierId}
                        onChange={(e) => {
                          setSelectedSupplierId(e.target.value);
                          setAutoCreateSupplier(e.target.value === 'NEW');
                        }}
                        className="bg-slate-900 border border-slate-700 text-xs font-bold rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                      >
                        <option value="NEW">+ Cadastrar como Novo Fornecedor</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Mapping Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <span>Conferência dos Produtos da Nota ({nfeData.items.length} itens)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setNfeData(null);
                      setMappings({});
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-rose-400 hover:underline"
                  >
                    Trocar Arquivo XML
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-4">Item XML (NFe)</th>
                          <th className="py-3 px-4 text-center">Qtd XML</th>
                          <th className="py-3 px-4 text-right">Custo Unit.</th>
                          <th className="py-3 px-4 text-right">Total Item</th>
                          <th className="py-3 px-4">Destino no Catálogo</th>
                          <th className="py-3 px-4 text-right">Preço de Venda</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {nfeData.items.map(item => {
                          const mapping = mappings[item.itemIndex] || {
                            itemIndex: item.itemIndex,
                            action: 'create',
                            matchedProductId: '',
                            newProductName: item.xProd,
                            newProductCategory: 'Geral',
                            salePrice: parseFloat((item.vUnCom * 1.5).toFixed(2))
                          };

                          return (
                            <tr key={item.itemIndex} className="hover:bg-slate-900/40 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-black text-white">{item.xProd}</div>
                                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                  <span>EAN: {item.cEAN || 'S/EAN'}</span>
                                  <span>• NCM: {item.NCM || 'S/NCM'}</span>
                                  <span>• Un: {item.uCom}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center font-black text-emerald-400">
                                {item.qCom}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-300">
                                {formatCurrency(item.vUnCom)}
                              </td>
                              <td className="py-3 px-4 text-right font-black font-mono text-white">
                                {formatCurrency(item.vProd)}
                              </td>
                              <td className="py-3 px-4">
                                <select
                                  value={mapping.action === 'match' ? mapping.matchedProductId : 'CREATE_NEW'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'CREATE_NEW') {
                                      setMappings(prev => ({
                                        ...prev,
                                        [item.itemIndex]: {
                                          ...mapping,
                                          action: 'create',
                                          matchedProductId: ''
                                        }
                                      }));
                                    } else {
                                      const matchedP = products.find(p => p.id === val);
                                      setMappings(prev => ({
                                        ...prev,
                                        [item.itemIndex]: {
                                          ...mapping,
                                          action: 'match',
                                          matchedProductId: val,
                                          salePrice: matchedP?.price || mapping.salePrice
                                        }
                                      }));
                                    }
                                  }}
                                  className="bg-slate-900 border border-slate-700 text-xs font-bold rounded-xl px-2.5 py-1.5 text-white outline-none focus:border-emerald-500 w-full max-w-xs"
                                >
                                  <option value="CREATE_NEW">+ Cadastrar Novo Produto</option>
                                  <optgroup label="Vincular a Produto Existente">
                                    {products.map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} (Atual: {p.stock} un)
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[10px] text-slate-400 font-bold">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={mapping.salePrice || ''}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setMappings(prev => ({
                                        ...prev,
                                        [item.itemIndex]: {
                                          ...mapping,
                                          salePrice: val
                                        }
                                      }));
                                    }}
                                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs font-bold text-emerald-400 outline-none focus:border-emerald-500"
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Duplicates / Faturas info */}
              {nfeData.duplicates.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Contas a Pagar / Parcelas da NFe (Integração Financeira)
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {nfeData.duplicates.map((dup, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                        <span className="font-bold text-slate-400">Parc. {dup.nDup}:</span>
                        <span className="font-black text-white">{formatCurrency(dup.vDup)}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Venc: {dup.dVenc || 'À vista'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {nfeData && (
          <div className="p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="text-xs text-slate-400">
              Total da Compra: <span className="text-base font-black text-emerald-400">{formatCurrency(nfeData.totalNfeValue)}</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={loading}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Processando Entrada...' : 'Confirmar e Atualizar Estoque'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
