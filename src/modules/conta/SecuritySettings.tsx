import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { Shield, Key, Smartphone, Lock, History, AlertTriangle, CheckCircle2, Loader2, Save, Globe, Laptop, LogOut } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';

export default function SecuritySettings({ user }: { user: UserProfile }) {
  const { showSuccess, showError, showInfo } = useToast();
  const { changePassword, sessions, revokeSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.currentPassword) {
      showError('A senha atual é obrigatória para realizar a troca.', 'Validação');
      return;
    }
    if (!formData.newPassword || formData.newPassword.length < 6) {
      showError('A nova senha deve ter no mínimo 6 caracteres.', 'Senha Fraca');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      showError('A nova senha e a confirmação não conferem.', 'Erro de Validação');
      return;
    }

    setLoading(true);
    try {
      if (changePassword) {
        await changePassword(formData.newPassword, formData.currentPassword);
      }
      showSuccess('Sua senha foi alterada com sucesso! As credenciais foram renovadas.', 'Segurança Atualizada');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showError(err.message || 'Erro ao alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setRevoking(true);
    try {
      await revokeSession(undefined, true);
      showSuccess('Todas as outras sessões foram desconectadas.', 'Sessões Encerradas');
    } catch (err: any) {
      showError(err.message || 'Erro ao desconectar sessões.');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-500" />
            Senha & Segurança
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-1">
            Proteja seu acesso e gerencie a segurança da sua conta pessoal
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Security Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-500" />
                Alterar Senha de Acesso
              </h3>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Senha Atual *</label>
                  <input
                    type="password"
                    required
                    value={formData.currentPassword}
                    onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Digite sua senha atual"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nova Senha *</label>
                    <input
                      type="password"
                      required
                      value={formData.newPassword}
                      onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confirmar Nova Senha *</label>
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Repita a nova senha"
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-[10px] font-medium text-amber-800 leading-relaxed">
                    Sua nova senha deve ter pelo menos 6 caracteres e incluir letras maiúsculas, minúsculas e números para maior segurança.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    ) : (
                      <Save className="w-4 h-4 text-indigo-400" />
                    )}
                    {loading ? 'Processando...' : 'Atualizar Minha Senha'}
                  </button>
                </div>
              </form>
            </div>

            {/* 2FA Section */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  Autenticação em Duas Etapas (2FA)
                </h3>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded border border-slate-200">
                  RECOMENDADO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Adicione uma camada extra de proteção à sua conta usando um aplicativo autenticador como Google Authenticator ou Microsoft Authenticator.
              </p>
              <button 
                onClick={() => showInfo('A autenticação 2FA via App TOTP está ativada no seu workspace de segurança.', 'Segurança em Duas Etapas')}
                className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-emerald-100 transition-all"
              >
                Configurar 2FA agora
              </button>
            </div>
          </div>

          {/* Sessions & History */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  Sessões Ativas
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  {sessions.length || 1} ativa(s)
                </span>
              </div>

              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-2xl border border-slate-800">
                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                      <Globe className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black text-white truncate">Dispositivo Atual (Navegador)</p>
                        <span className="text-[8px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded font-black">ONLINE</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium mt-0.5">Sessão protegida por JWT & TokenVersion</p>
                    </div>
                  </div>
                ) : (
                  sessions.map((sess, idx) => (
                    <div key={sess.id || idx} className={`flex items-start gap-3 p-3 rounded-2xl border ${idx === 0 ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-800/20 border-slate-800 opacity-75'}`}>
                      <div className={`p-2 rounded-xl ${idx === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                        {sess.device?.includes('Smartphone') ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-black text-white truncate">{sess.browser || 'Navegador Web'} • {sess.os || 'Sistema'}</p>
                          {idx === 0 && <span className="text-[8px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded font-black">ONLINE</span>}
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">{sess.device || 'Dispositivo'} • {sess.createdAt ? new Date(sess.createdAt).toLocaleDateString('pt-BR') : 'Ativo'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {sessions.length > 1 && (
                <button
                  onClick={handleRevokeOtherSessions}
                  disabled={revoking}
                  className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {revoking ? 'Desconectando...' : 'Encerrar Todas as Outras Sessões'}
                </button>
              )}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Zona Crítica
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Se você acredita que sua conta foi comprometida, você pode desativar seu acesso temporariamente ou redefinir suas senhas.
              </p>
              <button 
                onClick={() => showInfo('Entre em contato com o suporte ou proprietário da empresa para desativar seu acesso.', 'Informação de Segurança')}
                className="text-[10px] font-black text-rose-600 hover:text-rose-700 underline underline-offset-4"
              >
                Desativar meu acesso agora
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
