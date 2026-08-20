import React, { useState } from 'react';
import { ShieldAlert, Lock, Mail, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HQLoginPageProps {
  onBackToLogin: () => void;
}

export default function HQLoginPage({ onBackToLogin }: HQLoginPageProps) {
  const { hqLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleHQLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, informe e-mail e senha administrativa.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await hqLogin(email, password);
    } catch (err: any) {
      console.error("HQ Login error:", err);
      setError('Credenciais inválidas ou acesso não autorizado ao HQ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToLogin}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> Área Restrita HQ
        </span>
      </div>

      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-amber-500 text-slate-950 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 font-black">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-wider text-white">
          3eatcru <span className="text-amber-400">Varejo HQ</span>
        </h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Autenticação de Administrador de Plataforma
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-xs font-bold">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleHQLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
            E-mail do Administrador HQ
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hq.admin@varejopro.com"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
            Senha de Acesso HQ
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Acessar Painel HQ
            </>
          )}
        </button>
      </form>
    </div>
  );
}
