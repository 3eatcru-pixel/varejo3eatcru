import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where 
} from 'firebase/firestore';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Tag, 
  X,
  Filter,
  ShieldAlert,
  Download
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { FinancialRecord, RecordType, RecordStatus, UserProfile, CompanyRole } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { logAuditEvent } from '../../lib/auditLogger';
import { hasPermission } from '../../lib/permissions';
import { createFinancialRecord, updateFinancialRecord, deleteFinancialRecord, processPaymentReceipt } from '../../services/FinancialService';
import { useToast } from '../../components/Toast';

interface FinancialManagerProps {
  user: UserProfile;
  initialTab?: 'ALL' | 'RECEIVABLE' | 'PAYABLE';
}

export default function FinancialManager({ user, initialTab = 'ALL' }: FinancialManagerProps) {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'RECEIVABLE' | 'PAYABLE'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RecordStatus>('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);

  // Form State
  const [type, setType] = useState<RecordType>(RecordType.RECEIVABLE);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('Vendas');
  const [entityName, setEntityName] = useState('');
  const [status, setStatus] = useState<RecordStatus>(RecordStatus.PENDING);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const companyId = user.companyId || '';
  const canManageFinance = hasPermission(user, 'manageFinancial') || user.role === CompanyRole.ADMIN || user.role === CompanyRole.MANAGER;

  useEffect(() => {
    const q = query(
      collection(db, 'financial_records'),
      where('companyId', '==', companyId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as FinancialRecord))
        .sort((a, b) => {
          const dA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const dB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return dA - dB;
        });
      setRecords(data);
    }, (err) => {
      console.warn('Erro ao carregar registros financeiros:', err);
    });
    return () => unsubscribe();
  }, [companyId]);

  const handleOpenModal = (rec?: FinancialRecord) => {
    if (rec) {
      setEditingRecord(rec);
      setType(rec.type);
      setDescription(rec.description);
      setAmount(rec.amount.toString());
      setDueDate(rec.dueDate);
      setCategory(rec.category);
      setEntityName(rec.entityName || '');
      setStatus(rec.status);
      setNotes(rec.notes || '');
    } else {
      setEditingRecord(null);
      setType(RecordType.RECEIVABLE);
      setDescription('');
      setAmount('');
      setDueDate(new Date().toISOString().split('T')[0]);
      setCategory('Vendas');
      setEntityName('');
      setStatus(RecordStatus.PENDING);
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageFinance) {
      showError('Acesso negado. Você não tem permissão para lançamentos financeiros.', 'Acesso Negado');
      return;
    }
    if (!description.trim() || !amount || !dueDate) {
      showWarning("Preencha todos os campos obrigatórios (descrição, valor e vencimento).", "Campos Obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      const parsedAmount = parseFloat(amount) || 0;
      const payload: Partial<FinancialRecord> = {
        type,
        description,
        amount: parsedAmount,
        dueDate,
        category,
        entityName,
        status,
        notes,
      };

      if (editingRecord) {
        await updateFinancialRecord(editingRecord.id, payload, user);
        showSuccess('Lançamento financeiro atualizado com sucesso!', 'Atualizado');
      } else {
        await createFinancialRecord(payload, user);
        showSuccess('Novo lançamento financeiro registrado com sucesso!', 'Registrado');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar registro financeiro:", err);
      showError("Erro ao salvar lançamento financeiro.", "Erro");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (record: FinancialRecord) => {
    const newStatus = record.status === RecordStatus.PAID ? RecordStatus.PENDING : RecordStatus.PAID;
    try {
      if (newStatus === RecordStatus.PAID) {
        await processPaymentReceipt(record, user);
        showSuccess(`Lançamento baixado como Pago!`, 'Baixa Concluída');
      } else {
        await updateFinancialRecord(record.id, {
          status: newStatus,
          paymentDate: undefined
        }, user);
        showInfo(`Lançamento reaberto como Pendente.`, 'Status Alterado');
      }
    } catch (err) {
      console.error("Erro ao alterar status:", err);
      showError("Falha ao alterar o status do lançamento financeiro.", "Erro");
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManageFinance) {
      showError('Acesso negado. Você não tem permissão para excluir registros.', 'Acesso Negado');
      return;
    }
    if (confirm("Remover este lançamento financeiro?")) {
      try {
        await deleteFinancialRecord(id, user);
        showSuccess("Lançamento financeiro excluído com sucesso.", "Exclusão Concluída");
      } catch (err) {
        console.error("Erro ao deletar:", err);
        showError("Erro ao excluir lançamento financeiro.", "Erro");
      }
    }
  };

  // Calculations
  const totalReceivable = records
    .filter(r => r.type === RecordType.RECEIVABLE && r.status === RecordStatus.PENDING)
    .reduce((a, b) => a + b.amount, 0);

  const totalPayable = records
    .filter(r => r.type === RecordType.PAYABLE && r.status === RecordStatus.PENDING)
    .reduce((a, b) => a + b.amount, 0);

  const totalPaidReceivable = records
    .filter(r => r.type === RecordType.RECEIVABLE && r.status === RecordStatus.PAID)
    .reduce((a, b) => a + b.amount, 0);

  const totalPaidPayable = records
    .filter(r => r.type === RecordType.PAYABLE && r.status === RecordStatus.PAID)
    .reduce((a, b) => a + b.amount, 0);

  const netBalance = totalPaidReceivable - totalPaidPayable;

  const filtered = records.filter(r => {
    const matchesTab = activeTab === 'ALL' || r.type === activeTab;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesSearch = 
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.entityName && r.entityName.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesTab && matchesStatus && matchesSearch;
  });

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showWarning('Nenhum registro para exportar com os filtros atuais.', 'Exportação');
      return;
    }

    const headers = ['Tipo', 'Descrição', 'Valor (R$)', 'Vencimento', 'Categoria', 'Entidade / Favorecido', 'Status', 'Observações'];
    const rows = filtered.map(r => [
      r.type === RecordType.RECEIVABLE ? 'A RECEBER' : 'A PAGAR',
      r.description,
      r.amount.toFixed(2),
      r.dueDate ? new Date(r.dueDate).toLocaleDateString('pt-BR') : '',
      r.category,
      r.entityName || '',
      r.status === RecordStatus.PAID ? 'LIQUIDADO/PAGO' : r.status === RecordStatus.PENDING ? 'PENDENTE' : 'CANCELADO',
      r.notes || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Financeiro_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Relatório financeiro exportado com sucesso!', 'Exportação CSV');
  };

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            <span>Gestão Financeira & Fluxo de Caixa</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Contas a pagar, contas a receber, vencimentos e conciliação financeira
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Saldo Líquido Realizado</span>
          <p className={`text-xl font-black ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(netBalance)}
          </p>
          <span className="text-[10px] text-slate-400 block pt-1">Recebidos - Pagos</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Contas a Receber (Pendente)
          </span>
          <p className="text-xl font-black text-slate-900">{formatCurrency(totalReceivable)}</p>
          <span className="text-[10px] text-slate-400 block pt-1">Previsto em entradas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Contas a Pagar (Pendente)
          </span>
          <p className="text-xl font-black text-slate-900">{formatCurrency(totalPayable)}</p>
          <span className="text-[10px] text-slate-400 block pt-1">Previsto em saídas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Entradas Concluídas</span>
          <p className="text-xl font-black text-blue-600">{formatCurrency(totalPaidReceivable)}</p>
          <span className="text-[10px] text-slate-400 block pt-1">Já compensadas</span>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
              activeTab === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveTab('RECEIVABLE')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
              activeTab === 'RECEIVABLE' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            A Receber
          </button>
          <button
            onClick={() => setActiveTab('PAYABLE')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
              activeTab === 'PAYABLE' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            A Pagar
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar lançamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
          >
            <option value="ALL">Status: Todos</option>
            <option value={RecordStatus.PENDING}>Pendentes</option>
            <option value={RecordStatus.PAID}>Pagas / Liquidadas</option>
            <option value={RecordStatus.OVERDUE}>Vencidas</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
              <th className="py-3 px-3">Tipo</th>
              <th className="py-3 px-3">Descrição / Cliente / Fornecedor</th>
              <th className="py-3 px-3">Categoria</th>
              <th className="py-3 px-3">Vencimento</th>
              <th className="py-3 px-3">Valor</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  Nenhum lançamento financeiro encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-3">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                      r.type === RecordType.RECEIVABLE ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {r.type === RecordType.RECEIVABLE ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {r.type === RecordType.RECEIVABLE ? 'A Receber' : 'A Pagar'}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <p className="font-black text-slate-900 uppercase">{r.description}</p>
                    {r.entityName && <p className="text-[10px] text-slate-400 font-bold">{r.entityName}</p>}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-slate-500">{r.category}</td>
                  <td className="py-3.5 px-3 font-bold text-slate-700">
                    {r.dueDate ? new Date(r.dueDate).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className={`py-3.5 px-3 font-black text-sm ${r.type === RecordType.RECEIVABLE ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(r.amount)}
                  </td>
                  <td className="py-3.5 px-3">
                    <button
                      onClick={() => toggleStatus(r)}
                      className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full transition-all ${
                        r.status === RecordStatus.PAID
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                    >
                      {r.status === RecordStatus.PAID ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Liquidado</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pendente</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(r)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold uppercase"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[10px] font-bold uppercase"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
              {editingRecord ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Tipo de Operação *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType(RecordType.RECEIVABLE)}
                    className={`p-2.5 rounded-xl font-black text-xs uppercase transition-all ${
                      type === RecordType.RECEIVABLE ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Contas a Receber
                  </button>
                  <button
                    type="button"
                    onClick={() => setType(RecordType.PAYABLE)}
                    className={`p-2.5 rounded-xl font-black text-xs uppercase transition-all ${
                      type === RecordType.PAYABLE ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Contas a Pagar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Descrição do Lançamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel da Loja / Compra de Estoque / Duplicata"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="Vendas">Vendas / Faturamento</option>
                    <option value="Fornecedores">Fornecedores / Mercadorias</option>
                    <option value="Aluguel">Aluguel & Condomínio</option>
                    <option value="Serviços">Energia / Água / Internet</option>
                    <option value="Pessoal">Folha de Pagamento / Salários</option>
                    <option value="Impostos">Impostos / Tributos</option>
                    <option value="Outros">Outros Lançamentos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Cliente / Fornecedor
                  </label>
                  <input
                    type="text"
                    placeholder="Nome da pessoa/empresa"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Status de Liquidação
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as RecordStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value={RecordStatus.PENDING}>Pendente</option>
                  <option value={RecordStatus.PAID}>Liquidado / Pago</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  {submitting ? 'Salvar...' : 'Salvar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
