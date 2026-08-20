import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  Send, 
  MessageSquare, 
  Sparkles, 
  Award, 
  Gift, 
  Copy, 
  Check, 
  ExternalLink,
  Phone,
  QrCode,
  ShieldCheck,
  Zap,
  Tag,
  Clock,
  UserCheck
} from 'lucide-react';
import { Client, LoyaltyTier, UserProfile } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { getLoyaltyTier } from '../../services/ClientService';
import { useToast } from '../../components/Toast';

interface LoyaltyBotSimulatorModalProps {
  client?: Client;
  clients?: Client[];
  user?: UserProfile;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  options?: { label: string; action: string }[];
}

export const LoyaltyBotSimulatorModal: React.FC<LoyaltyBotSimulatorModalProps> = ({
  client: initialClient,
  clients = [],
  user,
  onClose
}) => {
  const { showSuccess, showWarning } = useToast();
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(
    initialClient || (clients.length > 0 ? clients[0] : undefined)
  );

  const companyName = user?.name ? `${user.name} (VarejoPro)` : 'VarejoPro Store';

  // Get dynamic values
  const points = selectedClient?.pointsBalance || 0;
  const tier = selectedClient?.tier || getLoyaltyTier(points);
  const clientName = selectedClient?.name || 'Cliente';
  const rawPhone = (selectedClient?.whatsapp || selectedClient?.phone || '').replace(/\D/g, '');
  const formattedPhone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;

  // Bot Chat Interactive Simulation
  const getInitialMessages = (cName: string, p: number, t: LoyaltyTier): ChatMessage[] => [
    {
      id: '1',
      sender: 'user',
      text: 'Olá! Gostaria de consultar meus pontos no Clube de Fidelidade 🌟',
      timestamp: '10:45'
    },
    {
      id: '2',
      sender: 'bot',
      text: `Olá, *${cName}*! 👋 Sou o Assistente Virtual do *Clube de Fidelidade ${companyName}*.\n\nAqui está o seu extrato atualizado em tempo real:`,
      timestamp: '10:45'
    },
    {
      id: '3',
      sender: 'bot',
      text: `🏆 *SEU SALDO & BENEFÍCIOS:*\n\n⭐ *Pontos Acumulados:* *${p} pts*\n🎖️ *Nível Atual:* *${t}*\n💰 *Equivalente em Desconto:* *${formatCurrency(p * 0.05)}*\n\n🎁 *Vantagens do seu nível ${t}:*\n• ${t === 'VIP' ? '15% OFF em todo o catálogo + Fila Prioritária' : t === 'OURO' ? '10% OFF + Frete Grátis nas compras' : t === 'PRATA' ? '5% OFF + Bônus de Aniversário' : 'Acumule 1 ponto a cada R$ 1,00 gasto'}\n\nO que você deseja fazer agora?`,
      timestamp: '10:45',
      options: [
        { label: '🎟️ Resgatar Cupom no PDV', action: 'REDEEM_COUPON' },
        { label: '📜 Ver Tabela de Prêmios', action: 'PRIZE_CATALOG' },
        { label: '🛍️ Ver Ofertas da Semana', action: 'WEEKLY_DEALS' },
        { label: '👤 Falar com Atendente', action: 'HUMAN_SUPPORT' }
      ]
    }
  ];

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    getInitialMessages(clientName, points, tier)
  );
  const [userInput, setUserInput] = useState('');

  // Update chat if client changes
  const handleSelectClient = (cId: string) => {
    const c = clients.find(cl => cl.id === cId);
    if (c) {
      setSelectedClient(c);
      const cPts = c.pointsBalance || 0;
      const cTier = c.tier || getLoyaltyTier(cPts);
      setChatMessages(getInitialMessages(c.name, cPts, cTier));
    }
  };

  const handleSendOption = (option: { label: string; action: string }) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: option.label,
      timestamp: now
    };

    let botResponseText = '';
    if (option.action === 'REDEEM_COUPON') {
      const couponCode = `FIDELIDADE-${Math.floor(1000 + Math.random() * 9000)}`;
      botResponseText = `🎉 *CUPOM DE DESCONTO GERADO!*\n\nCódigo: *${couponCode}*\nValor: *${formatCurrency(points * 0.05)}*\n\nBasta informar o código ou seu CPF no caixa do *VarejoPro* na hora do pagamento para abater do valor total! 🛍️`;
    } else if (option.action === 'PRIZE_CATALOG') {
      botResponseText = `🎁 *CATÁLOGO DE RECOMPENSAS:*\n\n• *100 pts:* Vale R$ 5,00 de desconto\n• *300 pts:* Vale R$ 15,00 + Brinde Exclusivo\n• *500 pts:* Vale R$ 30,00 de desconto\n• *1000 pts:* Vale R$ 75,00 + Acesso VIP Vitalício\n\nContinue pontuando em cada compra!`;
    } else if (option.action === 'WEEKLY_DEALS') {
      botResponseText = `🔥 *OFERTAS DA SEMANA COM PONTUAÇÃO DOBRADA (2x):*\n\nProdutos selecionados na loja estão gerando o dobro de pontos hoje! Venha conferir no balcão da loja. ✨`;
    } else {
      botResponseText = `👨‍💼 Um de nossos atendentes comerciais já foi notificado e responderá sua mensagem em instantes. Por favor, aguarde na linha!`;
    }

    const botMsg: ChatMessage = {
      id: String(Date.now() + 1),
      sender: 'bot',
      text: botResponseText,
      timestamp: now
    };

    setChatMessages(prev => [...prev, userMsg, botMsg]);
  };

  const handleSendCustomMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: userInput,
      timestamp: now
    };

    const botMsg: ChatMessage = {
      id: String(Date.now() + 1),
      sender: 'bot',
      text: `Olá ${clientName}! Entendi sua mensagem: "${userInput}".\n\nLembrando que seu saldo atual é de *${points} pontos* (${tier}). Para atendimento direto, um consultor entrará em contato em breve! 🌟`,
      timestamp: now
    };

    setChatMessages(prev => [...prev, userMsg, botMsg]);
    setUserInput('');
  };

  // Direct WhatsApp Link to send ready-to-use bot query trigger
  const generateWhatsAppTriggerLink = () => {
    if (!rawPhone) {
      showWarning('Cliente sem WhatsApp/Telefone cadastrado.', 'Aviso');
      return;
    }
    const triggerMessage = `Olá *${clientName}*! 🌟\n\nVocê possui *${points} Pontos* no Clube de Fidelidade *${companyName}* (Nível *${tier}*)!\n\n💰 *Saldo de Desconto:* ${formatCurrency(points * 0.05)}\n\nDigite *1* para resgatar cupom\nDigite *2* para ver catálogo de prêmios\nDigite *3* para falar com atendente`;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(triggerMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    showSuccess('WhatsApp aberto com mensagem de consulta de fidelidade!', 'WhatsApp');
  };

  const handleCopyChatFlow = () => {
    const fullText = chatMessages.map(m => `[${m.sender.toUpperCase()}]: ${m.text}`).join('\n\n');
    navigator.clipboard.writeText(fullText);
    showSuccess('Fluxo de conversa copiado com sucesso!', 'Copiado');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-100">
                  Chatbot & Consulta de Fidelidade no WhatsApp
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AUTO-BOT 24/7
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Permita que clientes consultem saldo de pontos, resgatem cupons e vejam benefícios automaticamente pelo WhatsApp.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Customer Selection & Loyalty Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Customer Selector */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Selecionar Cliente para Simulação / Envio
              </label>
              <select
                value={selectedClient?.id || ''}
                onChange={(e) => handleSelectClient(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-200 outline-none focus:border-emerald-500"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.pointsBalance || 0} pts - {c.tier || 'BRONZE'})
                  </option>
                ))}
              </select>

              {/* Client Info Card */}
              {selectedClient && (
                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-sm">{selectedClient.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {tier}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Telefone / WhatsApp:</span>
                    <span className="font-mono text-emerald-400">{selectedClient.whatsapp || selectedClient.phone || 'Não cadastrado'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>CPF / CNPJ:</span>
                    <span className="font-mono text-slate-300">{selectedClient.cpfCnpj || 'Não informado'}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400 font-bold">Pontuação Atual:</span>
                    <span className="text-base font-black text-amber-400">{points} pts</span>
                  </div>
                </div>
              )}
            </div>

            {/* Loyalty Quick Rules */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 text-xs">
              <h3 className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-400" />
                Como Funciona o Chatbot 24/7?
              </h3>
              <ul className="space-y-2 text-slate-400 text-[11px] leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>O cliente manda uma mensagem no WhatsApp da loja (ex: <i>"meus pontos"</i>).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>O bot consulta o saldo instantâneo no banco de dados e responde com extrato e prêmios.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Ele pode gerar cupons promocionais para aplicar diretamente no checkout do PDV.</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={generateWhatsAppTriggerLink}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Disparar Consulta no WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>

              <button
                type="button"
                onClick={handleCopyChatFlow}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Histórico da Conversa</span>
              </button>
            </div>
          </div>

          {/* Right: Smartphone Chat Mockup (7 cols) */}
          <div className="lg:col-span-7 flex flex-col bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            {/* Phone Header */}
            <div className="p-3.5 bg-emerald-950/80 border-b border-emerald-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                    {companyName} • Clube de Fidelidade
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </h4>
                  <p className="text-[10px] text-emerald-300/80 font-mono">Bot Oficial Ativo 24/7</p>
                </div>
              </div>
              <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-1 rounded-lg border border-emerald-800/60">
                WhatsApp Web
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[380px] bg-slate-950/90 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-700 text-white rounded-tr-none shadow-md'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap font-sans">{msg.text}</p>
                    <span className="block text-[9px] text-right mt-1 opacity-60 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Interactive Quick Options / Chips */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                      {msg.options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendOption(opt)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-emerald-900/60 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 rounded-lg text-[11px] font-bold transition shadow-sm"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Phone Message Input */}
            <form
              onSubmit={handleSendCustomMessage}
              className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Simular mensagem do cliente (ex: quero resgatar cupom)..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!userInput.trim()}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoyaltyBotSimulatorModal;
