import React, { useState } from 'react';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps) {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await sendPasswordReset(email);
      setFeedbackMessage(res.message);
      setSubmitted(true);
    } catch (err: any) {
      setFeedbackMessage('Se houver uma conta associada a este e-mail, enviaremos as instruções de recuperação.');
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <button
        onClick={onBackToLogin}
        className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para o Login
      </button>

      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
          <Mail className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
          Recuperar Senha
        </h2>
        <p className="text-xs font-bold text-slate-500">
          Informe seu e-mail cadastrado para receber o link seguro de redefinição de senha
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="text-xs font-black uppercase text-emerald-950">Solicitação Enviada</h4>
            <p className="text-xs font-medium text-emerald-800 leading-relaxed">
              {feedbackMessage}
            </p>
          </div>
          <button
            onClick={onBackToLogin}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md"
          >
            Ir para o Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
              E-mail da sua Conta
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@empresa.com.br"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>Por motivos de segurança, você receberá um link oficial com validade temporária diretamente na sua caixa de entrada.</span>
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Enviando link...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar Link de Recuperação
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
