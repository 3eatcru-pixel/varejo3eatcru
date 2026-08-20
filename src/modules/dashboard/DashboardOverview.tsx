import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { 
  Store, 
  ShoppingBag, 
  Users, 
  AlertTriangle, 
  Gift, 
  TrendingUp, 
  MessageCircle, 
  Bot, 
  ArrowRight, 
  Wallet, 
  PackageCheck, 
  Sparkles,
  Search,
  CheckCircle2
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  Sale, 
  Product, 
  Client, 
  CashRegister, 
  SaleStatus, 
  UserProfile 
} from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useToast } from '../../components/Toast';

interface DashboardOverviewProps {
  user: UserProfile;
  activeRegister: CashRegister | null;
  onNavigate: (tab: any) => void;
}

export default function DashboardOverview({
  user,
  activeRegister,
  onNavigate
}: DashboardOverviewProps) {
  const { showWarning } = useToast();
  const [salesToday, setSalesToday] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  // AI Assistant Chat Widget
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    const companyId = user.companyId || '';

    // Listen to Sales
    const qSales = query(
      collection(db, 'sales'),
      where('companyId', '==', companyId),
      limit(100)
    );
    const unsubSales = onSnapshot(qSales, (snap) => {
      const list: Sale[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Sale));
      list.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
      setSalesToday(list);
    }, (err) => {
      console.warn('Erro ao carregar vendas no dashboard:', err);
    });

    // Listen to Products
    const qProd = query(collection(db, 'products'), where('companyId', '==', companyId), limit(300));
    const unsubProd = onSnapshot(qProd, (snap) => {
      const list: Product[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Product));
      setProducts(list);
    }, () => {});

    // Listen to Clients
    const qCli = query(collection(db, 'clients'), where('companyId', '==', companyId), limit(300));
    const unsubCli = onSnapshot(qCli, (snap) => {
      const list: Client[] = [];
      snap.forEach(d => list.push({ ...d.data(), id: d.id } as Client));
      setClients(list);
    }, () => {});

    return () => {
      unsubSales();
      unsubProd();
      unsubCli();
    };
  }, [user.companyId]);

  const now = new Date();
  const completedSalesToday = salesToday.filter(s => {
    if (s.status !== SaleStatus.COMPLETED) return false;
    if (!s.createdAt) return false;
    const saleDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
    return saleDate.toDateString() === now.toDateString();
  });
  const totalRevenueToday = completedSalesToday.reduce((acc, s) => acc + s.total, 0);

  // Low stock products (< minStock or <= 3)
  const lowStockProducts = products.filter(p => p.stock <= (p.minStock || 3));

  // Today's Birthdays (Matching month and day)
  const today = new Date();
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDay = String(today.getDate()).padStart(2, '0');

  const birthdayClients = clients.filter(c => {
    if (!c.birthdate) return false;
    // birthdate in format YYYY-MM-DD or MM-DD
    const parts = c.birthdate.split('-');
    if (parts.length === 3) {
      return parts[1] === todayMonth && parts[2] === todayDay;
    }
    if (parts.length === 2) {
      return parts[0] === todayMonth && parts[1] === todayDay;
    }
    return false;
  });

  const handleAskAi = async (customQuestion?: string) => {
    const question = customQuestion || aiPrompt;
    if (!question.trim()) return;

    setLoadingAi(true);
    setAiAnswer('');
    try {
      const token = (localStorage.getItem('varejopro_auth_token')) || 'valid-session-token';
      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: question,
          storeContext: {
            faturamentoHoje: totalRevenueToday,
            vendasConcluidas: completedSalesToday.length,
            produtosEstoqueBaixo: lowStockProducts.map(p => ({ nome: p.name, estoque: p.stock })),
            aniversariantesHoje: birthdayClients.map(c => c.name),
            totalClientes: clients.length
          }
        })
      });
      const data = await res.json();
      if (data.answer) {
        setAiAnswer(data.answer);
      } else {
        setAiAnswer(data.error || 'Não foi possível obter resposta do assistente.');
      }
    } catch (err: any) {
      setAiAnswer('Erro ao conectar com o servidor da IA.');
    } finally {
      setLoadingAi(false);
    }
  };

  const sendWhatsAppBirthday = (client: Client) => {
    const phone = client.whatsapp || client.phone;
    if (!phone) {
      showWarning(`Cliente ${client.name} não possui telefone/WhatsApp cadastrado.`, 'Telefone Não Cadastrado');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const msg = `Olá ${client.name}! 🎉 Feliz Aniversário da equipe VarejoPro! Para comemorar, temos um presente especial em sua próxima visita em nossa loja. Venha conferir!🎁`;
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="flex-1 bg-slate-100 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 sm:p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700/50">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Painel do Comerciante • VarejoPro</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Visão Geral da Loja
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Olá, <strong className="text-white">{user.name}</strong>! Confira o desempenho do seu varejo em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => onNavigate('vendas_pos')}
            className="flex-1 md:flex-initial px-4 py-3 min-h-[48px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Ir para o Caixa (POS)</span>
          </button>
          
          <button
            onClick={() => onNavigate('compras_entradas')}
            className="flex-1 md:flex-initial px-4 py-3 min-h-[48px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-600 transition-all flex items-center justify-center gap-2"
          >
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            <span>Entrada de Nota / Compras</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vendas Hoje</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(totalRevenueToday)}</p>
            <span className="text-[10px] font-bold text-slate-500">{completedSalesToday.length} cupons emitidos</span>
          </div>
        </div>

        {/* Active Cash Register */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Situação do Caixa</span>
            <div className={`p-2 rounded-xl ${activeRegister ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900">
              {activeRegister ? `Aberto (${formatCurrency(activeRegister.initialBalance)})` : 'Caixa Fechado'}
            </p>
            <span className="text-[10px] font-bold text-slate-500">
              {activeRegister ? `Operador: ${activeRegister.openedByName}` : 'Abra um turno para vender'}
            </span>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Alertas de Estoque</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-rose-600">{lowStockProducts.length}</p>
            <span className="text-[10px] font-bold text-slate-500">Itens no limite crítico</span>
          </div>
        </div>

        {/* Birthdays Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Aniversariantes Hoje</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-purple-600">{birthdayClients.length}</p>
            <span className="text-[10px] font-bold text-slate-500">Clientes fazendo aniversário</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Birthdays & Low Stock */}
        <div className="lg:col-span-2 space-y-6">
          {/* Birthdays Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-600" />
                <span>Aniversariantes do Dia</span>
              </h2>
              <button 
                onClick={() => onNavigate('cadastros_clientes_fidelidade')}
                className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-wider"
              >
                Ver Clientes & Fidelidade &rarr;
              </button>
            </div>

            {birthdayClients.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-medium">
                Nenhum cliente fazendo aniversário hoje.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {birthdayClients.map(client => (
                  <div key={client.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{client.name}</p>
                      <p className="text-[10px] text-slate-400">WhatsApp: {client.whatsapp || client.phone || 'Não informado'}</p>
                    </div>
                    <button
                      onClick={() => sendWhatsAppBirthday(client)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[11px] rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Enviar Parabéns</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Alerts Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Produtos com Estoque Crítico</span>
              </h2>
              <button 
                onClick={() => onNavigate('estoque_inventario')}
                className="text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-wider"
              >
                Gerenciar Estoque &rarr;
              </button>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Todos os produtos possuem níveis de estoque saudáveis!</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2">Produto</th>
                      <th className="py-2">Categoria</th>
                      <th className="py-2 text-center">Estoque Atual</th>
                      <th className="py-2 text-center">Mínimo</th>
                      <th className="py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lowStockProducts.slice(0, 5).map(prod => (
                      <tr key={prod.id} className="hover:bg-slate-50">
                        <td className="py-3 font-bold text-slate-800">{prod.name}</td>
                        <td className="py-3 text-slate-500">{prod.category}</td>
                        <td className="py-3 text-center font-black text-rose-600">{prod.stock} {prod.unit || 'un'}</td>
                        <td className="py-3 text-center text-slate-400">{prod.minStock || 3}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => onNavigate('compras_entradas')}
                            className="min-h-[36px] px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-600 transition-all uppercase tracking-wider inline-flex items-center"
                          >
                            Pedir Fornecedor
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Assistant Prompt Widget */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Bot className="w-5 h-5" />
              <span>Consultor IA de Varejo Gemini</span>
            </div>
            <p className="text-xs text-slate-300">
              Faça perguntas estratégicas sobre suas vendas, reposição de estoque e engajamento de clientes.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleAskAi("Quais os meus produtos com maior risco de zerar estoque?")}
                className="w-full text-left p-2.5 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-[11px] font-medium text-slate-200 transition-all flex items-center justify-between"
              >
                <span>📦 Quais produtos estão acabando?</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </button>

              <button
                onClick={() => handleAskAi("Sugira uma estratégia para aumentar o faturamento do caixa hoje.")}
                className="w-full text-left p-2.5 bg-slate-800/80 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-[11px] font-medium text-slate-200 transition-all flex items-center justify-between"
              >
                <span>📈 Dicas para aumentar o ticket médio</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </button>
            </div>

            {/* Answer Display */}
            {loadingAi && (
              <div className="p-4 bg-slate-800/60 rounded-xl text-xs text-emerald-400 font-bold animate-pulse flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Analisando dados do VarejoPro com Gemini IA...</span>
              </div>
            )}

            {aiAnswer && !loadingAi && (
              <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700 text-xs space-y-2 max-h-60 overflow-y-auto">
                <p className="font-bold text-emerald-400 text-[10px] uppercase tracking-wider">Resposta do Consultor:</p>
                <div className="whitespace-pre-wrap text-slate-200 leading-relaxed text-[11px]">
                  {aiAnswer}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 space-y-2 border-t border-slate-800">
            <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-700">
              <input
                type="text"
                placeholder="Pergunte ao Gemini IA..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                className="bg-transparent border-none text-xs text-white placeholder-slate-500 outline-none flex-1"
              />
              <button
                onClick={() => handleAskAi()}
                disabled={loadingAi}
                className="p-1.5 bg-emerald-500 text-slate-950 font-black rounded-lg hover:bg-emerald-400 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <button
              onClick={() => onNavigate('inicio_assistant')}
              className="w-full text-center text-[10px] font-black uppercase text-slate-400 hover:text-emerald-400 transition-all"
            >
              Abrir Tela Completa do Assistente IA &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
