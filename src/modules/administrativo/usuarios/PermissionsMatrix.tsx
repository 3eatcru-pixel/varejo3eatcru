import React from 'react';
import { ShieldCheck, Check, X, Lock } from 'lucide-react';
import { DEFAULT_PERMISSIONS, PermissionKey } from '../../../lib/permissions';

export default function PermissionsMatrix() {
  const permissions = DEFAULT_PERMISSIONS;

  const rows: { key: PermissionKey; label: string; description: string }[] = [
    { key: 'posAccess', label: 'Acesso à Frente de Caixa (PDV)', description: 'Registrar vendas, operar terminal de PDV e consultar catálogo' },
    { key: 'giveDiscount', label: 'Aplicar Desconto Especial', description: 'Autorizar abatimentos e descontos adicionais no checkout' },
    { key: 'cancelSale', label: 'Cancelar Venda ou Devolução', description: 'Estornar transação finalizada com devolução de itens ao estoque' },
    { key: 'viewReports', label: 'Visualizar Relatórios Financeiros', description: 'Acessar DRE, curva ABC, histórico consolidado e gráficos' },
    { key: 'manageStock', label: 'Ajustes e Balanço de Estoque', description: 'Lançar inventário, ajustar saldos e registrar transferências' },
    { key: 'manageFinancial', label: 'Gestão de Contas a Pagar / Receber', description: 'Dar baixa de títulos, registrar contas e gerenciar fluxo' },
    { key: 'manageUsers', label: 'Administração de Usuários & Perfis', description: 'Cadastrar novos operadores, gerentes e administradores' },
  ];

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              Matriz de Controle de Acesso Baseado em Perfis (RBAC)
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Políticas de segurança aplicadas rigorosamente pelas Firestore Security Rules no banco de dados
            </p>
          </div>

          <div className="px-3.5 py-2 bg-slate-900 text-emerald-400 font-mono text-xs font-bold rounded-2xl flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Blindagem Firestore Ativa</span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                <th className="p-4 pl-6">Funcionalidade / Operação</th>
                <th className="p-4 text-center">Administrador</th>
                <th className="p-4 text-center">Gerente</th>
                <th className="p-4 text-center">Operador de Caixa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {rows.map(row => (
                <tr key={row.key} className="hover:bg-slate-50 transition-all">
                  <td className="p-4 pl-6">
                    <div className="font-bold text-slate-900">{row.label}</div>
                    <div className="text-[11px] font-medium text-slate-400 mt-0.5">{row.description}</div>
                  </td>
                  
                  {/* Admin */}
                  <td className="p-4 text-center">
                    <span className="w-7 h-7 rounded-xl inline-flex items-center justify-center bg-emerald-500 text-slate-950 shadow-sm">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </span>
                  </td>

                  {/* Manager */}
                  <td className="p-4 text-center">
                    <span className={`w-7 h-7 rounded-xl inline-flex items-center justify-center shadow-sm ${permissions.manager[row.key] ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-300'}`}>
                      {permissions.manager[row.key] ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4" />}
                    </span>
                  </td>

                  {/* Cashier */}
                  <td className="p-4 text-center">
                    <span className={`w-7 h-7 rounded-xl inline-flex items-center justify-center shadow-sm ${permissions.cashier[row.key] ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-300'}`}>
                      {permissions.cashier[row.key] ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4" />}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
