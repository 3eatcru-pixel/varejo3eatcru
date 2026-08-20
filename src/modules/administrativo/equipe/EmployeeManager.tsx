import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Briefcase, 
  MapPin, 
  BadgeCheck, 
  Zap, 
  ZapOff, 
  Clock, 
  Trash2, 
  Edit2, 
  Search, 
  X, 
  Plus,
  Mail,
  User,
  Shield,
  Smartphone,
  Hash,
  Calendar,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Employee, EmployeePulseStatus, UserProfile, Branch } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import EmployeeScheduleManager from './EmployeeScheduleManager';

interface EmployeeFormState {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  registrationNumber: string;
  role: string;
  department: string;
  branchId: string;
  status: 'ACTIVE' | 'INACTIVE';
  pulseStatus: EmployeePulseStatus;
  commissionRate: number;
  admissionDate: string;
}

const INITIAL_FORM: EmployeeFormState = {
  name: '',
  email: '',
  registrationNumber: '',
  role: '',
  department: '',
  branchId: '',
  status: 'ACTIVE',
  pulseStatus: 'OFFLINE',
  commissionRate: 0,
  admissionDate: ''
};

export default function EmployeeManager() {
  const { userProfile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'EMPLOYEES' | 'SCHEDULE'>('EMPLOYEES');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<EmployeeFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const idToken = localStorage.getItem('varejopro_auth_token');
      if (!idToken) return;

      const [empRes, branchRes] = await Promise.all([
        fetch('/api/employees', { headers: { Authorization: `Bearer ${idToken}` } }),
        fetch('/api/account/branches', { headers: { Authorization: `Bearer ${idToken}` } })
      ]);

      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data.employees || []);
      }
      if (branchRes.ok) {
        const data = await branchRes.json();
        setBranches(data.branches || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const idToken = localStorage.getItem('varejopro_auth_token');
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar funcionário.');
      }

      setSuccessMsg(form.id ? 'Funcionário atualizado com sucesso!' : 'Funcionário cadastrado com sucesso!');
      setIsModalOpen(false);
      setForm(INITIAL_FORM);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o funcionário "${name}"?`)) return;

    try {
      const idToken = localStorage.getItem('varejopro_auth_token');
      const res = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (res.ok) {
        setSuccessMsg('Funcionário removido com sucesso.');
        fetchData();
      }
    } catch (err: any) {
      setErrorMsg('Erro ao remover funcionário.');
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) || 
    emp.role.toLowerCase().includes(search.toLowerCase()) ||
    emp.department?.toLowerCase().includes(search.toLowerCase())
  );

  if (activeSubTab === 'SCHEDULE') {
    return <EmployeeScheduleManager onNavigateToTeam={() => setActiveSubTab('EMPLOYEES')} />;
  }

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-widest mb-1">
              <Users className="w-4 h-4" />
              <span>Recursos Humanos & Gestão de Pessoal</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              Gestão de Equipe & Colaboradores
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Gerencie o cadastro operacional, cargos, comissões e disponibilidade da sua equipe
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSubTab('SCHEDULE')}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider px-4 py-3 rounded-2xl transition-all shadow-md flex items-center gap-2 shrink-0"
            >
              <Calendar className="w-4 h-4" />
              Ver Escala de Trabalho
            </button>

            <button
              onClick={() => {
                setForm(INITIAL_FORM);
                setIsModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-2xl transition-all shadow-md flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Novo Funcionário
            </button>
          </div>
        </div>

        {/* SubTab Switcher */}
        <div className="flex items-center gap-2 bg-slate-200/80 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setActiveSubTab('EMPLOYEES')}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all bg-white text-slate-900 shadow-sm"
          >
            <Users className="w-4 h-4 text-indigo-500" />
            Colaboradores Cadastrados ({employees.length})
          </button>
          <button
            onClick={() => setActiveSubTab('SCHEDULE')}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all text-slate-600 hover:text-slate-900"
          >
            <Calendar className="w-4 h-4 text-teal-600" />
            Escala & Turnos Semanais
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, cargo ou departamento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="ml-auto p-1 hover:bg-emerald-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-auto p-1 hover:bg-rose-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Employees Grid/List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
              <Clock className="w-10 h-10 animate-pulse text-indigo-400" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Carregando Equipe...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-500">Nenhum funcionário encontrado.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-xs font-black uppercase text-indigo-600 hover:underline"
              >
                Cadastrar Primeiro Funcionário
              </button>
            </div>
          ) : (
            filteredEmployees.map(emp => (
              <div key={emp.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-200 transition-all">
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 leading-tight">{emp.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {emp.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setForm({
                            id: emp.id,
                            userId: emp.userId,
                            name: emp.name,
                            email: emp.email || '',
                            registrationNumber: emp.registrationNumber || '',
                            role: emp.role,
                            department: emp.department || '',
                            branchId: emp.branchId || '',
                            status: emp.status,
                            pulseStatus: emp.pulseStatus,
                            commissionRate: emp.commissionRate,
                            admissionDate: emp.admissionDate || ''
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.id, emp.name)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-slate-50 rounded-2xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Cargo</p>
                      <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Briefcase className="w-3 h-3 text-indigo-400" />
                        {emp.role}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Departamento</p>
                      <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-slate-400" />
                        {emp.department || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-50 mt-2">
                    {emp.email && (
                      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-slate-300" />
                        {emp.email}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-300" />
                      {branches?.find((b: Branch) => b.id === emp.branchId)?.name || 'Filial não vinculada'}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                      <Smartphone className="w-3.5 h-3.5 text-slate-300" />
                      Status Pulse: 
                      <span className={`font-black ${
                        emp.pulseStatus === 'AVAILABLE' ? 'text-emerald-500' :
                        emp.pulseStatus === 'BUSY' ? 'text-amber-500' : 'text-slate-400'
                      }`}>
                        {emp.pulseStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal: Cadastro/Edição */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  {form.id ? <Edit2 className="w-5 h-5 text-indigo-500" /> : <UserPlus className="w-5 h-5 text-indigo-500" />}
                  {form.id ? 'Editar Funcionário' : 'Novo Cadastro de Funcionário'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                
                {/* Seção 1: Dados Básicos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      placeholder="Ex: João Silva"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> E-mail (Opcional)
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      placeholder="joao@empresa.com.br"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" /> Matrícula / ID Interno
                    </label>
                    <input
                      type="text"
                      value={form.registrationNumber}
                      onChange={e => setForm({...form, registrationNumber: e.target.value})}
                      placeholder="Ex: FUNC-001"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Data de Admissão
                    </label>
                    <input
                      type="date"
                      value={form.admissionDate}
                      onChange={e => setForm({...form, admissionDate: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Seção 2: Atribuição Operacional */}
                <div className="p-5 bg-slate-50 rounded-3xl space-y-4 border border-slate-100">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Atribuição & Operação
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">Cargo / Função Principal</label>
                      <select
                        required
                        value={form.role}
                        onChange={e => setForm({...form, role: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value="">Selecionar Cargo...</option>
                        <option value="Gerente">Gerente</option>
                        <option value="Operador de Caixa">Operador de Caixa</option>
                        <option value="Vendedor">Vendedor</option>
                        <option value="Garçom / Atendente">Garçom / Atendente</option>
                        <option value="Estoquista">Estoquista</option>
                        <option value="Copeiro / Barman">Copeiro / Barman</option>
                        <option value="Técnico / Especialista">Técnico / Especialista</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">Departamento</label>
                      <select
                        value={form.department}
                        onChange={e => setForm({...form, department: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value="">Selecionar Departamento...</option>
                        <option value="Vendas">Vendas</option>
                        <option value="Operacional">Operacional</option>
                        <option value="Administrativo">Administrativo</option>
                        <option value="Estoque">Estoque</option>
                        <option value="Atendimento">Atendimento</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">Filial de Alocação</label>
                      <select
                        required
                        value={form.branchId}
                        onChange={e => setForm({...form, branchId: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        <option value="">Selecionar Filial...</option>
                        {branches?.map((b: Branch) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">Comissão (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.commissionRate}
                        onChange={e => setForm({...form, commissionRate: Number(e.target.value)})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 3: Status & Pulse */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">Status de Cadastro</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({...form, status: 'ACTIVE'})}
                        className={`flex-1 py-2.5 rounded-2xl text-xs font-black transition-all border ${
                          form.status === 'ACTIVE' 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        ATIVO
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({...form, status: 'INACTIVE'})}
                        className={`flex-1 py-2.5 rounded-2xl text-xs font-black transition-all border ${
                          form.status === 'INACTIVE' 
                            ? 'bg-rose-100 text-rose-800 border-rose-300' 
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        INATIVO
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">Disponibilidade Pulse</label>
                    <select
                      value={form.pulseStatus}
                      onChange={e => setForm({...form, pulseStatus: e.target.value as EmployeePulseStatus})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value="AVAILABLE">DISPONÍVEL</option>
                      <option value="BUSY">OCUPADO</option>
                      <option value="OFFLINE">OFFLINE</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-xs font-black uppercase text-slate-500 hover:text-slate-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider px-8 py-3 rounded-2xl transition-all shadow-lg flex items-center gap-2"
                  >
                    {submitting ? 'Salvando...' : 'Salvar Funcionário'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
