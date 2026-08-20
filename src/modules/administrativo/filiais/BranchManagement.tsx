import React, { useState } from 'react';
import { UserProfile } from '../../../types';
import { Building2, Plus, MapPin, Phone, Users, Monitor, ChevronRight, Activity, Trash2, Edit3, CheckCircle2, MoreVertical, Globe } from 'lucide-react';
import { useToast } from '../../../components/Toast';

export default function BranchManagement({ user }: { user: UserProfile }) {
  const { showSuccess, showError } = useToast();
  const [branches, setBranches] = useState([
    { id: 'b1', name: 'Matriz - São Paulo', city: 'São Paulo', state: 'SP', address: 'Av. Paulista, 1000', terminals: 4, employees: 8, status: 'ACTIVE' },
    { id: 'b2', name: 'Filial - Campinas', city: 'Campinas', state: 'SP', address: 'Rua das Flores, 500', terminals: 2, employees: 3, status: 'ACTIVE' },
    { id: 'b3', name: 'Filial - Rio de Janeiro', city: 'Rio de Janeiro', state: 'RJ', address: 'Av. Atlântica, 200', terminals: 3, employees: 5, status: 'INACTIVE' },
  ]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-500" />
              Gestão de Filiais & Unidades
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Administre múltiplas unidades de negócio e seus respectivos terminais
            </p>
          </div>
          <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
            <Plus className="w-4 h-4 text-blue-400" />
            Nova Filial
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Building2 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Total de Unidades</p>
              <p className="text-lg font-black text-slate-900">03 Filiais</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <Monitor className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Terminais PDV</p>
              <p className="text-lg font-black text-slate-900">09 Ativos</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-2xl">
              <Users className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Colaboradores</p>
              <p className="text-lg font-black text-slate-900">16 Pessoas</p>
            </div>
          </div>
        </div>

        {/* Branch List */}
        <div className="grid grid-cols-1 gap-4">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-300 transition-all group">
              <div className="p-6 flex flex-col md:flex-row items-center gap-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${branch.status === 'ACTIVE' ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                  <Building2 className="w-8 h-8" />
                </div>
                
                <div className="flex-1 min-w-0 space-y-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <h3 className="font-black text-slate-900 uppercase tracking-wider">{branch.name}</h3>
                    {branch.status === 'ACTIVE' ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded border border-emerald-200">
                        Ativa
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded border border-slate-200">
                        Inativa
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[10px] font-bold text-slate-400 uppercase">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {branch.city}, {branch.state}</span>
                    <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {branch.terminals} Terminais</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {branch.employees} Funcionários</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button className="p-3 bg-slate-50 text-slate-600 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all group-hover:bg-blue-600">
                    Gerenciar Unidade
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Collapsible Info Bar */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-blue-400" /> Sincronização em Tempo Real</span>
                  <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-emerald-400" /> Terminal #1: Operando</span>
                </div>
                <button className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                  <Plus className="w-3 h-3" /> Adicionar Terminal
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Help & Limits */}
        <div className="p-6 bg-blue-600 rounded-[40px] text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row items-center gap-8">
          <div className="space-y-2 flex-1 text-center md:text-left">
            <h3 className="text-lg font-black uppercase tracking-widest">Multi-Unidade VarejoPro</h3>
            <p className="text-sm font-medium text-blue-100 leading-relaxed">
              Expanda sua operação com facilidade. Centralize o estoque, unifique os relatórios e gerencie permissões específicas para cada filial em uma única plataforma.
            </p>
          </div>
          <div className="bg-white/10 p-5 rounded-3xl border border-white/20 backdrop-blur-sm text-center min-w-[200px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Seu Plano Permite</p>
            <p className="text-3xl font-black text-white mt-1">05</p>
            <p className="text-[10px] font-bold text-blue-100 uppercase mt-1">Unidades Ativas</p>
            <button className="mt-4 w-full py-2 bg-white text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all">
              Aumentar Limite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
