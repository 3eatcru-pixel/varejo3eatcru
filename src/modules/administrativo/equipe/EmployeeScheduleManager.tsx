import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Sparkles, 
  Printer, 
  Filter, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Coffee, 
  Sun, 
  Moon, 
  Briefcase, 
  Building2, 
  X, 
  ArrowRightLeft, 
  ShieldCheck, 
  Search,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/Toast';

export interface ScheduleItem {
  id: string;
  companyId: string;
  employeeId: string;
  branchId?: string | null;
  dayOfWeek: number; // 0: Domingo ... 6: Sábado
  shiftDate?: string | null;
  shiftType: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  employeeName: string;
  employeeRole: string;
  employeeDepartment?: string | null;
  employeeAvatar?: string | null;
  branchName?: string | null;
}

export interface EmployeeBrief {
  id: string;
  name: string;
  role: string;
  department?: string;
  branchId?: string;
  status: string;
  registrationNumber?: string;
}

export interface BranchBrief {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

const DAYS_OF_WEEK = [
  { day: 0, label: 'Domingo', short: 'DOM' },
  { day: 1, label: 'Segunda-feira', short: 'SEG' },
  { day: 2, label: 'Terça-feira', short: 'TER' },
  { day: 3, label: 'Quarta-feira', short: 'QUA' },
  { day: 4, label: 'Quinta-feira', short: 'QUI' },
  { day: 5, label: 'Sexta-feira', short: 'SEX' },
  { day: 6, label: 'Sábado', short: 'SÁB' },
];

const SHIFT_TYPE_PRESETS = [
  { id: 'PADRAO_6X1', label: 'Escala 6x1 Comercial (08:00 - 17:00)', start: '08:00', end: '17:00', break: 60, off: [0] },
  { id: 'PADRAO_5X2', label: 'Escala 5x2 Escritório (08:00 - 18:00)', start: '08:00', end: '18:00', break: 60, off: [0, 6] },
  { id: 'MANHA', label: 'Turno Matutino (07:00 - 15:20)', start: '07:00', end: '15:20', break: 60, off: [0] },
  { id: 'TARDE', label: 'Turno Vespertino / Fechamento (13:40 - 22:00)', start: '13:40', end: '22:00', break: 60, off: [0] },
  { id: 'PLANTAO_12X36', label: 'Plantão 12x36 (07:00 - 19:00)', start: '07:00', end: '19:00', break: 60, off: [0, 2, 4] },
];

export default function EmployeeScheduleManager({ onNavigateToTeam }: { onNavigateToTeam?: () => void }) {
  const { userProfile } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeBrief[]>([]);
  const [branches, setBranches] = useState<BranchBrief[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ScheduleItem | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Single Shift Form
  const [shiftEmployeeId, setShiftEmployeeId] = useState('');
  const [shiftBranchId, setShiftBranchId] = useState('');
  const [shiftDayOfWeek, setShiftDayOfWeek] = useState(1);
  const [shiftType, setShiftType] = useState('PADRAO');
  const [shiftStartTime, setShiftStartTime] = useState('08:00');
  const [shiftEndTime, setShiftEndTime] = useState('17:00');
  const [shiftBreakMinutes, setShiftBreakMinutes] = useState(60);
  const [shiftStatus, setShiftStatus] = useState('SCHEDULED');
  const [shiftNotes, setShiftNotes] = useState('');
  const [savingShift, setSavingShift] = useState(false);

  // Auto-Generator Wizard Form
  const [wizardTemplate, setWizardTemplate] = useState('PADRAO_6X1');
  const [wizardSelectedEmployees, setWizardSelectedEmployees] = useState<string[]>([]);
  const [wizardStartTime, setWizardStartTime] = useState('08:00');
  const [wizardEndTime, setWizardEndTime] = useState('17:00');
  const [wizardBreakMinutes, setWizardBreakMinutes] = useState(60);
  const [wizardOffDays, setWizardOffDays] = useState<number[]>([0]);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resSch, resEmp, resBr] = await Promise.all([
        fetch('/api/employees/schedules', { headers }),
        fetch('/api/employees', { headers }),
        fetch('/api/account/branches', { headers })
      ]);

      if (resSch.ok) {
        const dataSch = await resSch.json();
        setSchedules(dataSch.schedules || []);
      }
      if (resEmp.ok) {
        const dataEmp = await resEmp.json();
        const empList: EmployeeBrief[] = (dataEmp.employees || []).filter((e: any) => e.status === 'ACTIVE');
        setEmployees(empList);
        setWizardSelectedEmployees(empList.map(e => e.id));
      }
      if (resBr.ok) {
        const dataBr = await resBr.json();
        setBranches(dataBr.branches || []);
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados da escala:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(item => {
      if (selectedBranch !== 'ALL' && item.branchId !== selectedBranch) return false;
      if (selectedDepartment !== 'ALL' && item.employeeDepartment !== selectedDepartment) return false;
      if (selectedEmployee !== 'ALL' && item.employeeId !== selectedEmployee) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = item.employeeName.toLowerCase().includes(query);
        const matchRole = item.employeeRole.toLowerCase().includes(query);
        const matchNotes = item.notes?.toLowerCase().includes(query);
        if (!matchName && !matchRole && !matchNotes) return false;
      }
      return true;
    });
  }, [schedules, selectedBranch, selectedDepartment, selectedEmployee, searchTerm]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalShifts = filteredSchedules.length;
    const offShifts = filteredSchedules.filter(s => s.shiftType === 'FOLGA' || s.status === 'FOLGA').length;
    const workingShifts = filteredSchedules.filter(s => s.shiftType !== 'FOLGA' && s.status !== 'FOLGA');
    
