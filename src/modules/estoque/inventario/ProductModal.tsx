import React, { useState, useEffect } from 'react';
import { Package, X, Upload, Image as ImageIcon, Sparkles, QrCode, Check, Loader2, Tag } from 'lucide-react';
import { Product } from '../../../types';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/Toast';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  globalSettings: { categories: string[]; sectors: string[]; tags: string[] };
  onSave: (formData: any, file?: File | null) => Promise<void>;
  onOpenScanner: (target: 'sku') => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  globalSettings,
  onSave,
  onOpenScanner,
}) => {
  const { showSuccess, showWarning, showError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: globalSettings.categories[0] || 'Geral',
    sector: '',
    unit: 'UN',
    price: '',
    costPrice: '',
    stock: '',
    sku: '',
    batchNumber: '',
    expirationDate: '',
    minStock: '5',
    tags: [] as string[],
    ncm: '',
    cest: '',
    cfop: '',
    origin: '0',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || '',
        barcode: editingProduct.barcode || '',
        category: editingProduct.category || globalSettings.categories[0] || 'Geral',
        sector: editingProduct.sector || '',
        unit: editingProduct.unit || 'UN',
        price: editingProduct.price ? String(editingProduct.price) : '',
        costPrice: editingProduct.costPrice ? String(editingProduct.costPrice) : '',
        stock: editingProduct.stock !== undefined ? String(editingProduct.stock) : '',
        sku: editingProduct.sku || '',
        batchNumber: editingProduct.batchNumber || '',
        expirationDate: editingProduct.expirationDate || '',
        minStock: editingProduct.minStock ? String(editingProduct.minStock) : '5',
        tags: editingProduct.tags || [],
        ncm: editingProduct.fiscalData?.ncm || '',
        cest: editingProduct.fiscalData?.cest || '',
        cfop: editingProduct.fiscalData?.cfop || '',
        origin: editingProduct.fiscalData?.origin || '0',
      });
      setImagePreview(editingProduct.imageUrl || null);
    } else {
      setFormData({
        name: '',
        barcode: '',
        category: globalSettings.categories[0] || 'Geral',
        sector: '',
        unit: 'UN',
        price: '',
        costPrice: '',
        stock: '',
        sku: '',
        batchNumber: '',
        expirationDate: '',
        minStock: '5',
        tags: [],
        ncm: '',
        cest: '',
        cfop: '',
        origin: '0',
      });
      setImagePreview(null);
    }
    setSelectedFile(null);
  }, [editingProduct, globalSettings.categories, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const toggleTagInForm = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      await onSave(formData, selectedFile);
      onClose();
    } catch (err: any) {
      showError('Erro ao salvar produto: ' + err.message, 'Erro');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-500" />
            {editingProduct ? 'Editar Item do Catálogo' : 'Novo Produto para Varejo'}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image Preview & AI Scan */}
          <div className="flex flex-col items-center justify-center gap-3 mb-2">
            <div className="relative group">
              <div className="w-28 h-28 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 overflow-hidden transition-all group-hover:border-emerald-500">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon className="w-7 h-7 text-slate-300" />
                    <span className="text-[9px] font-black uppercase text-slate-400">Foto do Item</span>
                  </>
                )}
              </div>
              <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all rounded-2xl">
                <Upload className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>

            {selectedFile && (
              <button
                type="button"
                onClick={async () => {
                  if (!selectedFile) return;
                  setUploading(true);
                  try {
                    const reader = new FileReader();
                    reader.readAsDataURL(selectedFile);
                    reader.onloadend = async () => {
                      const base64 = reader.result as string;
                      const res = await fetch('/api/gemini/scan-product', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: base64 })
                      });
                      const data = await res.json();
                      if (data.name) {
                        setFormData(prev => ({
                          ...prev,
                          name: data.name || prev.name,
                          category: data.category || prev.category,
                          price: data.price ? String(data.price) : prev.price,
                          unit: data.unit || prev.unit,
                          barcode: data.suggestedBarcode || prev.barcode
                        }));
                        showSuccess(`Produto identificado: ${data.name} (${data.category}) - R$ ${data.price}`, 'Gemini IA');
                      } else {
                        showWarning(data.error || 'Não foi possível extrair dados da foto.', 'IA Não Reconheceu');
                      }
                      setUploading(false);
                    };
                  } catch (err: any) {
                    showError('Erro ao escanear com Gemini IA: ' + err.message, 'Erro Gemini');
                    setUploading(false);
                  }
                }}
                disabled={uploading}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[10px] uppercase rounded-xl shadow-md hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Escanear Dados por Foto Gemini IA</span>
              </button>
            )}
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Produto *</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ex: Camiseta Algodão M ou Fone Bluetooth"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código EAN / Barras</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={formData.barcode}
                  onChange={e => setFormData({...formData, barcode: e.target.value})}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: 7891234567890"
                />
                <button 
                  type="button"
                  onClick={() => onOpenScanner('sku')}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
              <select
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {globalSettings.categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor de Estoque na Loja</label>
              <select
                value={formData.sector}
                onChange={e => setFormData({...formData, sector: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione um setor...</option>
                {globalSettings.sectors.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidade</label>
              <select
                value={formData.unit}
                onChange={e => setFormData({...formData, unit: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="UN">Unidade (UN)</option>
                <option value="KG">Quilograma (KG)</option>
                <option value="PAR">Par (PAR)</option>
                <option value="CX">Caixa (CX)</option>
                <option value="KIT">Kit (KIT)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço de Venda (R$) *</label>
              <input 
                required
                type="number"
                step="0.01" 
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço de Custo (R$)</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.costPrice}
                onChange={e => setFormData({...formData, costPrice: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque Inicial *</label>
              <input 
                required
                type="number" 
                value={formData.stock}
                onChange={e => setFormData({...formData, stock: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código SKU Interno</label>
              <input 
                type="text" 
                value={formData.sku}
                onChange={e => setFormData({...formData, sku: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ex: REF-001, VEST-04"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número do Lote</label>
              <input 
                type="text" 
                value={formData.batchNumber}
                onChange={e => setFormData({...formData, batchNumber: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ex: LOTE-2026-08"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Validade</label>
              <input 
                type="date" 
                value={formData.expirationDate}
                onChange={e => setFormData({...formData, expirationDate: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque Mínimo (Alerta)</label>
              <input 
                type="number" 
                value={formData.minStock}
                onChange={e => setFormData({...formData, minStock: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="5"
              />
            </div>
          </div>

          {/* Tags Selector */}
          <div className="space-y-2 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
            <label className="text-[10px] font-black text-purple-900 uppercase tracking-widest flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-600" />
              Atribuir Tags ao Produto
            </label>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {globalSettings.tags.map(tag => {
                const isSelected = formData.tags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTagInForm(tag)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border",
                      isSelected 
                        ? "bg-purple-600 text-white border-purple-700 shadow-sm" 
                        : "bg-white text-purple-700 border-purple-200 hover:bg-purple-100"
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>#{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FISCAL SECTION */}
          <div className="space-y-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
            <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-widest flex items-center gap-2">
              Informações Fiscais (NFC-e / NF-e)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NCM</label>
                <input 
                  type="text" 
                  value={formData.ncm}
                  onChange={e => setFormData({...formData, ncm: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: 6109.10.00"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CEST</label>
                <input 
                  type="text" 
                  value={formData.cest}
                  onChange={e => setFormData({...formData, cest: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: 28.038.00"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CFOP Padrão</label>
                <input 
                  type="text" 
                  value={formData.cfop}
                  onChange={e => setFormData({...formData, cfop: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: 5102"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem</label>
                <select
                  value={formData.origin}
                  onChange={e => setFormData({...formData, origin: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="0">0 - Nacional</option>
                  <option value="1">1 - Estrangeira (Importação)</option>
                  <option value="2">2 - Estrangeira (Mercado Interno)</option>
                  <option value="3">3 - Nacional (Conteúdo Imp. &gt; 40%)</option>
                  <option value="4">4 - Nacional (Ajuste Lei)</option>
                  <option value="5">5 - Nacional (Conteúdo Imp. &lt;= 40%)</option>
                  <option value="6">6 - Estrangeira (Resolução CAMEX)</option>
                  <option value="7">7 - Estrangeira (Sem Similar)</option>
                  <option value="8">8 - Nacional (Conteúdo Imp. &gt; 70%)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={uploading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar Produto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
