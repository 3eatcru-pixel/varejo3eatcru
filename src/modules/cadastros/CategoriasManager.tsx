import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  Plus, 
  Edit2, 
  Trash2, 
  Tag, 
  Layers, 
  Search, 
  Save, 
  X, 
  CheckCircle2,
  Sparkles,
  Palette
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, InventorySettings } from '../../types';
import { useToast } from '../../components/Toast';

const PRESET_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', 
  '#f59e0b', '#ef4444', '#06b6d4', '#64748b'
];

export default function CategoriasManager({ user }: { user: UserProfile }) {
  const { showSuccess, showError, showWarning } = useToast();
  const companyId = user.companyId || 'empresa_principal';

  const [settings, setSettings] = useState<InventorySettings>({
    categories: ['Vestuário & Moda', 'Calçados', 'Acessórios', 'Cosméticos', 'Alimentos & Bebidas', 'Eletrônicos', 'Casa & Decoração'],
    sectors: ['Loja Principal', 'Gôndola / Exposição', 'Depósito Central', 'Vitrine'],
    tags: ['Mais Vendido', 'Promoção', 'Lançamento', 'Novidade', 'Queima de Estoque']
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'categories' | 'sectors' | 'tags'>('categories');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    const docRef = doc(db, 'settings', `inventory_${companyId}`);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as InventorySettings;
        setSettings({
          categories: data.categories || [],
          sectors: data.sectors || [],
          tags: data.tags || []
        });
      }
      setLoading(false);
    }, (err) => {
      console.warn('Erro ao carregar categorias:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [companyId]);

  const handleSaveToFirestore = async (newSettings: InventorySettings) => {
    try {
      const docRef = doc(db, 'settings', `inventory_${companyId}`);
      await setDoc(docRef, {
        ...newSettings,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err: any) {
      showError('Erro ao sincronizar dados com o banco.');
    }
  };

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setNewItemName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (index: number, currentName: string) => {
    setEditingIndex(index);
    setNewItemName(currentName);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newItemName.trim();
    if (!cleanName) return;

    const listKey = activeTab;
    const currentList = [...settings[listKey]];

    if (editingIndex !== null) {
      // Edit existing
      currentList[editingIndex] = cleanName;
      showSuccess(`Item atualizado para "${cleanName}".`);
    } else {
      // Add new
      if (currentList.some(item => item.toLowerCase() === cleanName.toLowerCase())) {
        showWarning(`Este item já existe na lista.`);
        return;
      }
      currentList.push(cleanName);
      showSuccess(`"${cleanName}" adicionado com sucesso.`);
    }

    const updated = {
      ...settings,
      [listKey]: currentList
    };

    setSettings(updated);
    setIsModalOpen(false);
    setNewItemName('');
    await handleSaveToFirestore(updated);
  };

  const handleDelete = async (index: number) => {
    const listKey = activeTab;
    const itemToDelete = settings[listKey][index];
    
    if (confirm(`Deseja realmente remover "${itemToDelete}"?`)) {
      const currentList = [...settings[listKey]];
      currentList.splice(index, 1);
      
      const updated = {
        ...settings,
        [listKey]: currentList
      };

      setSettings(updated);
      showSuccess(`"${itemToDelete}" removido.`);
      await handleSaveToFirestore(updated);
    }
  };

  const currentList = settings[activeTab] || [];
  const filteredList = currentList.filter(item => 
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2.5">
              <FolderTree className="w-6 h-6 text-emerald-600" />
              Categorias & Organização de Produtos
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Classifique produtos, setores físicos da loja e etiquetas de destaque no PDV
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova {activeTab === 'categories' ? 'Categoria' : activeTab === 'sectors' ? 'Localização / Setor' : 'Etiqueta / Tag'}
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => { setActiveTab('categories'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-4 h-4 text-emerald-600" />
            Categorias ({settings.categories.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('sectors'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'sectors'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            Setores & Locais ({settings.sectors.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('tags'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'tags'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4 text-amber-600" />
            Tags & Destaques ({settings.tags.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input 
            type="text"
            placeholder={`Buscar por nome de ${activeTab === 'categories' ? 'categoria' : activeTab === 'sectors' ? 'setor' : 'tag'}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-xs font-bold text-slate-800 placeholder-slate-400 outline-none"
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={() => setSearchTerm('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredList.map((item, index) => (
            <div 
              key={index}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                  activeTab === 'categories' 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : activeTab === 'sectors'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-amber-50 text-amber-600'
                }`}>
                  {item.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{item}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {activeTab === 'categories' ? 'Categoria' : activeTab === 'sectors' ? 'Setor' : 'Tag'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(index, item)}
                  title="Editar"
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  title="Excluir"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {filteredList.length === 0 && (
            <div className="col-span-full bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
              <FolderTree className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">Nenhum registro encontrado</p>
              <p className="text-xs text-slate-400">
                {searchTerm ? 'Nenhum resultado corresponde à sua pesquisa.' : 'Comece cadastrando seu primeiro item.'}
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Cadastrar Agora
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                {editingIndex !== null ? 'Editar Item' : `Nova ${activeTab === 'categories' ? 'Categoria' : activeTab === 'sectors' ? 'Localização' : 'Tag'}`}
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Nome do Item <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={activeTab === 'categories' ? 'Ex: Bebidas Artesanais, Acessórios' : activeTab === 'sectors' ? 'Ex: Vitrine Frontal, Prateleira B' : 'Ex: Queima de Estoque, Mais Vendido'}
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
