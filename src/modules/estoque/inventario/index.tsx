import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  where
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  Tag, 
  X, 
  Loader2, 
  Filter, 
  Upload, 
  Sparkles, 
  QrCode, 
  Image as ImageIcon, 
  MapPin, 
  Settings, 
  Check, 
  AlertTriangle, 
  Layers,
  Printer
} from 'lucide-react';
import { db, storage } from '../../../lib/firebase';
import { Product, UserProfile, CompanyRole, OperationType, InventorySettings } from '../../../types';
import { cn, formatCurrency } from '../../../lib/utils';
import { handleFirestoreError } from '../../../lib/firestore-errors';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { createProduct, updateProduct, deleteProduct, checkBarcodeExists, fetchProducts } from '../../../services/ProductService';
import { useToast } from '../../../components/Toast';
import BarcodeLabelPrinterModal from './BarcodeLabelPrinterModal';
import { ProductModal } from './ProductModal';

const DEFAULT_SECTORS = ['Loja Principal', 'Gôndola / Exposição', 'Depósito Central', 'Estoque Reserva', 'Vitrine'];
const DEFAULT_TAGS = ['Promoção', 'Mais Vendido', 'Lançamento', 'Importado', 'Queima de Estoque', 'Novidade', 'Frágil'];
const DEFAULT_CATEGORIES = ['Alimentos & Bebidas', 'Vestuário & Moda', 'Eletrônicos & Eletro', 'Cosméticos & Higiene', 'Casa & Decoração', 'Acessórios'];

// Initial Mock Products for retail store if Firestore is empty
const INITIAL_RETAIL_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: 'Camiseta Algodão Premium Pima',
    barcode: '78910001',
    sku: 'VEST-001',
    price: 89.90,
    costPrice: 35.00,
    stock: 42,
    minStock: 10,
    unit: 'UN',
    category: 'Vestuário & Moda',
    sector: 'Loja Principal',
    tags: ['Mais Vendido', 'Novidade'],
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80'
  },
  {
    name: 'Fone de Ouvido Bluetooth Noise Cancelling',
    barcode: '78910002',
    sku: 'ELET-002',
    price: 249.00,
    costPrice: 120.00,
    stock: 12,
    minStock: 5,
    unit: 'UN',
    category: 'Eletrônicos & Eletro',
    sector: 'Vitrine',
    tags: ['Importado', 'Promoção'],
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80'
  },
  {
    name: 'Garrafa Térmica Inox 750ml',
    barcode: '78910003',
    sku: 'CASA-003',
    price: 69.90,
    costPrice: 28.00,
    stock: 3,
    minStock: 8,
    unit: 'UN',
    category: 'Casa & Decoração',
    sector: 'Gôndola / Exposição',
    tags: ['Promoção'],
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80'
  },
  {
    name: 'Sérum Facial Hidratante Ácido Hialurônico',
    barcode: '78910004',
    sku: 'COSM-004',
    price: 119.50,
    costPrice: 45.00,
    stock: 18,
    minStock: 5,
    unit: 'UN',
    category: 'Cosméticos & Higiene',
    sector: 'Gôndola / Exposição',
    tags: ['Mais Vendido', 'Frágil'],
    imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&auto=format&fit=crop&q=80'
  }
];

