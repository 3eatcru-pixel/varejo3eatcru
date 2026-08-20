import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  CreditCard,
  AlertCircle,
  Download,
  Bot
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { Client, UserProfile } from '../../types';
import { createClient, updateClient, deleteClient } from '../../services/ClientService';
import { fetchCnpjDetails, fetchAddressByCep } from '../../services/BrasilApiService';
import { useToast } from '../../components/Toast';
import { formatCurrency } from '../../lib/utils';
import LoyaltyBotSimulatorModal from '../fidelidade/LoyaltyBotSimulatorModal';

export default function ClientsList({ user }: { user?: UserProfile }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [botClient, setBotClient] = useState<Client | null>(null);

  // Form
  const [name, setName] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [isCreditBlocked, setIsCreditBlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);

  const companyId = user?.companyId || '';

  const handleConsultarCnpj = async () => {
    const clean = cpfCnpj.replace(/\D/g, '');
    if (clean.length !== 14) {
      showWarning('A busca automática é válida para CNPJ (14 dígitos). Para CPF informe os dados diretamente.', 'Consulta CNPJ');
      return;
    }

    setSearchingCnpj(true);
    try {
      const data = await fetchCnpjDetails(clean);
      if (data.razaoSocial) setName(data.razaoSocial);
      if (data.telefone && !phone) setPhone(data.telefone);
      if (data.email && !email) setEmail(data.email);
      
      const fullAddr = [
        data.logradouro ? `${data.logradouro}, ${data.numero || 'S/N'}` : '',
        data.bairro || '',
        data.municipio ? `${data.municipio} - ${data.uf}` : '',
        data.cep ? `CEP: ${data.cep}` : ''
      ].filter(Boolean).join(' - ');

      if (fullAddr) setAddress(fullAddr);

      showSuccess(`Dados da empresa '${data.razaoSocial}' preenchidos com sucesso! Situação: ${data.situacaoCadastral}`, 'CNPJ Localizado');
    } catch (err: any) {
      showError(err.message || 'Erro ao consultar CNPJ na base pública.', 'Consulta CNPJ');
    } finally {
      setSearchingCnpj(false);
    }
  };

  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(db, 'clients'), 
      where('companyId', '==', companyId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Client))
        .sort((a, b) => a.name.localeCompare(b.name));
      setClients(data);
    }, (err) => {
      console.warn('Erro ao carregar clientes:', err);
    });
    return () => unsubscribe();
  }, [companyId]);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setName(client.name);
      setCpfCnpj(client.cpfCnpj || '');
      setPhone(client.phone || '');
      setEmail(client.email || '');
      setAddress(client.address || '');
      setNotes(client.notes || '');
      setCreditLimit(client.creditLimit || 0);
      setCreditBalance(client.creditBalance || 0);
      setIsCreditBlocked(!!client.isCreditBlocked);
    } else {
      setEditingClient(null);
      setName('');
      setCpfCnpj('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
      setCreditLimit(0);
      setCreditBalance(0);
      setIsCreditBlocked(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showWarning("O nome do cliente é obrigatório.", "Campo Obrigatório");

    setLoading(true);
    try {
      const payload: Partial<Client> = {
        name,
        cpfCnpj,
        phone,
        email,
        address,
        notes,
        creditLimit: Number(creditLimit) || 0,
        creditBalance: Number(creditBalance) || 0,
        isCreditBlocked,
      };

      if (editingClient) {
        await updateClient(editingClient.id, payload, user!);
        showSuccess(`Cliente ${name} atualizado com sucesso!`, "Cadastro Atualizado");
      } else {
        await createClient(payload, user!);
        showSuccess(`Cliente ${name} cadastrado com sucesso!`, "Cliente Criado");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      showError("Erro ao salvar cadastro do cliente.", "Erro no Servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, clientName: string) => {
    if (confirm(`Deseja realmente remover o cliente '${clientName}'?`)) {
      try {
        await deleteClient(id, user!);
        showSuccess(`Cliente ${clientName} removido.`, "Exclusão Concluída");
      } catch (err) {
        console.error("Erro ao deletar cliente:", err);
        showError("Erro ao remover cliente.", "Erro");
      }
    }
  };

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpfCnpj?.includes(searchTerm) ||
    c.phone?.includes(searchTerm) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showWarning('Nenhum cliente para exportar.', 'Exportação');
      return;
    }

    const headers = ['Nome', 'CPF/CNPJ', 'Telefone', 'E-mail', 'Endereço', 'Limite de Crédito (R$)', 'Saldo Utilizado (R$)', 'Status Crédito', 'Observações'];
    const rows = filtered.map(c => [
      c.name,
      c.cpfCnpj || '',
      c.phone || '',
      c.email || '',
      c.address || '',
      (c.creditLimit || 0).toFixed(2),
      (c.creditBalance || 0).toFixed(2),
      c.isCreditBlocked ? 'BLOQUEADO' : 'LIBERADO',
      c.notes || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Clientes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Lista de clientes exportada com sucesso!', 'Exportação CSV');
  };

  return (
    <div className="flex-1 bg-slate-100 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>Cadastro de Clientes</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Gerencie clientes para identificação de cupons e controle de vendas
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="min-h-[44px] px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="min-h-[44px] px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none text-xs font-bold outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <div key={client.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 uppercase">{client.name}</h3>
                    {client.isCreditBlocked && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-extrabold rounded-full">
                        Bloqueado
                      </span>
                    )}
                  </div>
                  {client.cpfCnpj && (
                    <span className="text-[10px] font-bold text-slate-400 block mt-0.5">CPF/CNPJ: {client.cpfCnpj}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenModal(client)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id, client.name)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Crediário / Limite Info */}
              {(client.creditLimit !== undefined && client.creditLimit > 0) && (
                <div className="mt-2.5 p-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Crediário:</span>
                  </div>
                  <div className="text-right font-black">
                    <span className="text-slate-700">{formatCurrency(client.creditBalance || 0)}</span>
                    <span className="text-slate-400 font-medium text-[10px]"> / {formatCurrency(client.creditLimit)}</span>
                  </div>
                </div>
              )}

              <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBotClient(client)}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <Bot className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chatbot Fidelidade / WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-slate-200 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
              {editingClient ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      CPF / CNPJ
                    </label>
                    {cpfCnpj.replace(/\D/g, '').length === 14 && (
                      <button
                        type="button"
                        onClick={handleConsultarCnpj}
                        disabled={searchingCnpj}
                        className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-wider disabled:opacity-50 flex items-center gap-0.5"
                      >
                        {searchingCnpj ? 'Buscando...' : '🔍 Auto-completar'}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="000.000.000-00 ou CNPJ"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Endereço Residencial / Comercial
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Seção de Crediário / Fiado */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    Conta Corrente / Crediário
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCreditBlocked}
                      onChange={(e) => setIsCreditBlocked(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-[11px] font-bold text-rose-600">Bloquear Fiado</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Limite de Crédito (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Saldo Devedor Atual (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={creditBalance}
                      onChange={(e) => setCreditBalance(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Observações / Histórico
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-emerald-500"
                />
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
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  {loading ? 'Salvar...' : 'Salvar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loyalty Chatbot Modal */}
      {botClient && (
        <LoyaltyBotSimulatorModal
          client={botClient}
          clients={clients}
          user={user}
          onClose={() => setBotClient(null)}
        />
      )}
    </div>
  );
}
