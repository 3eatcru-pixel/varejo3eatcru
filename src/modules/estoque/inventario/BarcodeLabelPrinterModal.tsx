import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  X, 
  Barcode as BarcodeIcon, 
  Tag, 
  Check, 
  Layers, 
  Search,
  Eye,
  QrCode,
  Sparkles,
  PackageCheck
} from 'lucide-react';
import { Product } from '../../../types';
import { formatCurrency } from '../../../lib/utils';

interface BarcodeLabelPrinterModalProps {
  products: Product[];
  onClose: () => void;
}

export default function BarcodeLabelPrinterModal({ products, onClose }: BarcodeLabelPrinterModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<Record<string, number>>({});
  const [labelSize, setLabelSize] = useState<'50x30' | '60x40' | '40x25' | '30x20'>('50x30');
  const [codeType, setCodeType] = useState<'BARCODE' | 'QRCODE'>('BARCODE');
  const [showPrice, setShowPrice] = useState(true);
  const [showBatch, setShowBatch] = useState(true);
  const [showStoreName, setShowStoreName] = useState(true);
  const [storeName, setStoreName] = useState('VarejoPro Store');
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm)) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Generate QR codes dynamically for selected products
  useEffect(() => {
    if (codeType !== 'QRCODE') return;

    products.forEach(p => {
      const payload = p.barcode || p.sku || p.id;
      if (!qrCodeUrls[p.id]) {
        QRCode.toDataURL(payload, {
          width: 120,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        }).then(url => {
          setQrCodeUrls(prev => ({ ...prev, [p.id]: url }));
        }).catch(err => {
          console.warn('Erro ao gerar QR Code para produto:', p.name, err);
        });
      }
    });
  }, [codeType, products, qrCodeUrls]);

  const toggleSelectProduct = (product: Product) => {
    setSelectedLabels(prev => {
      const next = { ...prev };
      if (next[product.id]) {
        delete next[product.id];
      } else {
        next[product.id] = 1;
      }
      return next;
    });
  };

  const updateCopies = (productId: string, delta: number) => {
    setSelectedLabels(prev => {
      const current = prev[productId] || 0;
      const nextVal = Math.max(1, current + delta);
      return { ...prev, [productId]: nextVal };
    });
  };

  const selectStockQuantity = (product: Product) => {
    const qty = Math.max(1, Math.min(50, product.stock || 1));
    setSelectedLabels(prev => ({
      ...prev,
      [product.id]: qty
    }));
  };

  const selectAllFiltered = () => {
    setSelectedLabels(prev => {
      const next = { ...prev };
      filteredProducts.forEach(p => {
        if (!next[p.id]) next[p.id] = 1;
      });
      return next;
    });
  };

  const clearAllSelected = () => {
    setSelectedLabels({});
  };

  // Compile list of labels to print
  const labelsToPrint: Array<{ product: Product; copyIndex: number }> = [];
  Object.entries(selectedLabels).forEach(([prodId, qty]) => {
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      for (let i = 0; i < qty; i++) {
        labelsToPrint.push({ product: prod, copyIndex: i + 1 });
      }
    }
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col text-white shadow-2xl overflow-hidden">
        {/* Header (No print) */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-white">
                Impressão de Etiquetas Gôndola & Código de Barras
              </h2>
              <p className="text-xs text-slate-400">
                Gere e imprima etiquetas térmicas personalizadas para gôndolas e produtos com código EAN / QR, preço e validade.
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

        {/* Content split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden print:overflow-visible">
          {/* Left panel - Selection & Configuration (No print) */}
          <div className="w-full md:w-96 border-r border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto shrink-0 print:hidden">
            {/* Search */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                Buscar Produto para Etiquetar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Nome, EAN ou SKU..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-[10px] font-black uppercase text-amber-400 hover:underline"
              >
                + Selecionar Todos ({filteredProducts.length})
              </button>
              {Object.keys(selectedLabels).length > 0 && (
                <button
                  type="button"
                  onClick={clearAllSelected}
                  className="text-[10px] font-black uppercase text-rose-400 hover:underline"
                >
                  Limpar Seleção
                </button>
              )}
            </div>

            {/* Products List */}
            <div className="flex-1 border border-slate-800 rounded-2xl bg-slate-950 overflow-y-auto divide-y divide-slate-800/60 max-h-60 md:max-h-none">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Nenhum produto encontrado.
                </div>
              ) : (
                filteredProducts.map(p => {
                  const isSelected = !!selectedLabels[p.id];
                  const copies = selectedLabels[p.id] || 0;
                  return (
                    <div key={p.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-900/60 transition-colors">
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggleSelectProduct(p)}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectProduct(p)}
                            className="rounded border-slate-700 text-amber-500 focus:ring-0"
                          />
                          <p className="text-xs font-bold text-white truncate">{p.name}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 ml-5 font-mono">
                          EAN: {p.barcode || 'S/EAN'} • {formatCurrency(p.price)}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => selectStockQuantity(p)}
                            className="text-[9px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded"
                            title={`Copiar estoque (${p.stock} un)`}
                          >
                            Estq ({p.stock})
                          </button>
                          <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded-lg">
                            <button
                              type="button"
                              onClick={() => updateCopies(p.id, -1)}
                              className="w-5 h-5 flex items-center justify-center font-black text-slate-300 hover:text-white"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-amber-400 w-4 text-center">{copies}</span>
                            <button
                              type="button"
                              onClick={() => updateCopies(p.id, 1)}
                              className="w-5 h-5 flex items-center justify-center font-black text-slate-300 hover:text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Layout Options */}
            <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                  Tipo de Código
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCodeType('BARCODE')}
                    className={`py-2 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 border transition-all ${
                      codeType === 'BARCODE'
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <BarcodeIcon className="w-4 h-4" />
                    <span>Barras 1D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeType('QRCODE')}
                    className={`py-2 px-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 border transition-all ${
                      codeType === 'QRCODE'
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR Code 2D</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                  Tamanho da Bobina Térmica
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['50x30', '60x40', '40x25', '30x20'] as const).map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setLabelSize(size)}
                      className={`py-1.5 px-2 rounded-xl font-black text-[10px] uppercase border transition-all ${
                        labelSize === size
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {size} mm (Padrão)
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={e => setShowPrice(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-500"
                  />
                  <span className="text-slate-300 font-bold text-[11px]">Exibir Preço de Venda</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBatch}
                    onChange={e => setShowBatch(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-500"
                  />
                  <span className="text-slate-300 font-bold text-[11px]">Exibir Lote / Validade</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStoreName}
                    onChange={e => setShowStoreName(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-500"
                  />
                  <span className="text-slate-300 font-bold text-[11px]">Exibir Nome da Loja</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right panel - Print Preview & Output */}
          <div className="flex-1 bg-slate-950 p-6 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Pré-visualização das Etiquetas ({labelsToPrint.length} unidades geradas)
                </h3>
              </div>

              <button
                type="button"
                onClick={handlePrint}
                disabled={labelsToPrint.length === 0}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Etiquetas</span>
              </button>
            </div>

            {labelsToPrint.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 print:hidden">
                <Tag className="w-12 h-12 mb-2 opacity-30 text-amber-400" />
                <p className="text-sm font-bold text-slate-400">Nenhuma etiqueta selecionada para impressão.</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Marque os produtos na coluna à esquerda para gerar as etiquetas de gôndola e produtos.
                </p>
              </div>
            ) : (
              /* Label Grid Paper simulation */
              <div className="flex-1 bg-white rounded-2xl p-6 shadow-2xl text-slate-950 overflow-y-auto print:bg-transparent print:p-0 print:shadow-none">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 print:grid-cols-3 print:gap-2">
                  {labelsToPrint.map((item, idx) => (
                    <div
                      key={idx}
                      className="border border-dashed border-slate-300 rounded-lg p-2.5 flex flex-col justify-between items-center text-center bg-white shadow-sm print:border-black print:shadow-none"
                      style={{
                        minHeight: labelSize === '50x30' ? '120px' : labelSize === '60x40' ? '150px' : '90px'
                      }}
                    >
                      {showStoreName && (
                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 pb-0.5 border-b border-slate-100 w-full truncate">
                          {storeName}
                        </div>
                      )}

                      <div className="font-black text-[11px] leading-tight line-clamp-2 uppercase text-slate-900 pt-1">
                        {item.product.name}
                      </div>

                      {/* Barcode / QR Code visual representation */}
                      <div className="my-1.5 w-full flex flex-col items-center justify-center">
                        {codeType === 'QRCODE' && qrCodeUrls[item.product.id] ? (
                          <img
                            src={qrCodeUrls[item.product.id]}
                            alt="QR Code"
                            className="w-16 h-16 object-contain"
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-[2px] h-7 w-full max-w-[140px] px-1 bg-slate-50 border border-slate-200">
                            <div className="w-[2px] h-full bg-black"></div>
                            <div className="w-[1px] h-full bg-black"></div>
                            <div className="w-[3px] h-full bg-black"></div>
                            <div className="w-[1px] h-full bg-black"></div>
                            <div className="w-[2px] h-full bg-black"></div>
                            <div className="w-[1px] h-full bg-black"></div>
                            <div className="w-[3px] h-full bg-black"></div>
                            <div className="w-[2px] h-full bg-black"></div>
                            <div className="w-[1px] h-full bg-black"></div>
                            <div className="w-[2px] h-full bg-black"></div>
                            <div className="w-[3px] h-full bg-black"></div>
                            <div className="w-[1px] h-full bg-black"></div>
                            <div className="w-[2px] h-full bg-black"></div>
                          </div>
                        )}
                        <span className="font-mono text-[9px] font-bold tracking-widest text-slate-700 mt-0.5">
                          {item.product.barcode || item.product.sku || '789000000000'}
                        </span>
                      </div>

                      {showPrice && (
                        <div className="w-full pt-1 border-t border-slate-200 flex items-center justify-between px-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Preço:</span>
                          <span className="text-xs font-black text-emerald-700 font-mono">
                            {formatCurrency(item.product.price)}
                          </span>
                        </div>
                      )}

                      {showBatch && (item.product.batchNumber || item.product.expirationDate) && (
                        <div className="text-[8px] text-slate-500 font-bold uppercase w-full text-left truncate pt-0.5">
                          {item.product.batchNumber && `LOTE: ${item.product.batchNumber} `}
                          {item.product.expirationDate && `VAL: ${item.product.expirationDate}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
