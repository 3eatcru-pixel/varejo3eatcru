import React from 'react';
import { UserProfile } from '../../types';
import { Building2, Users, ShieldCheck, Sliders, Receipt, Archive, ShieldAlert, CreditCard, ChevronRight, Activity, Zap, BarChart3 } from 'lucide-react';

interface AdminDashboardProps {
  user: UserProfile;
  onNavigate: (tab: any) => void;
}

export default function AdminDashboard({ user, onNavigate }: AdminDashboardProps) {
  const adminCards = [
    { id: 'admin_branding', label: 'Dados & Identidade', description: 'Logo, cores, endereços e contatos comerciais.', icon: Building2, color: 'bg-emerald-500' },
    { id: 'admin_equipe', label: 'Equipe & Funcionários', description: 'Gestão de colaboradores, cargos e comissões.', icon: Users, color: 'bg-blue-500' },
    { id: 'admin_usuarios', label: 'Acesso ao Sistema', description: 'Controle de quem pode entrar e usar o VarejoPro.', icon: ShieldCheck, color: 'bg-indigo-500' },
    { id: 'admin_configuracoes', label: 'Regras de Negócio', description: 'Parâmetros de venda, estoque e operação.', icon: Sliders, color: 'bg-amber-500' },
    { id: 'fiscal_documentos', label: 'Fiscal & Impostos', description: 'Configuração de tributos e documentos fiscais.', icon: Receipt, color: 'bg-rose-500' },
    { id: 'admin_arquivos', label: 'Cofre de Arquivos', description: 'Armazenamento seguro de documentos e mídias.', icon: Archive, color: 'bg-slate-700' },
    { id: 'admin_auditoria', label: 'Trilha de Auditoria', description: 'Histórico detalhado de todas as ações críticas.', icon: ShieldAlert, color: 'bg-orange-500' },
    { id: 'admin_billing', label: 'Assinatura & Planos', description: 'Gestão de pagamento e limites da plataforma.', icon: CreditCard, color: 'bg-cyan-500' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-emerald-500" />
              Administração da Empresa
            </h2>
            <p className="text-sm font-bold text-slate-500 mt-1">
              Centro de controle mestre para proprietários e gestores do VarejoPro
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <Activity className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Status da Empresa</p>
                <p className="text-xs font-black text-slate-900">Operação Normal</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Colaboradores</p>
            <p className="text-2xl font-black text-slate-900">12</p>
            <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
              <Zap className="w-3 h-3" /> Todos Ativos
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Unidades / Filiais</p>
            <p className="text-2xl font-black text-slate-900">01</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Matriz Ativa</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Plano Atual</p>
            <p className="text-2xl font-black text-emerald-600">PROFISSIONAL</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Renova em 12 Dias</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Uso de Dados</p>
            <p className="text-2xl font-black text-slate-900">4.2 GB</p>
            <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full w-[42%]" />
            </div>
          </div>
        </div>

        {/* Admin Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {adminCards.map((card) => (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id)}
              className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5 transition-all text-left flex flex-col justify-between h-48"
            >
              <div className="space-y-3">
                <div className={`w-12 h-12 ${card.color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">{card.label}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Acessar Módulo
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

        {/* Platform Alerts / Audit Mini-Feed */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Monitoramento da Empresa
            </h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
              Ver Relatório Completo
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Últimas Ações Administrativas</h4>
              <div className="space-y-3">
                {[
                  { user: 'Marcos (Owner)', action: 'Alterou permissão de Gerente', time: '10 min atrás' },
                  { user: 'Sistema', action: 'Backup concluído com sucesso', time: '1 hora atrás' },
                  { user: 'Admin', action: 'Novo funcionário cadastrado', time: '3 horas atrás' },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-300">{log.user}:</span>
                    <span className="text-slate-500 truncate">{log.action}</span>
                    <span className="ml-auto text-[10px] text-slate-600 whitespace-nowrap">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Alertas de Conformidade</h4>
              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                  <CheckCircle2 className="w-4 h-4" /> Conformidade Digital
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Todos os certificados digitais e tokens de API estão válidos e ativos. Próxima revisão necessária em 45 dias.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