export default function InventoryList({ user }: { user: UserProfile }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Settings State
  const [globalSettings, setGlobalSettings] = useState<InventorySettings>({
    sectors: DEFAULT_SECTORS,
    tags: DEFAULT_TAGS,
    categories: DEFAULT_CATEGORIES
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [newSectorInput, setNewSectorInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [editingSectorIdx, setEditingSectorIdx] = useState<number | null>(null);
  const [editingSectorVal, setEditingSectorVal] = useState('');
  const [editingTagIdx, setEditingTagIdx] = useState<number | null>(null);
  const [editingTagVal, setEditingTagVal] = useState('');

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isLabelPrinterOpen, setIsLabelPrinterOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'search' | 'sku'>('search');

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    costPrice: '',
    stock: '',
    minStock: '',
    unit: 'UN',
    category: '',
    sector: '',
    tags: [] as string[],
    barcode: '',
    sku: '',
    batchNumber: '',
    expirationDate: '',
    imageUrl: ''
  });

  // Load Inventory Settings
  useEffect(() => {
    const companyId = user.companyId || 'empresa_principal';
    const settingsRef = doc(db, 'settings', `inventory_${companyId}`);
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as InventorySettings;
        setGlobalSettings({
          sectors: data.sectors && data.sectors.length ? data.sectors : DEFAULT_SECTORS,
          tags: data.tags && data.tags.length ? data.tags : DEFAULT_TAGS,
          categories: data.categories && data.categories.length ? data.categories : DEFAULT_CATEGORIES
        });
      } else {
        setDoc(settingsRef, {
          sectors: DEFAULT_SECTORS,
          tags: DEFAULT_TAGS,
          categories: DEFAULT_CATEGORIES,
          companyId
        }).catch(err => console.warn('Initializing default inventory settings:', err));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `settings/inventory_${companyId}`);
    });

    return () => unsubscribe();
  }, [user.companyId]);

  // Load Products via API
  const loadProductCatalog = async () => {
    try {
      setLoading(true);
      const res = await fetchProducts(1, 300);
      setProducts(res.products.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.warn('Erro ao carregar produtos da API:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.companyId) {
      loadProductCatalog();
    }
  }, [user.companyId]);

  const saveGlobalSettings = async (updated: InventorySettings) => {
    try {
      const companyId = user.companyId || 'empresa_principal';
      const settingsRef = doc(db, 'settings', `inventory_${companyId}`);
      await setDoc(settingsRef, { ...updated, companyId }, { merge: true });
      setGlobalSettings(updated);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `settings/inventory_${user.companyId}`);
    }
  };

  const handleAddGlobalSector = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSectorInput.trim();
    if (!trimmed) return;
    if (globalSettings.sectors.includes(trimmed)) return showWarning('Este setor já existe na lista!', 'Setor Duplicado');
    const updated = { ...globalSettings, sectors: [...globalSettings.sectors, trimmed] };
    await saveGlobalSettings(updated);
    setNewSectorInput('');
  };

  const handleRemoveGlobalSector = async (sectorToRemove: string) => {
    if (!confirm(`Remover o setor "${sectorToRemove}"?`)) return;
    const updated = { ...globalSettings, sectors: globalSettings.sectors.filter(s => s !== sectorToRemove) };
    await saveGlobalSettings(updated);
  };

  const handleUpdateGlobalSector = async (index: number) => {
    const trimmed = editingSectorVal.trim();
    if (!trimmed) return;
    const newSectors = [...globalSettings.sectors];
    newSectors[index] = trimmed;
    await saveGlobalSettings({ ...globalSettings, sectors: newSectors });
    setEditingSectorIdx(null);
  };

  const handleAddGlobalTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (globalSettings.tags.includes(trimmed)) return showWarning('Esta tag já existe na lista!', 'Tag Duplicada');
    const updated = { ...globalSettings, tags: [...globalSettings.tags, trimmed] };
    await saveGlobalSettings(updated);
    setNewTagInput('');
  };

  const handleRemoveGlobalTag = async (tagToRemove: string) => {
    if (!confirm(`Remover a tag "${tagToRemove}"?`)) return;
    const updated = { ...globalSettings, tags: globalSettings.tags.filter(t => t !== tagToRemove) };
    await saveGlobalSettings(updated);
  };

  const handleUpdateGlobalTag = async (index: number) => {
    const trimmed = editingTagVal.trim();
    if (!trimmed) return;
    const newTags = [...globalSettings.tags];
    newTags[index] = trimmed;
    await saveGlobalSettings({ ...globalSettings, tags: newTags });
    setEditingTagIdx(null);
  };

  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price.toString(),
        costPrice: product.costPrice ? product.costPrice.toString() : '',
        stock: product.stock.toString(),
        minStock: product.minStock ? product.minStock.toString() : '',
        unit: product.unit || 'UN',
        category: product.category || globalSettings.categories[0] || 'Geral',
        sector: product.sector || globalSettings.sectors[0] || '',
        tags: product.tags || [],
        barcode: product.barcode || '',
        sku: product.sku || '',
        batchNumber: product.batchNumber || '',
        expirationDate: product.expirationDate || '',
        imageUrl: product.imageUrl || ''
      });
      setImagePreview(product.imageUrl || null);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        price: '',
        costPrice: '',
        stock: '',
        minStock: '5',
        unit: 'UN',
        category: globalSettings.categories[0] || 'Geral',
        sector: globalSettings.sectors[0] || '',
        tags: [],
        barcode: '',
        sku: '',
        batchNumber: '',
        expirationDate: '',
        imageUrl: ''
      });
      setImagePreview(null);
    }
    setSelectedFile(null);
    setIsProductModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleTagInForm = (tag: string) => {
    if (formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    } else {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (formData.barcode) {
        const exists = await checkBarcodeExists(formData.barcode, user.companyId || '', editingProduct?.id);
        if (exists) {
          showWarning('Já existe um produto cadastrado com este código de barras.', 'Código Duplicado');
          setUploading(false);
          return;
        }
      }

      let imageUrl = formData.imageUrl;
      if (selectedFile) {
        const fileRef = ref(storage, `products/${Date.now()}_${selectedFile.name}`);
        await uploadBytes(fileRef, selectedFile);
        imageUrl = await getDownloadURL(fileRef);
      }

      const payload: any = {
        name: formData.name,
        price: parseFloat(formData.price) || 0,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        stock: parseInt(formData.stock) || 0,
        minStock: formData.minStock ? parseInt(formData.minStock) : 5,
        unit: formData.unit,
        category: formData.category,
        sector: formData.sector,
        tags: formData.tags,
        barcode: formData.barcode,
        sku: formData.sku || undefined,
        batchNumber: formData.batchNumber || undefined,
        expirationDate: formData.expirationDate || undefined,
        imageUrl,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload, user);
      } else {
        await createProduct(payload, user);
      }
      setIsProductModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
    } finally {
      setUploading(false);
    }
  };

  const handleScan = (sku: string) => {
    if (scannerTarget === 'search') {
      setSearchTerm(sku);
    } else {
      setFormData(prev => ({ ...prev, barcode: sku }));
    }
    setIsScannerOpen(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Excluir este produto do catálogo da loja?")) return;
    try {
      await deleteProduct(id);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
    }
  };

  const categories = Array.from(new Set([
    ...(globalSettings.categories || []),
    ...products.map(p => p.category || 'Geral')
  ]));

  const filteredProducts = products.filter(p => {
    const searchVal = searchTerm.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchVal) || 
                         p.barcode?.includes(searchVal) ||
                         (p.tags && p.tags.some(t => t.toLowerCase().includes(searchVal)));
    
    const matchesCategory = !selectedCategory || (p.category || 'Geral') === selectedCategory;
    const matchesSector = !selectedSector || p.sector === selectedSector;
    const matchesTag = !selectedTag || (p.tags && p.tags.includes(selectedTag));
    const matchesLowStock = !lowStockOnly || (p.minStock ? p.stock <= p.minStock : p.stock <= 5);
    
    return matchesSearch && matchesCategory && matchesSector && matchesTag && matchesLowStock;
  });

  const totalSaleValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const totalCostValue = products.reduce((acc, p) => acc + ((p.costPrice || 0) * p.stock), 0);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden h-full p-3 sm:p-4 lg:p-6 bg-slate-100 relative">
      {/* Desktop Sidebar Filters (≥ 1024px) */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-4 overflow-y-auto pb-4 pr-1">
        {/* Settings button */}
        {user.role === CompanyRole.ADMIN && (
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-full flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-2xl shadow-md hover:bg-slate-800 transition-all text-xs font-bold uppercase tracking-wider min-h-[48px]"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Gerenciar Setores & Tags</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
              {globalSettings.sectors.length + globalSettings.tags.length}
            </span>
          </button>
        )}

        {/* Categories */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            Categorias de Produtos
          </h3>
          <div className="space-y-1">
            <button 
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-tight flex items-center justify-between",
                !selectedCategory ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <span>Todas</span>
              <span className="text-[10px] opacity-70">{products.length}</span>
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-tight flex items-center justify-between",
                  selectedCategory === cat ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                <span className="truncate">{cat}</span>
                <span className="text-[10px] opacity-70">
                  {products.filter(p => (p.category || 'Geral') === cat).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Retail Sectors Filter */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            Setores da Loja
          </h3>
          <div className="space-y-1">
            <button 
              onClick={() => setSelectedSector(null)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-tight",
                !selectedSector ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              Todos os Setores
            </button>
            {globalSettings.sectors.map(sec => (
              <button 
                key={sec}
                onClick={() => setSelectedSector(sec)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-tight flex items-center justify-between",
                  selectedSector === sec ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                <span className="truncate">{sec}</span>
                <span className="text-[10px] opacity-70">
                  {products.filter(p => p.sector === sec).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Global Tags Filter */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-purple-500" />
            Tags Promocionais / Filtros
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <button 
              onClick={() => setSelectedTag(null)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all uppercase tracking-tight",
                !selectedTag ? "bg-purple-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              Todas
            </button>
            {globalSettings.tags.map(tag => (
              <button 
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all uppercase tracking-tight",
                  selectedTag === tag ? "bg-purple-600 text-white shadow-sm" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Low Stock Alert Toggle */}
        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={cn(
            "p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between font-bold text-xs uppercase tracking-wider min-h-[48px]",
            lowStockOnly ? "bg-red-500 text-white border-red-600 shadow-md" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("w-4 h-4", lowStockOnly ? "text-white" : "text-red-500")} />
            <span>Alerta Estoque Mínimo</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/10 font-black">
            {products.filter(p => (p.minStock ? p.stock <= p.minStock : p.stock <= 5)).length}
          </span>
        </button>

        {/* Valuation Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl shadow-lg text-white mt-auto space-y-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total em Venda</p>
            <p className="text-xl font-black text-emerald-400">{formatCurrency(totalSaleValue)}</p>
          </div>
          {totalCostValue > 0 && (
            <div className="pt-2 border-t border-slate-700/60">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total em Custo</p>
              <p className="text-sm font-black text-slate-200">{formatCurrency(totalCostValue)}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-3 sm:gap-4 overflow-hidden h-full">
        {/* Responsive Top bar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome, EAN, tag ou setor..."
              className="w-full bg-white border border-slate-200 rounded-xl min-h-[44px] py-2 pl-10 pr-10 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              onClick={() => {
                setScannerTarget('search');
                setIsScannerOpen(true);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-emerald-500 rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Leitor de Código de Barras"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Filter Button (< 1024px) */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 min-h-[44px] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm shrink-0"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            <span>Filtros</span>
            {(selectedCategory || selectedSector || selectedTag || lowStockOnly) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button 
            onClick={() => setIsLabelPrinterOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-slate-900 text-amber-400 border border-slate-800 px-3.5 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md shrink-0"
            title="Gerar e imprimir etiquetas para gôndolas e produtos"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">Etiquetas Gôndola</span>
          </button>

          <button 
            onClick={() => openProductModal()}
            className="flex items-center gap-2 bg-emerald-500 text-white px-4 sm:px-5 min-h-[44px] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Cadastrar Produto</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>

        {/* Quick Category Horizontal Chips */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "min-h-[36px] px-3 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0",
                !selectedCategory ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              Todas ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={cn(
                  "min-h-[36px] px-3 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0",
                  selectedCategory === cat ? "bg-emerald-500 text-slate-950 font-black shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Active Filters Bar */}
        {(selectedCategory || selectedSector || selectedTag || lowStockOnly || searchTerm) && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtros:</span>
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                {selectedCategory}
                <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setSelectedCategory(null)} />
              </span>
            )}
            {selectedSector && (
              <span className="inline-flex items-center gap-1 bg-blue-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                {selectedSector}
                <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setSelectedSector(null)} />
              </span>
            )}
            {selectedTag && (
              <span className="inline-flex items-center gap-1 bg-purple-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                #{selectedTag}
                <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setSelectedTag(null)} />
              </span>
            )}
            {lowStockOnly && (
              <span className="inline-flex items-center gap-1 bg-red-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                Estoque Mínimo
                <X className="w-3 h-3 cursor-pointer" onClick={() => setLowStockOnly(false)} />
              </span>
            )}
            <button 
              onClick={() => {
                setSelectedCategory(null);
                setSelectedSector(null);
                setSelectedTag(null);
                setLowStockOnly(false);
                setSearchTerm('');
              }}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 underline uppercase ml-2 min-h-[32px] inline-flex items-center"
            >
              Limpar
            </button>
          </div>
        )}

        {/* Content Container (Cards on Mobile / Table on Desktop) */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
          
          {/* Mobile Card List View (< 768px) */}
          <div className="md:hidden flex-1 overflow-y-auto p-3 space-y-3">
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Sincronizando inventário...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhum produto cadastrado com esses filtros</p>
              </div>
            ) : filteredProducts.map((product) => (
              <div key={product.id} className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 shrink-0 overflow-hidden border border-slate-200">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight line-clamp-2">{product.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      CÓDIGO: {product.barcode || 'S/EAN'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                        {product.category || 'Geral'}
                      </span>
                      {product.sector && (
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md uppercase">
                          {product.sector}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Preço</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(product.price)}</span>
                    {product.costPrice ? (
                      <span className="text-[9px] text-slate-400 block">Custo: {formatCurrency(product.costPrice)}</span>
                    ) : null}
                  </div>

                  <div className="text-right">
                    <div className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border",
                      (product.minStock && product.stock <= product.minStock) || product.stock <= 5 
                        ? "bg-red-50 text-red-600 border-red-200" 
                        : "bg-emerald-50 text-emerald-600 border-emerald-200"
                    )}>
                      <div className={cn("w-2 h-2 rounded-full", (product.minStock && product.stock <= product.minStock) || product.stock <= 5 ? "bg-red-500" : "bg-emerald-500")} />
                      {product.stock} {product.unit || 'UN'}
                    </div>
                  </div>
                </div>

                {/* Touch Action Buttons (≥ 48px) */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/40">
                  <button 
                    type="button"
                    onClick={() => openProductModal(product)}
                    className="min-h-[44px] py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Editar</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleDeleteProduct(product.id)}
                    className="min-h-[44px] py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (≥ 768px) */}
          <div className="hidden md:block overflow-auto flex-1 h-full">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-100 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item / Código EAN</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor / Tags</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço de Venda</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque Atual</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Sincronizando inventário...</p>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-400">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">Nenhum produto cadastrado com esses filtros</p>
                    </td>
                  </tr>
                ) : filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0 overflow-hidden border border-slate-200/60">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{product.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            CÓDIGO: {product.barcode || 'S/EAN'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                        {product.category || 'Geral'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {product.sector ? (
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider inline-flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {product.sector}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 italic">Sem setor definido</span>
                        )}
                        {product.tags && product.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {product.tags.map(tag => (
                              <span key={tag} className="text-[8px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-black text-slate-900">{formatCurrency(product.price)}</p>
                        {product.costPrice ? (
                          <p className="text-[9px] font-bold text-slate-400">
                            Custo: {formatCurrency(product.costPrice)}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border",
                        (product.minStock && product.stock <= product.minStock) || product.stock <= 5 
                          ? "bg-red-50 text-red-600 border-red-200" 
                          : "bg-emerald-50 text-emerald-600 border-emerald-200"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full", (product.minStock && product.stock <= product.minStock) || product.stock <= 5 ? "bg-red-500" : "bg-emerald-500")} />
                        {product.stock} {product.unit || 'UN'}
                      </div>
                      {product.minStock && product.stock <= product.minStock && (
                        <p className="text-[8px] font-bold text-red-500 uppercase mt-1 tracking-wider">
                          Estoque Mínimo: {product.minStock}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => openProductModal(product)}
                          className="min-h-[36px] min-w-[36px] p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center"
                          title="Editar item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="min-h-[36px] min-w-[36px] p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center"
                          title="Excluir item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer (< 1024px) */}
      {isMobileFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            onClick={() => setIsMobileFilterOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
          />
          <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl p-5 shadow-2xl z-10 flex flex-col overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Filtros de Estoque</h3>
              <button 
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Valuation on Mobile */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl text-white space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Total Venda:</span>
                <span className="text-base font-black text-emerald-400">{formatCurrency(totalSaleValue)}</span>
              </div>
              {totalCostValue > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-700/50">
                  <span className="text-[10px] uppercase text-slate-400 font-bold">Total Custo:</span>
                  <span className="text-xs font-black text-slate-200">{formatCurrency(totalCostValue)}</span>
                </div>
              )}
            </div>

            {/* Low Stock Toggle */}
            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={cn(
                "p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between font-bold text-xs uppercase tracking-wider min-h-[48px]",
                lowStockOnly ? "bg-red-500 text-white border-red-600 shadow-md" : "bg-white text-slate-600 border-slate-200"
              )}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn("w-4 h-4", lowStockOnly ? "text-white" : "text-red-500")} />
                <span>Alerta Estoque Mínimo</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/10 font-black">
                {products.filter(p => (p.minStock ? p.stock <= p.minStock : p.stock <= 5)).length}
              </span>
            </button>

            {/* Sectors */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Setores</h4>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedSector(null)}
                  className={cn(
                    "min-h-[36px] px-3 rounded-xl text-xs font-bold uppercase tracking-tight",
                    !selectedSector ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  Todos
                </button>
                {globalSettings.sectors.map(sec => (
                  <button
                    key={sec}
                    onClick={() => setSelectedSector(selectedSector === sec ? null : sec)}
                    className={cn(
                      "min-h-[36px] px-3 rounded-xl text-xs font-bold uppercase tracking-tight",
                      selectedSector === sec ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tags Promocionais</h4>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={cn(
                    "min-h-[36px] px-3 rounded-xl text-xs font-bold uppercase tracking-tight",
                    !selectedTag ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"
                  )}
                >
                  Todas
                </button>
                {globalSettings.tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={cn(
                      "min-h-[36px] px-3 rounded-xl text-xs font-bold uppercase tracking-tight",
                      selectedTag === tag ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-700"
                    )}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full min-h-[48px] bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl py-3 shadow-lg"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScanner onScan={handleScan} onClose={() => setIsScannerOpen(false)} />
      )}

      {/* Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        editingProduct={editingProduct}
        globalSettings={globalSettings}
        onOpenScanner={(target) => {
          setScannerTarget(target);
          setIsScannerOpen(true);
        }}
        onSave={async (fData, file) => {
          setUploading(true);
          try {
            let imageUrl = editingProduct?.imageUrl || '';
            if (file) {
              const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
              await uploadBytes(storageRef, file);
              imageUrl = await getDownloadURL(storageRef);
            }

            const pPrice = parseFloat(fData.price) || 0;
            const cPrice = parseFloat(fData.costPrice) || 0;
            const pStock = parseInt(fData.stock) || 0;
            const pMinStock = parseInt(fData.minStock) || 5;

            const safeCompanyId = user.companyId || 'empresa_principal';
            if (fData.barcode && fData.barcode.trim()) {
              const barcodeTrim = fData.barcode.trim();
              const exists = await checkBarcodeExists(barcodeTrim, safeCompanyId, editingProduct?.id);
              if (exists) {
                showWarning(`O código de barras "${barcodeTrim}" já está cadastrado em outro produto.`, 'Aviso de Código Duplicado');
              }
            }

            const productData: Omit<Product, 'id'> = {
              name: fData.name,
              barcode: fData.barcode,
              category: fData.category,
              sector: fData.sector,
              unit: fData.unit,
              price: pPrice,
              costPrice: cPrice,
              stock: pStock,
              sku: fData.sku,
              batchNumber: fData.batchNumber,
              expirationDate: fData.expirationDate,
              minStock: pMinStock,
              tags: fData.tags,
              fiscalData: {
                ncm: fData.ncm,
                cest: fData.cest,
                cfop: fData.cfop,
                origin: fData.origin
              },
              imageUrl,
              companyId: safeCompanyId
            };

            if (editingProduct) {
              await updateProduct(editingProduct.id, productData, user);
              showSuccess(`Produto "${fData.name}" atualizado com sucesso!`, 'Item Atualizado');
            } else {
              await createProduct(productData, user);
              showSuccess(`Produto "${fData.name}" cadastrado com sucesso!`, 'Item Cadastrado');
            }
          } catch (err: any) {
            handleFirestoreError(err, OperationType.WRITE, 'products');
          } finally {
            setUploading(false);
          }
        }}
      />
      {/* Barcode Label Printer Modal */}
      {isLabelPrinterOpen && (
        <BarcodeLabelPrinterModal
          products={products}
          onClose={() => setIsLabelPrinterOpen(false)}
        />
      )}
    </div>
  );
}
