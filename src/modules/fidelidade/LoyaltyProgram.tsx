import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  query, 
  where,
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Award, 
  Star, 
  Plus, 
  Minus, 
  Search, 
  MessageCircle, 
  Trophy, 
  UserCheck, 
  Gift,
  X,
  Sparkles,
  Bot
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { Client, LoyaltyTier, UserProfile } from '../../types';
import { formatCurrency } from '../../lib/utils';

import { adjustLoyaltyPoints, getLoyaltyTier } from '../../services/ClientService';
import { useToast } from '../../components/Toast';
import LoyaltyBotSimulatorModal from './LoyaltyBotSimulatorModal';

export default function LoyaltyProgram({ user }: { user?: UserProfile }) {
  const { showSuccess, showError, showWarning } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Manual Points Adjustment Modal
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [pointsDelta, setPointsDelta] = useState(50);
  const [adjustmentReason, setAdjustmentReason] = useState('Bônus de Fidelidade');
  const [saving, setSaving] = useState(false);

  // Chatbot Simulator Modal State
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [botSelectedClient, setBotSelectedClient] = useState<Client | undefined>(undefined);

  const companyId = user?.companyId || '';

  useEffect(() => {
    if (!companyId) return;
    const q = query(collection(db, 'clients'), where('companyId', '==', companyId), limit(300));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: Client[] = [];
      snap.forEach(d => {
        const data = d.data() as Client;
        const { id, ...restData } = data;
        list.push({ id: d.id, ...restData });
      });
      setClients(list);
      setLoading(false);
    }, (err) => {
      console.warn('Erro ao carregar clientes no programa de fidelidade:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [companyId]);

  const getTierColor = (tier: LoyaltyTier) => {
    switch (tier) {
      case 'VIP': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'OURO': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'PRATA': return 'bg-slate-200 text-slate-700 border-slate-300';
      case 'BRONZE': default: return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  const handleAdjustPoints = async (isAdd: boolean) => {
    if (!selectedClient) return;
    if (!user) {
      showError('Sessão de usuário inválida.', 'Erro de Autenticação');
      return;
    }
    const amount = isAdd ? pointsDelta : -pointsDelta;

    setSaving(true);
    try {
      const newBalance = await adjustLoyaltyPoints(
        selectedClient.id, 
        amount, 
        user, 
        'Ajuste manual pela interface de Fidelidade'
      );
      setSelectedClient(null);
      showSuccess(`Pontuação atualizada para ${newBalance} pontos (${getLoyaltyTier(newBalance)})!`, 'Pontos Atualizados');
    } catch (err: any) {
      showError(`Erro ao atualizar pontos: ${err.message}`, 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const notifyWhatsAppPoints = (client: Client) => {
    const phone = client.whatsapp || client.phone;
    if (!phone) {
      showWarning('Cliente não possui telefone cadastrado.', 'Telefone Não Encontrado');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const points = client.pointsBalance || 0;
    const tier = client.tier || getLoyaltyTier(points);
    const msg = `Olá ${client.name}! 🌟 Você possui *${points} pontos* no Clube de Fidelidade VarejoPro (Nível *${tier}*). Acumule pontos em suas compras e troque por descontos no caixa!🎁`;
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const sortedClients = [...clients].sort((a, b) => (b.pointsBalance || 0) - (a.pointsBalance || 0));
  const filteredClients = sortedClients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cpfCnpj && c.cpfCnpj.includes(searchTerm))
  );

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            <span>Clube de Fidelidade & Ranking de Clientes</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Gerencie o acúmulo de pontos, categorias VIP e trocas de benefícios no caixa
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setBotSelectedClient(clients.length > 0 ? clients[0] : undefined);
            setIsBotModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition shrink-0"
        >
          <Bot className="w-4 h-4" />
          <span>Chatbot Fidelidade WhatsApp (24/7)</span>
        </button>
      </div>

      {/* Rules Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-6 rounded-3xl text-slate-950 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-950 font-black text-xs uppercase tracking-wider">
            <Trophy className="w-5 h-5" />
            <span>Regra Geral de Pontuação</span>
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-950">
            R$ 1,00 em Compras = 1 Ponto de Fidelidade
          </h2>
          <p className="text-xs font-bold text-amber-950">
            Cada 100 pontos valem R$ 5,00 em desconto direto no caixa no momento da venda.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-black bg-slate-950 text-amber-400 px-4 py-3 rounded-2xl shrink-0">
          <Star className="w-4 h-4 fill-amber-400" />
          <span>Troca no Checkout Ativada</span>
        </div>
      </div>

      {/* Search & List */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none focus:border-amber-500"
          />
        </div>

        <div className="text-xs font-bold text-slate-500">
          Total de Clientes no Clube: <span className="text-slate-900 font-black">{clients.length}</span>
        </div>
      </div>

      {/* Leaderboard Ranking Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-bold">Carregando fidelidade...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 font-medium">Nenhum cliente cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 text-center">Posição</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 text-center">Categoria VIP</th>
                  <th className="py-3 px-4 text-center">Pontos Acumulados</th>
                  <th className="py-3 px-4 text-right">Total Comprado (R$)</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredClients.map((client, index) => {
                  const points = client.pointsBalance || 0;
                  const tier = client.tier || getLoyaltyTier(points);

                  return (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-black text-slate-400">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{client.name}</div>
                        <span className="text-[10px] text-slate-400 font-normal">CPF: {client.cpfCnpj || 'Não inf.'}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${getTierColor(tier)}`}>
                          {tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-black text-amber-600 text-sm">
                        {points} pts
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        {formatCurrency(client.totalSpent || 0)}
                      </td>
                      <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="px-2.5 py-1 bg-slate-900 text-white hover:bg-amber-600 rounded-lg text-[10px] font-bold transition-all"
                        >
                          Ajustar Pontos
                        </button>
                        <button
                          onClick={() => {
                            setBotSelectedClient(client);
                            setIsBotModalOpen(true);
                          }}
                          title="Abrir Chatbot / Consulta de Fidelidade no WhatsApp"
                          className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"
                        >
                          <Bot className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => notifyWhatsAppPoints(client)}
                          title="Enviar saldo rápido via WhatsApp"
                          className="p-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Points Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">Ajuste de Pontos Fidelidade</h3>
              </div>
              <button 
                onClick={() => setSelectedClient(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-slate-900 space-y-1">
                <p className="font-black text-sm">{selectedClient.name}</p>
                <p className="text-[10px] text-amber-900 font-bold">
                  Saldo Atual: <strong className="text-amber-700">{selectedClient.pointsBalance || 0} Pontos</strong>
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Quantidade de Pontos</label>
                <input
                  type="number"
                  min="1"
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-900 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Motivo / Observação</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900 outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleAdjustPoints(false)}
                  disabled={saving}
                  className="py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Minus className="w-4 h-4" />
                  <span>Debitar Pontos</span>
                </button>

                <button
                  onClick={() => handleAdjustPoints(true)}
                  disabled={saving}
                  className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Creditar Pontos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Loyalty Chatbot Modal */}
      {isBotModalOpen && (
        <LoyaltyBotSimulatorModal
          client={botSelectedClient}
          clients={clients}
          user={user}
          onClose={() => {
            setIsBotModalOpen(false);
            setBotSelectedClient(undefined);
          }}
        />
      )}
    </div>
  );
}
