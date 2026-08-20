import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, CheckCircle2, AlertCircle, Send, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function SecurityTab() {
  const { firebaseUser, changePassword, sendPasswordReset, sendVerificationEmail } = useAuth();
  const { account } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const [resetSent, setResetSent] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPassError('A senha atual é obrigatória.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPassError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('As senhas digitadas não coincidem.');
      return;
    }

    setSavingPass(true);
    setPassError(null);
    setPassSuccess(false);

    try {
      if (changePassword) {
        await changePassword(newPassword, currentPassword);
      }
      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(false), 4000);
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setPassError('Por segurança, faça login novamente antes de alterar sua senha.');
      } else {
        setPassError(err.message || 'Erro ao alterar senha.');
      }
    } finally {
      setSavingPass(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!firebaseUser?.email) return;
    try {
      await sendPasswordReset(firebaseUser.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleSendVerify = async () => {
    setVerifyLoading(true);
    try {
      if (sendVerificationEmail) {
        await sendVerificationEmail();
      }
      setVerifySent(true);
      setTimeout(() => setVerifySent(false), 5000);
    } catch (err) {
      console.warn(err);
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Email Verification Banner */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
            firebaseUser?.emailVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              E-mail da Conta: {firebaseUser?.email}
              {firebaseUser?.emailVerified ? (
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase">
                  Verificado
                </span>
              ) : (
                <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full uppercase">
                  Pendente de Verificação
                </span>
              )}
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              Utilizado para login, notificações de segurança e recuperação de credenciais
            </p>
          </div>
        </div>

        {!firebaseUser?.emailVerified && (
          <button
            type="button"
            onClick={handleSendVerify}
            disabled={verifyLoading || verifySent}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-2xl transition-all shrink-0"
          >
            {verifySent ? 'Link Enviado!' : verifyLoading ? 'Enviando...' : 'Verificar E-mail'}
          </button>
        )}
      </div>

      {/* Change Password Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 text-slate-800 rounded-2xl flex items-center justify-center font-black">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Alterar Senha de Acesso
            </h3>
            <p className="text-xs font-bold text-slate-400">
              Mantenha sua conta protegida com uma senha forte e exclusiva
            </p>
          </div>
        </div>

        {passSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Senha alterada com sucesso!</span>
          </div>
        )}

        {passError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-rose-800 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{passError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
              Senha Atual
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                Nova Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={handleSendResetEmail}
              className="text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors text-left"
            >
              {resetSent ? '✓ Link de redefinição enviado para seu e-mail' : 'Prefere redefinir via e-mail? Enviar link'}
            </button>

            <button
              type="submit"
              disabled={savingPass || !newPassword}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-2xl transition-all shadow-md"
            >
              {savingPass ? 'Salvando...' : 'Atualizar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