    // Calculate total hours scheduled
    let totalWeeklyMinutes = 0;
    workingShifts.forEach(s => {
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      if (!isNaN(startH) && !isNaN(endH)) {
        let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        if (diffMinutes < 0) diffMinutes += 24 * 60; // night shifts
        diffMinutes -= (s.breakMinutes || 0);
        if (diffMinutes > 0) totalWeeklyMinutes += diffMinutes;
      }
    });

    const totalHours = (totalWeeklyMinutes / 60).toFixed(1);
    const uniqueEmployeesScheduled = new Set(filteredSchedules.map(s => s.employeeId)).size;

    return {
      totalHours,
      totalShifts,
      offShifts,
      uniqueEmployeesScheduled
    };
  }, [filteredSchedules]);

  // Open Single Shift Modal for creation or edit
  const handleOpenShiftModal = (shift?: ScheduleItem, defaultDay?: number) => {
    if (shift) {
      setEditingShift(shift);
      setShiftEmployeeId(shift.employeeId);
      setShiftBranchId(shift.branchId || '');
      setShiftDayOfWeek(shift.dayOfWeek);
      setShiftType(shift.shiftType);
      setShiftStartTime(shift.startTime);
      setShiftEndTime(shift.endTime);
      setShiftBreakMinutes(shift.breakMinutes);
      setShiftStatus(shift.status);
      setShiftNotes(shift.notes || '');
    } else {
      setEditingShift(null);
      setShiftEmployeeId(employees[0]?.id || '');
      setShiftBranchId(branches[0]?.id || '');
      setShiftDayOfWeek(defaultDay !== undefined ? defaultDay : 1);
      setShiftType('PADRAO');
      setShiftStartTime('08:00');
      setShiftEndTime('17:00');
      setShiftBreakMinutes(60);
      setShiftStatus('SCHEDULED');
      setShiftNotes('');
    }
    setIsShiftModalOpen(true);
  };

  // Save Single Shift
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftEmployeeId) {
      showWarning('Selecione um funcionário cadastrado.', 'Validação');
      return;
    }

    setSavingShift(true);
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const payload = {
        id: editingShift?.id || undefined,
        employeeId: shiftEmployeeId,
        branchId: shiftBranchId || null,
        dayOfWeek: shiftDayOfWeek,
        shiftType,
        startTime: shiftType === 'FOLGA' ? '00:00' : shiftStartTime,
        endTime: shiftType === 'FOLGA' ? '00:00' : shiftEndTime,
        breakMinutes: shiftType === 'FOLGA' ? 0 : Number(shiftBreakMinutes) || 0,
        status: shiftType === 'FOLGA' ? 'FOLGA' : shiftStatus,
        notes: shiftNotes.trim() || null
      };

      const res = await fetch('/api/employees/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(data.message || 'Turno salvo com sucesso!', 'Escala Atualizada');
        setIsShiftModalOpen(false);
        fetchData();
      } else {
        throw new Error(data.error || 'Falha ao salvar turno da escala.');
      }
    } catch (err: any) {
      showError(err.message, 'Erro na Escala');
    } finally {
      setSavingShift(false);
    }
  };

  // Delete Single Shift
  const handleDeleteShift = async (id: string, empName: string) => {
    if (!confirm(`Deseja remover este turno de ${empName} da escala?`)) return;

    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch(`/api/employees/schedules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess('Turno removido da escala.', 'Escala Atualizada');
        fetchData();
      } else {
        throw new Error(data.error || 'Erro ao excluir turno.');
      }
    } catch (err: any) {
      showError(err.message, 'Erro ao Excluir');
    }
  };

  // Toggle quick Folga / Presença
  const handleToggleFolga = async (shift: ScheduleItem) => {
    const isNowFolga = shift.shiftType !== 'FOLGA';
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch(`/api/employees/schedules/${shift.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: isNowFolga ? 'FOLGA' : 'SCHEDULED',
          shiftType: isNowFolga ? 'FOLGA' : 'PADRAO'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`Turno alterado para ${isNowFolga ? 'FOLGA' : 'ATIVO'}.`, 'Atualização Rápida');
        fetchData();
      }
    } catch (err: any) {
      showError(err.message, 'Erro ao Atualizar');
    }
  };

  // Apply template in auto generator
  const handleTemplateChange = (templateId: string) => {
    setWizardTemplate(templateId);
    const preset = SHIFT_TYPE_PRESETS.find(p => p.id === templateId);
    if (preset) {
      setWizardStartTime(preset.start);
      setWizardEndTime(preset.end);
      setWizardBreakMinutes(preset.break);
      setWizardOffDays(preset.off);
    }
  };

  // Execute Batch Generator
  const handleRunBatchGenerator = async () => {
    if (wizardSelectedEmployees.length === 0) {
      showWarning('Selecione ao menos um colaborador.', 'Aviso');
      return;
    }

    setGenerating(true);
    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const payload = {
        employeeIds: wizardSelectedEmployees,
        templateType: wizardTemplate,
        defaultStartTime: wizardStartTime,
        defaultEndTime: wizardEndTime,
        breakMinutes: wizardBreakMinutes,
        offDays: wizardOffDays
      };

      const res = await fetch('/api/employees/schedules/batch-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(data.message, 'Gerador de Escala Concluído');
        setIsWizardOpen(false);
        fetchData();
      } else {
        throw new Error(data.error || 'Erro na geração em lote da escala.');
      }
    } catch (err: any) {
      showError(err.message, 'Erro no Gerador');
    } finally {
      setGenerating(false);
    }
  };

  const getShiftBadgeColor = (type: string, status: string) => {
    if (type === 'FOLGA' || status === 'FOLGA') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (type === 'FERIAS' || status === 'FERIAS') {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (type.includes('MANHA')) {
      return 'bg-sky-50 text-sky-700 border-sky-200';
    }
    if (type.includes('TARDE')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    if (type.includes('NOITE')) {
      return 'bg-slate-800 text-emerald-400 border-slate-700';
    }
    if (type.includes('12X36')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700/50">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-black uppercase tracking-widest mb-1">
            <Calendar className="w-4 h-4" />
            <span>Recursos Humanos & Gestão de Pessoal • VarejoPro</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Escala de Trabalho dos Funcionários Registrados
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Planejamento semanal de turnos, controle de folgas (DSR), horários de almoço e escala da equipe registrada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {onNavigateToTeam && (
            <button
              onClick={onNavigateToTeam}
              className="px-4 py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-600 transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-blue-400" />
              <span>Ver Cadastro de Equipe</span>
            </button>
          )}

          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-3 min-h-[44px] bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Gerar Escala Automática</span>
          </button>

          <button
            onClick={() => handleOpenShiftModal()}
            className="px-4 py-3 min-h-[44px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Turno</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
            <span>Colaboradores Escalados</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{kpis.uniqueEmployeesScheduled} / {employees.length}</p>
          <span className="text-[10px] font-bold text-slate-500">Funcionários com escala ativa</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
            <span>Horas Totais na Semana</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{kpis.totalHours}h</p>
          <span className="text-[10px] font-bold text-slate-500">Carga horária semanal planejada</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
            <span>Folgas Programadas</span>
            <Coffee className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{kpis.offShifts}</p>
          <span className="text-[10px] font-bold text-slate-500">Folgas / DSRs na semana</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase tracking-wider">
            <span>Total de Turnos</span>
            <Calendar className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{kpis.totalShifts}</p>
          <span className="text-[10px] font-bold text-slate-500">Turnos distribuídos na grade</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar colaborador ou cargo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Branch Filter */}
          {branches.length > 0 && (
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Todas as Filiais ({branches.length})</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          {/* Department Filter */}
          {departments.length > 0 && (
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">Todos os Departamentos</option>
              {departments.map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          )}

          {/* Employee Filter */}
          <select
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
          >
            <option value="ALL">Todos os Colaboradores ({employees.length})</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full md:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Printer className="w-4 h-4 text-teal-400" />
          <span>Imprimir Escala do Mural</span>
        </button>
      </div>

      {/* Weekly Schedule Grid (Domingo a Sábado) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                Grade Semanal de Trabalho
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Distribuição de horários por dia da semana para todos os funcionários
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs font-bold flex flex-col items-center gap-3">
            <Clock className="w-8 h-8 animate-spin text-teal-500" />
            <span>Carregando escala dos funcionários...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {DAYS_OF_WEEK.map(({ day, label, short }) => {
              const dayShifts = filteredSchedules.filter(s => s.dayOfWeek === day);
              const isWeekend = day === 0 || day === 6;

              return (
                <div 
                  key={day} 
                  className={`rounded-2xl border flex flex-col min-h-[350px] overflow-hidden ${
                    isWeekend ? 'bg-slate-50/70 border-slate-200' : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Day Header */}
                  <div className={`p-3 border-b flex items-center justify-between ${
                    isWeekend ? 'bg-slate-100/80 border-slate-200 text-slate-700' : 'bg-slate-900 text-white border-slate-800'
                  }`}>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider block">
                        {label}
                      </span>
                      <span className={`text-[9px] font-bold ${isWeekend ? 'text-slate-400' : 'text-teal-400'}`}>
                        {dayShifts.length} {dayShifts.length === 1 ? 'colaborador' : 'colaboradores'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenShiftModal(undefined, day)}
                      title={`Adicionar turno para ${label}`}
                      className={`p-1 rounded-lg transition-colors ${
                        isWeekend ? 'bg-white hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-teal-400'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Day Shift Cards */}
                  <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[500px]">
                    {dayShifts.length === 0 ? (
                      <div className="py-12 text-center text-slate-300 text-[11px] font-medium">
                        Nenhum turno
                      </div>
                    ) : (
                      dayShifts.map(shift => {
                        const isFolga = shift.shiftType === 'FOLGA' || shift.status === 'FOLGA';
                        const badgeColor = getShiftBadgeColor(shift.shiftType, shift.status);

                        return (
                          <div
                            key={shift.id}
                            className={`p-2.5 rounded-xl border transition-all text-xs space-y-1.5 shadow-sm hover:shadow ${badgeColor}`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <p className="font-black text-slate-900 truncate text-[11px]">
                                  {shift.employeeName}
                                </p>
                                <p className="text-[9px] text-slate-500 font-bold truncate">
                                  {shift.employeeRole} {shift.employeeDepartment ? `• ${shift.employeeDepartment}` : ''}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleOpenShiftModal(shift)}
                                  title="Editar turno"
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteShift(shift.id, shift.employeeName)}
                                  title="Remover turno"
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Hours and Break */}
                            {isFolga ? (
                              <div className="flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">
                                <Coffee className="w-3 h-3" />
                                <span>FOLGA SEMANAL</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-[10px] font-black text-slate-700 bg-white/70 px-2 py-1 rounded-md border border-slate-100">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-teal-600" />
                                  {shift.startTime} - {shift.endTime}
                                </span>
                                {shift.breakMinutes > 0 && (
                                  <span className="text-[9px] font-bold text-slate-400">
                                    Int: {shift.breakMinutes}m
                                  </span>
                                )}
                              </div>
                            )}

                            {shift.notes && (
                              <p className="text-[9px] text-slate-500 italic truncate" title={shift.notes}>
                                "{shift.notes}"
                              </p>
                            )}

                            {/* Quick Action Button */}
                            <button
                              onClick={() => handleToggleFolga(shift)}
                              className={`w-full py-1 text-[9px] font-black uppercase rounded tracking-wider transition-all text-center ${
                                isFolga 
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                  : 'bg-slate-200/80 hover:bg-amber-100 hover:text-amber-800 text-slate-600'
                              }`}
                            >
                              {isFolga ? 'Tornar Dia Ativo' : 'Marcar Folga'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Single Shift Create/Edit */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                    {editingShift ? 'Editar Turno da Escala' : 'Adicionar Turno à Escala'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Defina horários e intervalos de trabalho</p>
                </div>
              </div>
              <button onClick={() => setIsShiftModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-4">
              {/* Employee Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Colaborador Registrado *
                </label>
                <select
                  required
                  value={shiftEmployeeId}
                  onChange={e => setShiftEmployeeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
                >
                  <option value="">Selecione o funcionário...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.role} {emp.department ? `(${emp.department})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day of week & Shift Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Dia da Semana *
                  </label>
                  <select
                    value={shiftDayOfWeek}
                    onChange={e => setShiftDayOfWeek(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d.day} value={d.day}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Tipo de Turno *
                  </label>
                  <select
                    value={shiftType}
                    onChange={e => setShiftType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
                  >
                    <option value="PADRAO">Turno Regular (Comercial)</option>
                    <option value="MANHA">Turno Matutino</option>
                    <option value="TARDE">Turno Vespertino / Noite</option>
                    <option value="PLANTAO_12X36">Plantão 12x36</option>
                    <option value="FOLGA">Folga Semanal / DSR</option>
                    <option value="FERIAS">Férias</option>
                    <option value="EXTRA">Hora Extra / Plantão</option>
                  </select>
                </div>
              </div>

              {/* Times (Only if not FOLGA or FERIAS) */}
              {shiftType !== 'FOLGA' && shiftType !== 'FERIAS' && (
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Entrada *</label>
                    <input
                      type="time"
                      required
                      value={shiftStartTime}
                      onChange={e => setShiftStartTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Saída *</label>
                    <input
                      type="time"
                      required
                      value={shiftEndTime}
                      onChange={e => setShiftEndTime(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Intervalo (min)</label>
                    <input
                      type="number"
                      min="0"
                      step="15"
                      value={shiftBreakMinutes}
                      onChange={e => setShiftBreakMinutes(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Branch select if multiple branches exist */}
              {branches.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Unidade / Filial de Lotação
                  </label>
                  <select
                    value={shiftBranchId}
                    onChange={e => setShiftBranchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
                  >
                    <option value="">Matriz Principal</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Observações / Instruções do Turno
                </label>
                <input
                  type="text"
                  placeholder="Ex: Responsável pela abertura do caixa / escala de sábado"
                  value={shiftNotes}
                  onChange={e => setShiftNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingShift}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingShift ? 'Salvando...' : 'Salvar Turno'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Auto Scale Generator Wizard */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                    Gerador Automático de Escala
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Preencha a grade semanal de múltiplos colaboradores com 1 clique
                  </p>
                </div>
              </div>
              <button onClick={() => setIsWizardOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Template Preset Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Selecione o Modelo de Escala *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SHIFT_TYPE_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleTemplateChange(preset.id)}
                      className={`p-3 text-left rounded-xl border text-xs transition-all ${
                        wizardTemplate === preset.id
                          ? 'border-teal-500 bg-teal-50/50 text-teal-950 font-black ring-2 ring-teal-500/20'
                          : 'border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100'
                      }`}
                    >
                      <p className="font-black text-slate-900">{preset.label}</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Horário: {preset.start} às {preset.end}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hours override */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Entrada</label>
                  <input
                    type="time"
                    value={wizardStartTime}
                    onChange={e => setWizardStartTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Saída</label>
                  <input
                    type="time"
                    value={wizardEndTime}
                    onChange={e => setWizardEndTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">Intervalo (min)</label>
                  <input
                    type="number"
                    min="0"
                    step="15"
                    value={wizardBreakMinutes}
                    onChange={e => setWizardBreakMinutes(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Off Days (Folgas) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Dias de Folga (DSR) Programados
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(d => {
                    const isSelected = wizardOffDays.includes(d.day);
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setWizardOffDays(wizardOffDays.filter(x => x !== d.day));
                          } else {
                            setWizardOffDays([...wizardOffDays, d.day]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d.short} {isSelected ? '✓ Folga' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Employees Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Colaboradores Selecionados ({wizardSelectedEmployees.length} / {employees.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardSelectedEmployees.length === employees.length) {
                        setWizardSelectedEmployees([]);
                      } else {
                        setWizardSelectedEmployees(employees.map(e => e.id));
                      }
                    }}
                    className="text-[10px] font-black text-teal-600 hover:underline uppercase"
                  >
                    {wizardSelectedEmployees.length === employees.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-2xl p-2 divide-y divide-slate-100 bg-slate-50">
                  {employees.map(emp => {
                    const checked = wizardSelectedEmployees.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center gap-3 py-2 px-2 hover:bg-white rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            if (e.target.checked) {
                              setWizardSelectedEmployees([...wizardSelectedEmployees, emp.id]);
                            } else {
                              setWizardSelectedEmployees(wizardSelectedEmployees.filter(id => id !== emp.id));
                            }
                          }}
                          className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-slate-900">{emp.name}</p>
                          <p className="text-[10px] text-slate-500">{emp.role} {emp.department ? `• ${emp.department}` : ''}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRunBatchGenerator}
                  disabled={generating || wizardSelectedEmployees.length === 0}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{generating ? 'Gerando Escala...' : 'Gerar Escala Semanal'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
