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
  BarChart3, 
  DollarSign, 
  ShoppingBag, 
  PieChart as PieChartIcon,
  Printer,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingDown,
  ArrowDownRight,
  Download
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { db } from '../../lib/firebase';
import { Sale, SaleStatus, FinancialRecord, RecordType, RecordStatus, UserProfile } from '../../types';
import { formatCurrency } from '../../lib/utils';

const PAYMENT_COLORS: Record<string, string> = {
  pix: '#10B981',
  credito: '#3B82F6',
  debito: '#6366F1',
  dinheiro: '#F59E0B'
};

type PeriodFilter = 'today' | '7days' | '30days' | 'month' | 'all';

export default function ExecutiveReports({ user }: { user?: UserProfile }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('30days');

  const companyId = user?.companyId || '';

  useEffect(() => {
    if (!companyId) return;

    const qSales = query(
      collection(db, 'sales'),
      where('companyId', '==', companyId),
      limit(500)
    );
    const unsubSales = onSnapshot(qSales, (snap) => {
      const list: Sale[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Sale);
      });
      list.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
      setSales(list);
    }, (err) => {
      console.warn('Erro ao carregar vendas para relatórios executivos:', err);
    });

    const qFin = query(collection(db, 'financial_records'), where('companyId', '==', companyId), limit(500));
    const unsubFin = onSnapshot(qFin, (snap) => {
      const list: FinancialRecord[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as FinancialRecord);
      });
      setFinancials(list);
    }, () => {});

    return () => {
      unsubSales();
      unsubFin();
    };
  }, [companyId]);

  // Date filtering logic
  const now = new Date();

  const isWithinPeriod = (dateString?: string) => {
    if (period === 'all') return true;
    if (!dateString) return true;
    const itemDate = new Date(dateString);
    if (isNaN(itemDate.getTime())) return true; // handle invalid dates
    const diffMs = now.getTime() - itemDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (period === 'today') return itemDate.toDateString() === now.toDateString();
    if (period === '7days') return diffDays <= 7;
    if (period === '30days') return diffDays <= 30;
    if (period === 'month') return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    return true;
  };

  const filteredSales = sales.filter(s => {
    // If it's a firebase timestamp, convert to ISO string or use .toDate()
    const dStr = s.createdAt?.toDate ? s.createdAt.toDate().toISOString() : s.createdAt;
    return isWithinPeriod(dStr);
  });

  const filteredFinancials = financials.filter(f => {
    const dStr = f.createdAt?.toDate ? f.createdAt.toDate().toISOString() : f.createdAt;
    return isWithinPeriod(dStr);
  });

  const completedSales = filteredSales.filter(s => s.status === SaleStatus.COMPLETED);
  const cancelledSales = filteredSales.filter(s => s.status === SaleStatus.CANCELLED);

  // Totals
  const grossRevenue = completedSales.reduce((acc, s) => acc + (s.subtotal || s.total), 0);
  const totalDiscounts = completedSales.reduce((acc, s) => acc + (s.discount || 0), 0);
  const netSalesRevenue = completedSales.reduce((acc, s) => acc + s.total, 0);
  const totalCancelledVal = cancelledSales.reduce((acc, s) => acc + s.total, 0);

  const totalSalesCount = completedSales.length;
  const averageTicket = totalSalesCount > 0 ? netSalesRevenue / totalSalesCount : 0;

  // Payments Breakdown
  const paymentTotals: Record<string, number> = {};
  completedSales.forEach(s => {
    const method = s.paymentMethod || 'OUTRO';
    paymentTotals[method] = (paymentTotals[method] || 0) + s.total;
  });

  const paymentPieData = Object.keys(paymentTotals).map(m => ({
    name: m.toUpperCase(),
    value: paymentTotals[m]
  }));

  // Sales by Origin Breakdown (PDV vs Pulse Portal)
  const originTotals: Record<string, number> = {};
  completedSales.forEach(s => {
    // Pulse orders often have the generic user ID of the pulse portal or notes with 'pulse'
    // or origin field if provided
    const isPulse = (s as any).origin === 'PULSE' || ((s.notes || '').toLowerCase().includes('pulse')) || s.cashierUid === 'pulse_portal';
    const originName = isPulse ? 'Pulse Portal (Autoatendimento)' : 'PDV (Caixa Presencial)';
    originTotals[originName] = (originTotals[originName] || 0) + s.total;
  });

  const originPieData = Object.keys(originTotals).map(m => ({
    name: m,
    value: originTotals[m]
  }));

  // Top Sold Products
  const productSalesMap: Record<string, { name: string; qty: number; total: number }> = {};
  completedSales.forEach(s => {
    s.items.forEach(item => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.productName, qty: 0, total: 0 };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].total += item.total;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Financial Expenses split
  const paidFinancials = filteredFinancials.filter(f => f.type === RecordType.PAYABLE && f.status === RecordStatus.PAID);
  
  const cmvExpenses = paidFinancials
    .filter(f => f.category.toLowerCase().includes('fornecedor') || f.category.toLowerCase().includes('compra'))
    .reduce((a, b) => a + b.amount, 0);

  const operationalExpenses = paidFinancials
    .filter(f => !f.category.toLowerCase().includes('fornecedor') && !f.category.toLowerCase().includes('compra'))
    .reduce((a, b) => a + b.amount, 0);

  const grossProfit = netSalesRevenue - cmvExpenses;
  const netProfitDRE = grossProfit - operationalExpenses;
  const marginPercent = netSalesRevenue > 0 ? (netProfitDRE / netSalesRevenue) * 100 : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['DRE GERENCIAL / RELATORIO EXECUTIVO'],
      [`Periodo: ${period.toUpperCase()}`, `Gerado em: ${new Date().toLocaleString('pt-BR')}`],
      [],
      ['INDICADOR', 'VALOR (R$)'],
      ['Receita Bruta (Vendas)', grossRevenue.toFixed(2)],
      ['Descontos Concedidos', (-totalDiscounts).toFixed(2)],
      ['Receita Liquida', netSalesRevenue.toFixed(2)],
      ['Custos Variaveis (CMV)', (-cmvExpenses).toFixed(2)],
      ['Lucro Bruto', grossProfit.toFixed(2)],
      ['Despesas Operacionais', (-operationalExpenses).toFixed(2)],
      ['RESULTADO LIQUIDO', netProfitDRE.toFixed(2)],
      ['Margem Liquida (%)', `${marginPercent.toFixed(2)}%`],
      ['Total de Vendas Concluidas', String(totalSalesCount)],
      ['Ticket Medio', averageTicket.toFixed(2)],
      ['Cancelamentos/Estornos', totalCancelledVal.toFixed(2)],
      [],
      ['FORMA DE PAGAMENTO', 'VALOR TOTAL (R$)'],
      ...paymentPieData.map(p => [p.name, p.value.toFixed(2)]),
      [],
      ['TOP PRODUTOS VENDIDOS', 'QUANTIDADE', 'TOTAL (R$)'],
      ...topProducts.map(tp => [tp.name, String(tp.qty), tp.total.toFixed(2)])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map(e => e.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DRE_Executivo_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 bg-slate-100 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6">
      {/* Header & Period Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <span>Relatórios Gerenciais & DRE Executivo</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Demonstrativo de resultado do exercício, lucratividade e análise por forma de pagamento
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Filter Buttons */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 flex-wrap">
            <button
              onClick={() => setPeriod('today')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                period === 'today' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('7days')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                period === '7days' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriod('30days')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                period === '30days' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                period === 'month' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                period === 'all' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tudo
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => {
              document.body.classList.remove('print-58mm');
              handlePrint();
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Imprimir DRE (80mm)</span>
          </button>
           <button
            onClick={() => {
              document.body.classList.add('print-58mm');
              handlePrint();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>58mm</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Faturamento Líquido</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{formatCurrency(netSalesRevenue)}</p>
          <span className="text-[10px] text-slate-400 block pt-1">{totalSalesCount} Vendas Concluídas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ticket Médio</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(averageTicket)}</p>
          <span className="text-[10px] text-slate-400 block pt-1">Média por pedido</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Margem Líquida</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${marginPercent >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {marginPercent.toFixed(1)}%
            </span>
          </div>
          <p className={`text-2xl font-black ${netProfitDRE >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(netProfitDRE)}
          </p>
          <span className="text-[10px] text-slate-400 block pt-1">Resultado Líquido</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cancelamentos</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">{formatCurrency(totalCancelledVal)}</p>
          <span className="text-[10px] text-slate-400 block pt-1">{cancelledSales.length} Cupons Estornados</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Origem das Vendas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-emerald-500" />
            Origem de Vendas
          </h3>

          <div className="h-56 w-full">
            {originPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={originPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ? name.split(' ')[0] : ''} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {originPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#3B82F6'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                Sem dados de origem
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-emerald-500" />
            Vendas por Forma de Pagamento
          </h3>

          <div className="h-56 w-full">
            {paymentPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {paymentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.name.toLowerCase()] || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                Nenhum dado registrado para o período selecionado
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Products Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-500" />
            Top 5 Produtos Mais Vendidos (Qtd)
          </h3>

          <div className="h-56 w-full">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: any) => `${value || 0} un`} />
                  <Bar dataKey="qty" fill="#10B981" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                Nenhuma venda registrada no período selecionado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DRE Simplificado */}
      <div id="printable-receipt" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:w-[80mm] print:border-none print:shadow-none print:p-0 print:m-0">
        <div className="flex flex-col gap-1 pb-4 border-b border-slate-100 print:border-dashed print:border-slate-400 print:pb-2">
           <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
             <DollarSign className="w-4 h-4 text-emerald-600 no-print" />
             DRE GERENCIAL (Caixa)
           </h3>
           <p className="text-[10px] text-slate-400 font-bold">Período Selecionado: {period.toUpperCase()}</p>
        </div>

        <div className="space-y-3 text-xs font-medium text-slate-700 print:text-[11px] print:space-y-1">
          <div className="flex justify-between py-1.5 border-b border-slate-50 print:border-none">
            <span className="font-bold text-slate-800">(+) Receita Bruta (Vendas)</span>
            <span className="font-black text-slate-900">{formatCurrency(grossRevenue)}</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-50 text-amber-600 print:border-none print:text-black">
            <span>(-) Descontos Concedidos</span>
            <span className="font-bold">- {formatCurrency(totalDiscounts)}</span>
          </div>

          <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-xl font-black text-slate-900 text-[13px] print:bg-transparent print:px-0 print:text-[12px] print:py-1">
            <span>(=) Receita Líquida</span>
            <span className="text-emerald-600 print:text-black">{formatCurrency(netSalesRevenue)}</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-50 text-rose-600 print:border-none print:text-black">
            <span>(-) Custos Variáveis (CMV/Compras)</span>
            <span className="font-bold">- {formatCurrency(cmvExpenses)}</span>
          </div>

          <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-xl font-black text-slate-900 text-[13px] print:bg-transparent print:px-0 print:text-[12px] print:py-1">
            <span>(=) Lucro Bruto</span>
            <span className="text-emerald-600 print:text-black">{formatCurrency(grossProfit)}</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-slate-50 text-rose-600 print:border-none print:text-black">
            <span>(-) Despesas Operacionais (Fixas/Outras)</span>
            <span className="font-bold">- {formatCurrency(operationalExpenses)}</span>
          </div>

          <div className="flex justify-between items-center py-3 bg-slate-900 text-white px-4 rounded-xl font-black text-base print:bg-transparent print:text-black print:px-0 print:py-1 print:border-t print:border-slate-800 print:rounded-none">
            <span>(=) RESULTADO LÍQUIDO</span>
            <span className={netProfitDRE >= 0 ? "text-emerald-400 print:text-black" : "text-rose-400 print:text-black"}>
              {formatCurrency(netProfitDRE)}
            </span>
          </div>
          
          <div className="text-right pt-2 no-print">
            <span className={"text-[10px] font-black uppercase px-2 py-1 rounded-full " + (marginPercent >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
              Margem: {marginPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
