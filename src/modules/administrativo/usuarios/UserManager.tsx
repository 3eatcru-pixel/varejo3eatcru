import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Mail, 
  CheckCircle2, 
  UserPlus,
  Shield,
  Clock,
  Trash2,
  AlertCircle,
  KeyRound,
  X,
  Sparkles,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { UserProfile } from '../../../types';
import { CompanyRole } from '../../../types/identity';
import { CompanyEntitlements } from '../../../types/licensing';

import { DeviceService } from '../../../services/deviceService';
import { UpgradePlanModal } from '../../../components/UpgradePlanModal';

interface MemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: CompanyRole;
  status: string;
  createdAt: string;
}

interface InvitationItem {
  id: string;
  name: string;
  email: string;
  role: CompanyRole;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function UserManager({ currentUser }: { currentUser?: UserProfile }) {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [entitlements, setEntitlements] = useState<CompanyEntitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeBlockTitle, setUpgradeBlockTitle] = useState<string | undefined>();
  const [upgradeBlockMsg, setUpgradeBlockMsg] = useState<string | undefined>();

  // New Invitation Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CompanyRole>(CompanyRole.CASHIER);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTeam = async () => {
    if (!localStorage.getItem('varejopro_auth_token')) return;
    try {
      const idToken = localStorage.getItem('varejopro_auth_token');
      const [membersRes, entData] = await Promise.all([
        fetch('/api/company/members', {
          headers: { Authorization: `Bearer ${idToken}` }
        }),
        DeviceService.getEntitlements().catch(() => ({ success: false, entitlements: null }))
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
        setInvitations(data.invitations || []);
      }

      if (entData?.entitlements) {
        setEntitlements(entData.entitlements);
      }
    } catch (err) {
      console.warn("Error fetching members:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [currentUser?.companyId]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !localStorage.getItem('varejopro_auth_token')) return;

    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const idToken = localStorage.getItem('varejopro_auth_token');
      const res = await fetch('/api/company/members/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 402 || err.code === 'PLAN_LIMIT_REACHED' || err.code === 'FEATURE_NOT_AVAILABLE') {
          setIsModalOpen(false);
          setUpgradeBlockTitle('Convite de Funcionários');
          setUpgradeBlockMsg(err.error || 'O plano gratuito permite 1 usuário. Para convidar membros da equipe, ative o Trial PRO ou faça upgrade.');
          setIsUpgradeModalOpen(true);
          return;
        }
        throw new Error(err.error || 'Erro ao criar convite.');
      }

      setSuccessMsg(`Convite gerado com sucesso para "${name}" (${email.trim()}). Ao criar a conta ou fazer login, o acesso será vinculado.`);
      setName('');
      setEmail('');
      setIsModalOpen(false);
      await fetchTeam();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao enviar convite.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (membershipId: string, targetName: string, newRole: CompanyRole) => {
    if (!localStorage.getItem('varejopro_auth_token')) return;
    try {
      const idToken = localStorage.getItem('varejopro_auth_token');
      const res = await fetch(`/api/company/members/${membershipId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'Erro ao alterar cargo.');
      } else {
        setSuccessMsg(`Cargo de ${targetName} atualizado com sucesso.`);
        await fetchTeam();
      }
    } catch (err: any) {
      console.error("Error updating role:", err);
      setErrorMsg(err.message || 'Erro ao atualizar cargo.');
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!localStorage.getItem('varejopro_auth_token') || !confirm('Deseja realmente revogar este convite pendente?')) return;
    try {
      const idToken = localStorage.getItem('varejopro_auth_token');
      await fetch(`/api/company/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setSuccessMsg('Convite revogado com sucesso.');
      await fetchTeam();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (membershipId: string, memberName: string) => {
    if (!localStorage.getItem('varejopro_auth_token') || !confirm(`Deseja realmente remover o acesso de "${memberName}" desta empresa?`)) return;
    try {
      const idToken = localStorage.getItem('varejopro_auth_token');
      const res = await fetch(`/api/company/members/${membershipId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao remover membro.');
      }
      setSuccessMsg(`Membro "${memberName}" removido da empresa.`);
      await fetchTeam();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao remover membro.');
    }
  };

  return (
    <div className="flex-1 bg-slate-100 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                entitlements?.status === 'TRIAL' 
                  ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                  : entitlements?.planTier === 'FREE' 
                  ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                Plano {entitlements?.planTier || 'FREE'} {entitlements?.status === 'TRIAL' ? '• TRIAL ATIVO' : ''}
              </span>
              <span className="text-xs font-bold text-slate-400">
                • {members.length} / {entitlements?.limits.users || 1} vagas de usuários utilizadas
              </span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-500" />
              Gestão de Membros & Operadores da Empresa
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Controle cargos, permissões operacionais e convites de acesso para a sua equipe
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setUpgradeBlockTitle('Planos & Assinaturas VarejoPro');
                setUpgradeBlockMsg('Escolha o plano ideal para expandir o número de usuários, filiais e dispositivos da sua empresa.');
                setIsUpgradeModalOpen(true);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-3 rounded-2xl transition-all flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              Ver Planos
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-3 rounded-2xl transition-all shadow-md flex items-center gap-2 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Convidar Membro / Operador
            </button>
          </div>
        </div>

        {/* Free Plan / Quota Notice Banner */}
        {entitlements?.planTier === 'FREE' && entitlements?.status !== 'TRIAL' && (
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-md border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-200">
                  Plano Gratuito: 1 Usuário Proprietário
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Para convidar operadores de caixa, estoquistas e gerentes, inicie o Trial PRO de 14 dias ou faça upgrade.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setUpgradeBlockTitle('Ativar Trial PRO (14 dias)');
                setUpgradeBlockMsg('Experimente o VarejoPro com até 5 usuários, múltiplos terminais PDV e emissão fiscal por 14 dias sem compromisso.');
                setIsUpgradeModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 shrink-0 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ativar Trial Gratuito (14 dias)
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 text-rose-800 rounded-2xl border border-rose-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Active Members Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Membros Ativos ({members.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {members.length === 0 && !loading && (
              <div className="p-8 text-center text-slate-400 text-xs font-bold">
                Nenhum membro ativo encontrado.
              </div>
            )}

            {members.map(usr => (
              <div key={usr.id} className="p-4 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm">
                    {usr.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                      {usr.name}
                      {usr.userId === currentUser?.uid && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase font-black">
                          Sua Conta
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {usr.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-slate-400">Cargo:</span>
                  <select
                    value={usr.role}
                    disabled={usr.role === CompanyRole.OWNER}
                    onChange={e => handleUpdateRole(usr.id, usr.name, e.target.value as CompanyRole)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-60"
                  >
                    <option value={CompanyRole.OWNER}>Proprietário (Owner)</option>
                    <option value={CompanyRole.ADMIN}>Administrador</option>
                    <option value={CompanyRole.MANAGER}>Gerente de Loja</option>
                    <option value={CompanyRole.CASHIER}>Operador de Caixa</option>
                    <option value={CompanyRole.STOCK}>Estoquista / Compras</option>
                    <option value={CompanyRole.VIEWER}>Visualizador / Auditor</option>
                  </select>

                  {usr.role !== CompanyRole.OWNER && usr.userId !== currentUser?.uid && (
                    <button
                      onClick={() => handleRemoveMember(usr.id, usr.name)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                      title={`Remover ${usr.name} da empresa`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invitations Table */}
        {invitations.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-amber-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Convites Pendentes ({invitations.length})
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {invitations.map(inv => (
                <div key={inv.id} className="p-4 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                        {inv.name}
                        <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase font-black">
                          Aguardando Aceite
                        </span>
                      </h4>
                      <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {inv.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                      Cargo: {inv.role}
                    </span>

                    <button
                      onClick={() => handleRevokeInvitation(inv.id)}
                      className="text-xs font-black uppercase text-rose-600 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1"
                      title="Revogar Convite"
                    >
                      <Trash2 className="w-4 h-4" />
                      Revogar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Convidar Usuário */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-6 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-500" />
                  Convidar Novo Membro
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                    E-mail do Convidado
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="joao@minhaempresa.com.br"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                    Cargo na Empresa
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as CompanyRole)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  >
                    <option value={CompanyRole.CASHIER}>Operador de Caixa</option>
                    <option value={CompanyRole.MANAGER}>Gerente de Loja</option>
                    <option value={CompanyRole.STOCK}>Estoquista / Compras</option>
                    <option value={CompanyRole.ADMIN}>Administrador</option>
                    <option value={CompanyRole.VIEWER}>Visualizador / Auditor</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-black uppercase text-slate-500 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-2xl transition-all shadow-md"
                  >
                    {submitting ? 'Gerando Convite...' : 'Enviar Convite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Upgrade & Trial */}
        <UpgradePlanModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          currentPlan={entitlements?.planTier}
          entitlements={entitlements}
          blockedFeatureTitle={upgradeBlockTitle}
          blockedFeatureMessage={upgradeBlockMsg}
          onSuccess={fetchTeam}
        />

      </div>
    </div>
  );
}
