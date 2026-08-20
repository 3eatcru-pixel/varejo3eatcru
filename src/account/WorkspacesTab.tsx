import React, { useState } from 'react';
import { Building2, Plus, CheckCircle2, ArrowRight, Shield, Sparkles } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';

export default function WorkspacesTab() {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleSwitch = async (id: string) => {
    setSwitchingId(id);
    try {
      await switchWorkspace(id);
    } catch (err) {
      console.error(err);
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createWorkspace({
        name: name.trim(),
        tradeName: tradeName.trim() || name.trim(),
        cnpj: cnpj.trim()
      });
      setIsCreating(false);
      setName('');
      setTradeName('');
      setCnpj('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
            Minhas Empresas & Lojas
          </h3>
          <p className="text-xs font-bold text-slate-400">
            Alterne entre suas empresas ou crie uma nova estrutura comercial
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Empresa
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4 animate-in fade-in">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Cadastrar Nova Empresa / Loja
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-600">Razão Social *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Comercial Silva Ltda"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-600">Nome Fantasia</label>
              <input
                type="text"
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
                placeholder="Ex: Mercado Silva"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-600">CNPJ (Opcional)</label>
              <input
                type="text"
                value={cnpj}
                onChange={e => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-xs font-black uppercase text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider px-5 py-2 rounded-xl transition-all shadow-md"
            >
              {loading ? 'Criando...' : 'Confirmar e Criar'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workspaces.map(w => {
          const isActive = activeWorkspace?.id === w.id;
          return (
            <div
              key={w.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                isActive
                  ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base ${
                    isActive ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-100 text-slate-700'
                  }`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      {w.tradeName || w.name}
                      {isActive && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase">
                          Empresa Ativa
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                      {w.cnpj ? `CNPJ: ${w.cnpj}` : 'Empresa Matriz'} • Plano {w.planTier || 'BASIC'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  Cargo: {w.roleInCompany || 'ADMIN'}
                </span>

                {isActive ? (
                  <span className="text-xs font-black uppercase text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Em Uso
                  </span>
                ) : (
                  <button
                    onClick={() => handleSwitch(w.id)}
                    disabled={switchingId === w.id}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    {switchingId === w.id ? 'Alternando...' : 'Acessar Empresa'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
