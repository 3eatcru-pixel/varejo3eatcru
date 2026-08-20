import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale, SaleStatus, Product, UserProfile } from '../types';
import { formatCurrency } from '../lib/utils';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Receipt, 
  PieChart, 
  FileText, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight,
  CreditCard,
  QrCode,
  Banknote
} from 'lucide-react';

export default function Reports({ user }: { user?: UserProfile }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [financialExpenses, setFinancialExpenses] = useState<number>(0);
  const [productsMap, setProductsMap] = useState<Map<string, Product>>(new Map());
  const [activeTab, setActiveTab] = useState<'dre' | 'payment' | 'abc' | 'history'>('dre');
  const [loading, setLoading] = useState(true);

  const companyId = user?.companyId || '';

  useEffect(() => {
    if (!companyId) return;

    // 1. Fetch Sales
    const q = query(collection(db, 'sales'), where('companyId', '==', companyId), limit(200));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Sale))
        .sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
      setSales(data);
      setLoading(false);
    }, (err) => {
      console.warn('Erro ao carregar vendas nos relatórios:', err);
      setLoading(false);
    });

    // 2. Fetch Products for Cost Prices (CMV)
    const fetchProducts = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'products'), where('companyId', '==', companyId)));
        const pMap = new Map<string, Product>();
        snap.forEach(d => pMap.set(d.id, { id: d.id, ...d.data() } as Product));
        setProductsMap(pMap);
      } catch (err) {
        console.error("Erro ao carregar mapa de produtos para o DRE:", err);
      }
    };

    // 3. Fetch Financial Payables (Despesas Operacionais)
    const fetchExpenses = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'financial_records'), where('companyId', '==', companyId)));
        let totalExp = 0;
        snap.forEach(d => {
          const data = d.data();
          if (data.type === 'PAYABLE' && data.status === 'PAID') {
            totalExp += data.amount || 0;
          }
        });
        setFinancialExpenses(totalExp);
      } catch (err) {
        console.error("Erro ao carregar despesas financeiras:", err);
      }
    };

    fetchProducts();
    fetchExpenses();

    return () => unsubscribe();
  }, [companyId]);

  // Filter completed sales
  const validSales = sales.filter(s => s.status === SaleStatus.COMPLETED || !s.status);
  const cancelledSales = sales.filter(s => s.status === SaleStatus.CANCELLED);

  // Revenue & Metrics
  const grossRevenue = validSales.reduce((acc, s) => acc + s.total, 0);
  const totalDiscounts = validSales.reduce((acc, s) => acc + (s.discount || 0), 0);
  const cancelledRevenue = cancelledSales.reduce((acc, s) => acc + s.total, 0);
  const totalSalesCount = validSales.length;
  const averageTicket = totalSalesCount > 0 ? grossRevenue / totalSalesCount : 0;

  // Calculate CMV (Custo das Mercadorias Vendidas)
  let totalCmv = 0;
  validSales.forEach(sale => {
    sale.items?.forEach(item => {
      const prod = productsMap.get(item.productId);
      const unitCost = prod?.costPrice || (item.price * 0.6); // Fallback to 60% if no cost defined
      totalCmv += unitCost * item.quantity;
    });
  });

  const grossProfit = grossRevenue - totalCmv;
  const grossMarginPercent = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
  const netResult = grossProfit - financialExpenses;

  // Payment Breakdown
  const paymentTotals = validSales.reduce((acc, s) => {
    const method = s.paymentMethod || 'pix';
    acc[method] = (acc[method] || 0) + s.total;
    return acc;
  }, {} as Record<string, number>);

  // ABC Analysis - Top Products
  const productStatsMap = new Map<string, { name: string; qty: number; revenue: number }>();
  validSales.forEach(s => {
    s.items?.forEach(item => {
      const current = productStatsMap.get(item.productId) || { name: item.productName, qty: 0, revenue: 0 };
      current.qty += item.quantity;
      current.revenue += item.total;
      productStatsMap.set(item.productId, current);
    });
  });

  const topProducts = Array.from(productStatsMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-emerald-500" />
              Relatórios & DRE Gerencial
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Demonstrativo de resultado, análise de margem e histórico de vendas do PDV
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm self-start">
            <button
              onClick={() => setActiveTab('dre')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'dre' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              DRE
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'payment' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              Pagamentos
            </button>
            <button
              onClick={() => setActiveTab('abc')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'abc' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Curva ABC
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Histórico
            </button>
          </div>
        </div>

        {/* Top Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Receita Bruta</p>
              <p className="text-lg font-black text-slate-900">{formatCurrency(grossRevenue)}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Vendas</p>
              <p className="text-lg font-black text-slate-900">{totalSalesCount} transações</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ticket Médio</p>
              <p className="text-lg font-black text-slate-900">{formatCurrency(averageTicket)}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Margem Bruta</p>
              <p className="text-lg font-black text-slate-900">{grossMarginPercent.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* TAB 1: DRE Gerencial */}
        {activeTab === 'dre' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Demonstrativo do Resultado do Exercício (DRE Sintético)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Visão consolidada do faturamento, custos de produtos e resultado operacional
              </p>
            </div>

            <div className="p-6 space-y-4 font-mono text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 font-bold text-slate-800">
                <span>(+) RECEITA BRUTA DE VENDAS</span>
                <span className="text-emerald-600 font-black">{formatCurrency(grossRevenue)}</span>
              </div>

              {cancelledRevenue > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-slate-500 pl-4">
                  <span>(-) Vendas Canceladas / Devoluções</span>
                  <span className="text-red-500">-{formatCurrency(cancelledRevenue)}</span>
                </div>
              )}

              {totalDiscounts > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-slate-500 pl-4">
                  <span>(-) Descontos Concedidos</span>
                  <span className="text-red-500">-{formatCurrency(totalDiscounts)}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-b border-slate-200 font-black bg-slate-50 px-3 rounded-xl text-slate-900">
                <span>(=) RECEITA LÍQUIDA</span>
                <span>{formatCurrency(grossRevenue)}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-slate-600 pl-4">
                <span>(-) Custo das Mercadorias Vendidas (CMV)</span>
                <span className="text-red-500">-{formatCurrency(totalCmv)}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-200 font-black bg-emerald-50 px-3 rounded-xl text-emerald-900">
                <span>(=) LUCRO BRUTO</span>
                <span>{formatCurrency(grossProfit)} ({grossMarginPercent.toFixed(1)}%)</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-slate-600 pl-4">
                <span>(-) Despesas Operacionais (Contas Pagas)</span>
                <span className="text-red-500">-{formatCurrency(financialExpenses)}</span>
              </div>

              <div className={`flex justify-between items-center py-3 border-t-2 border-slate-300 font-black px-4 rounded-2xl text-sm ${
                netResult >= 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}>
                <span>(=) RESULTADO LÍQUIDO DO PERÍODO</span>
                <span>{formatCurrency(netResult)}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Formas de Pagamento */}
        {activeTab === 'payment' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-500" />
                Distribuição por Forma de Pagamento
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Volume financeiro arrecadado no caixa por modalidade de recebimento
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(paymentTotals).map(([method, totalVal]) => {
                const pct = grossRevenue > 0 ? (totalVal / grossRevenue) * 100 : 0;
                return (
                  <div key={method} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700">{method}</span>
                      <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-600">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(totalVal)}</p>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Curva ABC / Mais Vendidos */}
        {activeTab === 'abc' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-500" />
                  Top 10 Produtos Mais Vendidos (Curva ABC)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Produtos líderes em faturamento e quantidade comercializada no PDV
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posição</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantidade Vendida</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Faturamento Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">
                        Nenhum dado de venda disponível
                      </td>
                    </tr>
                  ) : topProducts.map((prod, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-black text-emerald-600">#{idx + 1}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">{prod.name}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600 text-center">{prod.qty} un</td>
                      <td className="px-6 py-4 text-xs font-black text-slate-900 text-right">{formatCurrency(prod.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Histórico Recente de Vendas */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" />
                Histórico de Cupons Fiscais e Transações
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Últimas {sales.length} vendas</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atendente</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-bold uppercase">
                        Nenhuma venda registrada ainda
                      </td>
                    </tr>
                  ) : sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">{sale.code}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{sale.cashierName}</td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                          sale.status === SaleStatus.CANCELLED 
                            ? 'bg-red-50 text-red-600 border border-red-200' 
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}>
                          {sale.status === SaleStatus.CANCELLED ? 'Cancelada' : 'Concluída'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">
                        {sale.items?.reduce((a, b) => a + b.quantity, 0)} un ({sale.items?.length || 0} prod)
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-emerald-600 text-right">
                        {formatCurrency(sale.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
