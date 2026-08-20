import React, { useState } from 'react';
import { 
  Store, 
  Lock, 
  Mail, 
  User, 
  ArrowLeft, 
  UserPlus, 
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Building
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface RegisterPageProps {
  onBackToLogin: () => void;
}

export default function RegisterPage({ onBackToLogin }: RegisterPageProps) {
  const { registerWithEmail } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await registerWithEmail(name, email, password, companyName);
    } catch (err: any) {
      console.error("Register error:", err);
      setError(err.message || 'Erro ao criar conta. Verifique sua conexão e tente novamente.');
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
        <div className="w-14 h-14 bg-emerald-500 text-slate-950 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 font-black">
          <UserPlus className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900">
          Criar Conta & Loja
        </h2>
        <p className="text-xs font-bold text-slate-400">
          Cadastre seu perfil de administrador para começar a operar no VarejoPro
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold animate-in shake">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
            Nome da Empresa
          </label>
          <div className="relative">
            <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: Mercadinho São José"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
            Nome Completo do Admin
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos Oliveira"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
            E-mail Profissional
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="carlos@minhaempresa.com.br"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 dígitos"
                className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
              Confirmar Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Criar Conta e Iniciar
            </>
          )}
        </button>
      </form>
    </div>
  );
}
