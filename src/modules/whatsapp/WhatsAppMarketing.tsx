import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  limit 
} from 'firebase/firestore';
import { 
  MessageCircle, 
  Send, 
  Gift, 
  Sparkles, 
  HeartHandshake, 
  DollarSign, 
  Users, 
  Search, 
  CheckCircle2,
  Bot 
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { Client, UserProfile } from '../../types';
import { useToast } from '../../components/Toast';
import LoyaltyBotSimulatorModal from '../fidelidade/LoyaltyBotSimulatorModal';

export default function WhatsAppMarketing({ user }: { user?: UserProfile }) {
  const { showWarning } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [templateType, setTemplateType] = useState<'BIRTHDAY' | 'THANK_YOU' | 'PROMO' | 'COLLECTION' | 'LOYALTY_BOT'>('THANK_YOU');
  const [customText, setCustomText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);

  const companyId = user?.companyId || '';

  useEffect(() => {
    if (!companyId) return;
    const q = query(collection(db, 'clients'), where('companyId', '==', companyId), limit(300));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: Client[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Client);
      });
      setClients(list);
    }, (err) => {
      console.warn('Erro ao carregar clientes no WhatsApp Marketing:', err);
    });
    return () => unsubscribe();
  }, [companyId]);

  const templates = {
    THANK_YOU: "Olá {nome}! 🛍️ Muito obrigado por comprar no VarejoPro! Esperamos que tenha gostado do seu atendimento. Se precisar de algo, é só chamar aqui!",
    BIRTHDAY: "Parabéns {nome}! 🎉🎂 Desejamos um dia incrível de aniversário! Venha comemorar conosco na loja e ganhe um desconto especial ou brinde em sua compra de hoje!",
    PROMO: "Olá {nome}! 🌟 Chegaram novidades imperdíveis na nossa coleção! Venha conferir as novas peças e aproveite para usar seus {pontos} pontos de fidelidade!",
    COLLECTION: "Aviso importante para {nome}: Seus produtos selecionados acabaram de chegar em nosso estoque. Venha garantir o seu antes que esgote!",
    LOYALTY_BOT: "Olá {nome}! 🌟 Você possui {pontos} pontos no Clube de Fidelidade VarejoPro! Digite 1 para resgatar cupom no PDV ou 2 para ver prêmios."
  };

  useEffect(() => {
    setCustomText(templates[templateType]);
  }, [templateType]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const getFormattedMessage = () => {
    const name = selectedClient ? selectedClient.name : '{nome_cliente}';
    const points = selectedClient ? (selectedClient.pointsBalance || 0) : 0;
    
    return customText
      .replace(/{nome}/g, name)
      .replace(/{pontos}/g, String(points));
  };

  const handleSendWhatsApp = (clientOverride?: Client) => {
    const target = clientOverride || selectedClient;
    if (!target) {
      showWarning('Selecione um cliente para enviar o WhatsApp.', 'Cliente Não Selecionado');
      return;
    }

    const phone = target.whatsapp || target.phone;
    if (!phone) {
      showWarning(`Cliente ${target.name} não possui número de WhatsApp cadastrado.`, 'Telefone Não Cadastrado');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const finalMsg = customText
      .replace(/{nome}/g, target.name)
      .replace(/{pontos}/g, String(target.pointsBalance || 0));

    const url = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(finalMsg)}`;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.whatsapp && c.whatsapp.includes(searchTerm))
  );

  return (
    <div className="flex-1 bg-slate-100 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-emerald-500" />
            <span>Atendimento & Marketing WhatsApp</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Envie mensagens diretas de agradecimento, parabéns, ofertas e aviso de chegada de mercadorias
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsBotModalOpen(true)}
          className="min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition shrink-0"
        >
          <Bot className="w-4 h-4" />
          <span>Simulador & Chatbot Fidelidade (24/7)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Template Selection & Preview */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Template Selector Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setTemplateType('THANK_YOU')}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all space-y-2 min-h-[48px] ${
                templateType === 'THANK_YOU' 
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <HeartHandshake className="w-5 h-5" />
              <div>
                <p className="text-xs font-bold uppercase">Agradecimento</p>
                <span className="text-[9px] opacity-80 block">Pós-venda caixa</span>
              </div>
            </button>

            <button
              onClick={() => setTemplateType('BIRTHDAY')}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all space-y-2 min-h-[48px] ${
                templateType === 'BIRTHDAY' 
                  ? 'bg-purple-600 text-white border-purple-500 font-black shadow-md' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Gift className="w-5 h-5" />
              <div>
                <p className="text-xs font-bold uppercase">Aniversário</p>
                <span className="text-[9px] opacity-80 block">Cupom de presente</span>
              </div>
            </button>

            <button
              onClick={() => setTemplateType('PROMO')}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all space-y-2 min-h-[48px] ${
                templateType === 'PROMO' 
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <div>
                <p className="text-xs font-bold uppercase">Promoção</p>
                <span className="text-[9px] opacity-80 block">Novidades & Pontos</span>
              </div>
            </button>

            <button
              onClick={() => setTemplateType('COLLECTION')}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all space-y-2 min-h-[48px] ${
                templateType === 'COLLECTION' 
                  ? 'bg-blue-600 text-white border-blue-500 font-black shadow-md' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <div>
                <p className="text-xs font-bold uppercase">Chegada Estoque</p>
                <span className="text-[9px] opacity-80 block">Reserva de itens</span>
              </div>
            </button>
          </div>

          {/* Editor & Live Preview Box */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Personalizar Modelo de Mensagem
            </h3>

            <textarea
              rows={4}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 font-medium outline-none focus:border-emerald-500"
            />

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pré-visualização da Mensagem Gerada
              </span>
              <p className="text-xs text-slate-800 font-medium italic whitespace-pre-wrap">
                "{getFormattedMessage()}"
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Fast Client Selector List */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Enviar para Cliente</span>
            </h3>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium outline-none focus:border-emerald-500 min-h-[40px]"
            />
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-96 flex-1">
            {filteredClients.map(client => (
              <div key={client.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-slate-900">{client.name}</p>
                  <p className="text-[10px] text-slate-400">{client.whatsapp || client.phone || 'Sem fone'}</p>
                </div>
                <button
                  onClick={() => handleSendWhatsApp(client)}
                  className="min-h-[36px] px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all"
                >
                  <Send className="w-3 h-3" />
                  <span>Enviar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Loyalty Bot Simulator Modal */}
      {isBotModalOpen && (
        <LoyaltyBotSimulatorModal
          client={selectedClient}
          clients={clients}
          user={user}
          onClose={() => setIsBotModalOpen(false)}
        />
      )}
    </div>
  );
}
