import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Phone, 
  Mail, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  Filter,
  Save,
  X,
  Sparkles,
  Award
} from 'lucide-react';

import { CommercialLead } from '../../types/branding';
import { formatCurrency } from '../../lib/utils';
import { useToast } from '../../components/Toast';
import { HQPaymentModal, HQInvoice } from './HQPaymentModal';

const STATUS_CONFIG: Record<CommercialLead['status'], { label: string; color: string; bg: string }> = {
  NOVO: { label: 'Novo Lead', color: 'text-blue-400', bg: 'bg-blue-950/60 border-blue-800' },
  CONTATO_INICIAL: { label: 'Contato Inicial', color: 'text-cyan-400', bg: 'bg-cyan-950/60 border-cyan-800' },
  DEMO_AGENDADA: { label: 'Demo Agendada', color: 'text-purple-400', bg: 'bg-purple-950/60 border-purple-800' },
  PROPOSTA_ENVIADA: { label: 'Proposta Enviada', color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-800' },
  NEGOCIACAO: { label: 'Em Negociação', color: 'text-indigo-400', bg: 'bg-indigo-950/60 border-indigo-800' },
  FECHADO_GANHO: { label: 'Fechado / Ganho 🎉', color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-800' },
  PERDIDO: { label: 'Perdido', color: 'text-rose-400', bg: 'bg-rose-950/60 border-rose-800' }
};

export default function PlatformCommercialCRM({ platformRole }: { platformRole?: string }) {
  const { showSuccess, showError } = useToast();

  const [leads, setLeads] = useState<CommercialLead[]>([
    {
      id: 'lead-1',
      companyName: 'Mercado Silva & Irmãos',
      contactName: 'João da Silva',
      phone: '(11) 98765-4321',
      email: 'joao@mercadosilva.com.br',
      segment: 'MERCADO',
      interestedPlan: 'PRO',
      status: 'PROPOSTA_ENVIADA',
      estimatedValue: 299.00,
      sellerName: 'Carlos (3eatcru Sales)',
      nextFollowUpDate: '2026-08-20',
      notes: 'Interesse alto no PDV rápido e personalização de logotipo/marca.',
      tags: ['PDV Rápido', 'White-Label'],
      createdAt: '2026-08-10T14:00:00Z'
    },
    {
      id: 'lead-2',
      companyName: 'Boutique Elegance Moda',
      contactName: 'Fernanda Lima',
      phone: '(21) 99888-7766',
      email: 'fernanda@boutiqueelegance.com',
      segment: 'MODA',
      interestedPlan: 'ENTERPRISE',
      status: 'DEMO_AGENDADA',
      estimatedValue: 499.00,
      sellerName: 'Mariana (3eatcru Sales)',
      nextFollowUpDate: '2026-08-18',
      notes: 'Quer sistema com grade de produtos P/M/G e etiqueta de código de barras.',
      tags: ['Grade Tamanhos', 'Chatbot Fidelidade'],
      createdAt: '2026-08-12T10:30:00Z'
    },
    {
      id: 'lead-3',
      companyName: 'Farmácia Saúde Total',
      contactName: 'Dr. Roberto',
      phone: '(31) 97777-6655',
      email: 'roberto@saudetotal.com.br',
      segment: 'FARMACIA',
      interestedPlan: 'BUSINESS',
      status: 'FECHADO_GANHO',
      estimatedValue: 199.00,
      sellerName: 'Carlos (3eatcru Sales)',
      notes: 'Contrato assinado! Criando ambiente customizado com logo da farmácia.',
      tags: ['Contrato Fechado', 'Ativo'],
      createdAt: '2026-08-01T09:00:00Z'
    }
  ]);

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<CommercialLead | null>(null);

  // Direct Lead Payment Modal
  const [selectedLeadForPayment, setSelectedLeadForPayment] = useState<HQInvoice | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleChargeLead = (lead: CommercialLead) => {
    setSelectedLeadForPayment({
      id: `lead-inv-${lead.id}`,
      invoiceNumber: `FAT-LEAD-${lead.id.substring(0, 5).toUpperCase()}`,
      companyId: lead.id,
      companyName: lead.companyName,
      amount: lead.estimatedValue || 149.00,
      status: 'PENDING',
      dueDate: new Date().toISOString().substring(0, 10),
      paymentMethod: 'PIX',
      description: `Adesão / Mensalidade Plano ${lead.interestedPlan} - ${lead.companyName}`,
      createdAt: new Date().toISOString()
    });
    setIsPaymentModalOpen(true);
  };

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [segment, setSegment] = useState<CommercialLead['segment']>('MERCADO');
  const [interestedPlan, setInterestedPlan] = useState<CommercialLead['interestedPlan']>('PRO');
  const [status, setStatus] = useState<CommercialLead['status']>('NOVO');
  const [estimatedValue, setEstimatedValue] = useState('299.00');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  const openNewModal = () => {
    setEditingLead(null);
    setCompanyName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setSegment('MERCADO');
    setInterestedPlan('PRO');
    setStatus('NOVO');
    setEstimatedValue('299.00');
    setNextFollowUpDate('');
    setNotes('');
    setShowModal(true);
  };

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactName || !phone) {
      showError('Preencha os campos obrigatórios.');
      return;
    }

    if (editingLead) {
      setLeads(prev => prev.map(l => l.id === editingLead.id ? {
        ...l,
        companyName,
        contactName,
        phone,
        email,
        segment,
        interestedPlan,
        status,
        estimatedValue: parseFloat(estimatedValue) || 0,
        nextFollowUpDate,
        notes,
        updatedAt: new Date().toISOString()
      } : l));
      showSuccess('Lead comercial atualizado!');
    } else {
      const newL: CommercialLead = {
        id: `lead-${Date.now()}`,
        companyName,
        contactName,
        phone,
        email,
        segment,
        interestedPlan,
        status,
        estimatedValue: parseFloat(estimatedValue) || 0,
        sellerName: 'Vendedor 3eatcru',
        nextFollowUpDate,
        notes,
        createdAt: new Date().toISOString()
      };
      setLeads(prev => [newL, ...prev]);
      showSuccess('Novo lead cadastrado no CRM da 3eatcru!');
    }
    setShowModal(false);
  };

  const filteredLeads = leads.filter(l => {
    const matchStatus = filterStatus === 'ALL' || l.status === filterStatus;
    const matchSearch = l.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm);
    return matchStatus && matchSearch;
  });

  // Calculate Pipeline Metrics
  const totalPipeline = leads.reduce((acc, l) => acc + (l.status !== 'PERDIDO' ? l.estimatedValue : 0), 0);
  const wonPipeline = leads.filter(l => l.status === 'FECHADO_GANHO').reduce((acc, l) => acc + l.estimatedValue, 0);
  const activeLeadsCount = leads.filter(l => l.status !== 'FECHADO_GANHO' && l.status !== 'PERDIDO').length;

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pipeline Total Mensal</span>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(totalPipeline)}/mês</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{leads.length} oportunidades registradas</p>
          </div>
          <div className="p-3 bg-emerald-950/60 text-emerald-400 rounded-2xl border border-emerald-800/60">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Em Negociação / Ativos</span>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{activeLeadsCount} Empresas</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Potencial de expansão SaaS</p>
          </div>
          <div className="p-3 bg-amber-950/60 text-amber-400 rounded-2xl border border-amber-800/60">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">MRR Fechado / Ganho</span>
            <h3 className="text-2xl font-black text-cyan-400 mt-1">{formatCurrency(wonPipeline)}/mês</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Receita recorrente garantida</p>
          </div>
          <div className="p-3 bg-cyan-950/60 text-cyan-400 rounded-2xl border border-cyan-800/60">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por empresa, contato ou tel..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 font-bold outline-none focus:border-emerald-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="NOVO">Novo Lead</option>
            <option value="CONTATO_INICIAL">Contato Inicial</option>
            <option value="DEMO_AGENDADA">Demo Agendada</option>
            <option value="PROPOSTA_ENVIADA">Proposta Enviada</option>
            <option value="NEGOCIACAO">Em Negociação</option>
            <option value="FECHADO_GANHO">Fechado / Ganho</option>
            <option value="PERDIDO">Perdido</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="w-full md:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Oportunidade</span>
        </button>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Empresa / Contato</th>
                <th className="p-4">Segmento & Plano</th>
                <th className="p-4">Status no Funil</th>
                <th className="p-4">Valor Estimado</th>
                <th className="p-4">Próximo Contato</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredLeads.map(lead => {
                const conf = STATUS_CONFIG[lead.status];
                return (
                  <tr key={lead.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{lead.companyName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>👤 {lead.contactName}</span>
                        <span>•</span>
                        <span>📱 {lead.phone}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold uppercase border border-slate-700">
                        {lead.segment}
                      </span>
                      <span className="ml-2 px-2 py-0.5 bg-emerald-950/80 text-emerald-400 rounded-lg text-[10px] font-black uppercase border border-emerald-800/80">
                        Plano {lead.interestedPlan}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${conf.bg} ${conf.color}`}>
                        {conf.label}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-400">
                      {formatCurrency(lead.estimatedValue)}/mês
                    </td>
                    <td className="p-4 text-slate-400 font-medium">
                      {lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('pt-BR') : 'A Definir'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleChargeLead(lead)}
                          title="Cobrar adesão ou mensalidade via PIX / Cartão Mercado Pago"
                          className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-[11px] font-bold transition flex items-center gap-1"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Cobrar PIX / Cartão
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLead(lead);
                            setCompanyName(lead.companyName);
                            setContactName(lead.contactName);
                            setPhone(lead.phone);
                            setEmail(lead.email || '');
                            setSegment(lead.segment);
                            setInterestedPlan(lead.interestedPlan);
                            setStatus(lead.status);
                            setEstimatedValue(String(lead.estimatedValue));
                            setNextFollowUpDate(lead.nextFollowUpDate || '');
                            setNotes(lead.notes || '');
                            setShowModal(true);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[11px] font-bold transition"
                        >
                          Gerenciar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lead Creation / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white w-full max-w-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>{editingLead ? 'Editar Oportunidade Comercial' : 'Nova Oportunidade Comercial'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nome da Empresa</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ex: Mercado Silva"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nome do Contato / Decisor</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">E-mail Comercial</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Segmento</label>
                  <select
                    value={segment}
                    onChange={e => setSegment(e.target.value as any)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="MERCADO">Mercado / Mercearia</option>
                    <option value="MODA">Moda / Roupas</option>
                    <option value="FARMACIA">Farmácia / Drogaria</option>
                    <option value="RESTAURANTE">Restaurante / Bar</option>
                    <option value="SERVICOS">Serviços</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Plano Alvo</label>
                  <select
                    value={interestedPlan}
                    onChange={e => setInterestedPlan(e.target.value as any)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="STARTER">STARTER (R$ 79/mês)</option>
                    <option value="PRO">PRO (R$ 149/mês)</option>
                    <option value="BUSINESS">BUSINESS (R$ 299/mês)</option>
                    <option value="ENTERPRISE">ENTERPRISE (R$ 599/mês)</option>
                    <option value="PRO">PRO White-Label (R$ 299/mês)</option>
                    <option value="ENTERPRISE">ENTERPRISE (R$ 499/mês)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Valor Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={estimatedValue}
                    onChange={e => setEstimatedValue(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status no Funil</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="NOVO">Novo Lead</option>
                    <option value="CONTATO_INICIAL">Contato Inicial</option>
                    <option value="DEMO_AGENDADA">Demo Agendada</option>
                    <option value="PROPOSTA_ENVIADA">Proposta Enviada</option>
                    <option value="NEGOCIACAO">Em Negociação</option>
                    <option value="FECHADO_GANHO">Fechado / Ganho 🎉</option>
                    <option value="PERDIDO">Perdido</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Próximo Follow-up</label>
                  <input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={e => setNextFollowUpDate(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Anotações do Vendedor</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Detalhes da conversa, necessidades da loja, objeções..."
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Salvar Oportunidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD PAYMENT MODAL */}
      <HQPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={selectedLeadForPayment}
        onPaymentSuccess={(updated) => {
          showSuccess(`Pagamento recebido! Lead ${updated.companyName} convertido.`);
          setIsPaymentModalOpen(false);
        }}
      />
    </div>
  );
}
