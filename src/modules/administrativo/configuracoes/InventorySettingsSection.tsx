import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  Tag, 
  MapPin, 
  Layers, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Save, 
  CheckCircle2, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { InventorySettings, OperationType, UserProfile } from '../../../types';
import { handleFirestoreError } from '../../../lib/firestore-errors';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/Toast';

const DEFAULT_SECTORS = ['Loja Principal', 'Gôndola / Exposição', 'Depósito Central', 'Estoque Reserva', 'Vitrine'];
const DEFAULT_TAGS = ['Promoção', 'Mais Vendido', 'Lançamento', 'Importado', 'Queima de Estoque', 'Novidade', 'Frágil'];
const DEFAULT_CATEGORIES = ['Alimentos & Bebidas', 'Vestuário & Moda', 'Eletrônicos & Eletro', 'Cosméticos & Higiene', 'Casa & Decoração', 'Acessórios'];

export default function InventorySettingsSection({ user }: { user: UserProfile }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const companyId = user.companyId || 'empresa_principal';

  const [settings, setSettings] = useState<InventorySettings>({
    sectors: DEFAULT_SECTORS,
    tags: DEFAULT_TAGS,
    categories: DEFAULT_CATEGORIES
  });

  // Inputs for adding new items
  const [newSector, setNewSector] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // Editing state
  const [editingSectorIdx, setEditingSectorIdx] = useState<number | null>(null);
  const [editingSectorVal, setEditingSectorVal] = useState('');

  const [editingTagIdx, setEditingTagIdx] = useState<number | null>(null);
  const [editingTagVal, setEditingTagVal] = useState('');

  const [editingCatIdx, setEditingCatIdx] = useState<number | null>(null);
  const [editingCatVal, setEditingCatVal] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const docRef = doc(db, 'settings', `inventory_${companyId}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as InventorySettings;
          setSettings({
            sectors: data.sectors && data.sectors.length ? data.sectors : DEFAULT_SECTORS,
            tags: data.tags && data.tags.length ? data.tags : DEFAULT_TAGS,
            categories: data.categories && data.categories.length ? data.categories : DEFAULT_CATEGORIES
          });
        }
      } catch (err) {
        console.error("Error loading inventory settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [companyId]);

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const docRef = doc(db, 'settings', `inventory_${companyId}`);
      await setDoc(docRef, { ...settings, companyId }, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `settings/inventory_${companyId}`);
    } finally {
      setSaving(false);
    }
  };

  // Sector handlers
  const handleAddSector = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newSector.trim();
    if (!val) return;
    if (settings.sectors.includes(val)) {
      showWarning('Este setor já está cadastrado na lista!', 'Setor Duplicado');
      return;
    }
    setSettings(prev => ({ ...prev, sectors: [...prev.sectors, val] }));
    setNewSector('');
  };

  const handleRemoveSector = (idx: number) => {
    setSettings(prev => ({
      ...prev,
      sectors: prev.sectors.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveSectorEdit = (idx: number) => {
    const val = editingSectorVal.trim();
    if (!val) return;
    setSettings(prev => {
      const copy = [...prev.sectors];
      copy[idx] = val;
      return { ...prev, sectors: copy };
    });
    setEditingSectorIdx(null);
    setEditingSectorVal('');
  };

  // Tag handlers
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newTag.trim();
    if (!val) return;
    if (settings.tags.includes(val)) {
      showWarning('Esta tag já está cadastrada na lista!', 'Tag Duplicada');
      return;
    }
    setSettings(prev => ({ ...prev, tags: [...prev.tags, val] }));
    setNewTag('');
  };

  const handleRemoveTag = (idx: number) => {
    setSettings(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveTagEdit = (idx: number) => {
    const val = editingTagVal.trim();
    if (!val) return;
    setSettings(prev => {
      const copy = [...prev.tags];
      copy[idx] = val;
      return { ...prev, tags: copy };
    });
    setEditingTagIdx(null);
    setEditingTagVal('');
  };

  // Category handlers
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newCategory.trim();
    if (!val) return;
    const cats = settings.categories || [];
    if (cats.includes(val)) {
      showWarning('Esta categoria já está cadastrada na lista!', 'Categoria Duplicada');
      return;
    }
    setSettings(prev => ({ ...prev, categories: [...(prev.categories || []), val] }));
    setNewCategory('');
  };

  const handleRemoveCategory = (idx: number) => {
    setSettings(prev => ({
      ...prev,
      categories: (prev.categories || []).filter((_, i) => i !== idx)
    }));
  };

  const handleSaveCategoryEdit = (idx: number) => {
    const val = editingCatVal.trim();
    if (!val) return;
    setSettings(prev => {
      const copy = [...(prev.categories || [])];
      copy[idx] = val;
      return { ...prev, categories: copy };
    });
    setEditingCatIdx(null);
    setEditingCatVal('');
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
        <p className="text-xs font-bold uppercase tracking-widest">Carregando categorias e tags de estoque...</p>
      </div>
    );
  }

  return (
    <section className="pt-8 border-t border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Categorias, Tags e Setores do Estoque</h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Gerencie centralizadamente as opções globais do varejo utilizadas nos módulos de produtos e inventário
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className={cn(
            "px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shrink-0",
            saveSuccess 
              ? "bg-emerald-500 text-white shadow-emerald-200" 
              : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
          )}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              Salvando...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Salvo com Sucesso!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-emerald-400" />
              Salvar Lista Global
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider">Alterações Registradas com Sucesso!</p>
            <p className="text-[11px] text-emerald-700 font-medium">
              As categorias, tags e setores do varejo foram salvos no banco Firestore (<code className="text-[10px] bg-emerald-100 px-1 py-0.5 rounded">settings/inventory</code>).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              Categorias ({settings.categories?.length || 0})
            </h4>
          </div>

          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input 
              type="text"
              placeholder="Nova categoria..."
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button 
              type="submit"
              className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-sm"
              title="Adicionar categoria"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {(settings.categories || []).map((cat, idx) => (
              <div key={cat + idx} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between group">
                {editingCatIdx === idx ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input 
                      type="text"
                      value={editingCatVal}
                      onChange={e => setEditingCatVal(e.target.value)}
                      className="flex-1 bg-slate-50 border border-emerald-400 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                      autoFocus
                    />
                    <button 
                      type="button" 
                      onClick={() => handleSaveCategoryEdit(idx)}
                      className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setEditingCatIdx(null)}
                      className="p-1 bg-slate-200 text-slate-600 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-bold text-slate-800">{cat}</span>
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button"
                        onClick={() => { setEditingCatIdx(idx); setEditingCatVal(cat); }}
                        className="p-1 text-slate-400 hover:text-slate-800 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleRemoveCategory(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sectors Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              Setores de Estoque ({settings.sectors.length})
            </h4>
          </div>

          <form onSubmit={handleAddSector} className="flex gap-2">
            <input 
              type="text"
              placeholder="Novo setor..."
              value={newSector}
              onChange={e => setNewSector(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit"
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm"
              title="Adicionar setor"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {settings.sectors.map((sec, idx) => (
              <div key={sec + idx} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between group">
                {editingSectorIdx === idx ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input 
                      type="text"
                      value={editingSectorVal}
                      onChange={e => setEditingSectorVal(e.target.value)}
                      className="flex-1 bg-slate-50 border border-blue-400 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                      autoFocus
                    />
                    <button 
                      type="button"
                      onClick={() => handleSaveSectorEdit(idx)}
                      className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditingSectorIdx(null)}
                      className="p-1 bg-slate-200 text-slate-600 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-bold text-slate-800">{sec}</span>
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button"
                        onClick={() => { setEditingSectorIdx(idx); setEditingSectorVal(sec); }}
                        className="p-1 text-slate-400 hover:text-slate-800 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleRemoveSector(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tags Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-500" />
              Tags Globais ({settings.tags.length})
            </h4>
          </div>

          <form onSubmit={handleAddTag} className="flex gap-2">
            <input 
              type="text"
              placeholder="Nova tag..."
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button 
              type="submit"
              className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-sm"
              title="Adicionar tag"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto pr-1">
            {settings.tags.map((tag, idx) => (
              <div key={tag + idx} className="p-2 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2 group">
                {editingTagIdx === idx ? (
                  <div className="flex items-center gap-1">
                    <input 
                      type="text"
                      value={editingTagVal}
                      onChange={e => setEditingTagVal(e.target.value)}
                      className="w-24 bg-white border border-purple-400 rounded-lg px-2 py-0.5 text-xs font-bold outline-none"
                      autoFocus
                    />
                    <button 
                      type="button"
                      onClick={() => handleSaveTagEdit(idx)}
                      className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditingTagIdx(null)}
                      className="p-1 bg-slate-200 text-slate-600 rounded-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-bold text-purple-800">#{tag}</span>
                    <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button"
                        onClick={() => { setEditingTagIdx(idx); setEditingTagVal(tag); }}
                        className="p-0.5 text-purple-400 hover:text-purple-900 rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleRemoveTag(idx)}
                        className="p-0.5 text-purple-400 hover:text-red-600 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
