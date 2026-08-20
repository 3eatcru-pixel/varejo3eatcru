import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  limit 
} from 'firebase/firestore';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Store, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  UserCheck, 
  RefreshCw 
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { Sale, Product, Client, UserProfile, SaleStatus } from '../../types';

interface AiStoreAssistantProps {
  user: UserProfile;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function AiStoreAssistant({ user }: AiStoreAssistantProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: `Olá ${user.name}! Sou o Consultor de Inteligência de Varejo VarejoPro. Como posso ajudar com a gestão da sua loja hoje?`
    }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const companyId = user?.companyId || '';
    if (!companyId) return;

    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('companyId', '==', companyId), limit(200)), (snap) => {
      const list: Sale[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Sale));
      setSales(list);
    }, () => {});

    const unsubProd = onSnapshot(query(collection(db, 'products'), where('companyId', '==', companyId), limit(300)), (snap) => {
      const list: Product[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Product));
      setProducts(list);
    }, () => {});

    const unsubCli = onSnapshot(query(collection(db, 'clients'), where('companyId', '==', companyId), limit(300)), (snap) => {
      const list: Client[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Client));
      setClients(list);
    }, () => {});

    return () => {
      unsubSales();
      unsubProd();
      unsubCli();
    };
  }, [user?.companyId]);

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || input;
    if (!promptToSend.trim()) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', text: promptToSend }
    ];
    setMessages(newMessages);
    if (!customPrompt) setInput('');
    setLoading(true);

    const completedSales = sales.filter(s => s.status === SaleStatus.COMPLETED);
    const totalRevenue = completedSales.reduce((acc, s) => acc + s.total, 0);

    try {
      const token = localStorage.getItem('varejopro_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: promptToSend,
          storeContext: {
            faturamentoTotal: totalRevenue,
            quantidadeVendas: completedSales.length,
            totalProdutos: products.length,
            produtosEstoqueBaixo: products.filter(p => p.stock <= (p.minStock || 3)).map(p => ({ nome: p.name, estoque: p.stock })),
            totalClientes: clients.length
          }
        })
      });

      const data = await res.json();
      if (data.answer) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.error || 'Erro ao processar consulta.' }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Erro de conexão com o servidor do Gemini IA.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto flex flex-col space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Bot className="w-6 h-6 text-emerald-600" />
          <span>Consultor & Assistente IA de Varejo Gemini</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Análise inteligente de vendas, estoque, margem de produtos e comportamento de clientes
        </p>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleSend("Análise geral do meu faturamento e sugestões de melhoria.")}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm"
        >
          📊 Análise Geral do Faturamento
        </button>

        <button
          onClick={() => handleSend("Quais produtos têm maior risco de acabar no estoque?")}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm"
        >
          📦 Alertas de Reposição Urgente
        </button>

        <button
          onClick={() => handleSend("Crie uma campanha promocional para WhatsApp para alavancar as vendas deste fim de semana.")}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm"
        >
          📲 Ideias de Campanha WhatsApp
        </button>
      </div>

      {/* Chat Messages Box */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-y-auto space-y-4 flex flex-col justify-between min-h-[400px]">
        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              <div
                className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white font-medium rounded-br-none shadow-md'
                    : 'bg-slate-50 text-slate-800 font-medium border border-slate-200 rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 animate-pulse py-2">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Gemini IA processando análise de dados do seu varejo...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
          <input
            type="text"
            placeholder="Digite sua dúvida sobre vendas, produtos ou clientes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-900 outline-none focus:border-emerald-500"
          />

          <button
            onClick={() => handleSend()}
            disabled={loading}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Perguntar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
