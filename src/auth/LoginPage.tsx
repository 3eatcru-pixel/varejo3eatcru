import React, { useState, useRef } from 'react';
import { 
  Store, 
  Lock, 
  Mail, 
  LogIn, 
  AlertCircle,
  Monitor,
  Smartphone,
  Download,
  ArrowLeft,
  Building,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DownloadsModal from '../components/DownloadsModal';

interface LoginPageProps {
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  onNavigateToHQLogin: () => void;
}

export default function LoginPage({ onNavigateToRegister, onNavigateToForgotPassword, onNavigateToHQLogin }: LoginPageProps) {
  const { loginWithEmail } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  
  // Workspace selection state
  const [workspaces, setWorkspaces] = useState<{ companyId: string; companyName: string; role: string }[] | null>(null);

  // 7-tap secret logo gesture for HQ Login (strictly click-based as click triggers flawlessly on both mouse & touch)
  const [logoClicks, setLogoClicks] = useState(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    const nextClicks = logoClicks + 1;
    if (nextClicks >= 7) {
      setLogoClicks(0);
      onNavigateToHQLogin();
      return;
    }

    setLogoClicks(nextClicks);
    clickTimerRef.current = setTimeout(() => {
      setLogoClicks(0);
    }, 2500); // 2.5s window to complete 7 taps
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loginWithEmail(email, password);
      if (result && result.requireWorkspaceSelection && result.workspaces) {
        setWorkspaces(result.workspaces);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || 'Erro ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkspace = async (companyId: string) => {
    setLoading(true);
    setError(null);
    try {
      await loginWithEmail(email, password, companyId);
    } catch (err: any) {
      console.error("Workspace selection error:", err);
      setError(err.message || 'Erro ao entrar no workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header with 7-tap Secret Gesture */}
        <div className="text-center space-y-2">
          <div 
            onClick={handleLogoClick}
            className="w-14 h-14 bg-emerald-500 text-slate-950 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 font-black cursor-pointer active:scale-95 transition-transform"
            title="3eatcru Varejo POS"
          >
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">
            3eatcru <span className="text-emerald-500">Varejo</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {workspaces ? 'Selecione seu Workspace' : 'Sistema de Gestão & PDV'}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold animate-in shake">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {workspaces ? (
          /* Multi-workspace Chooser View */
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium text-center">
              Identificamos múltiplas empresas vinculadas ao seu usuário. Selecione em qual deseja trabalhar hoje:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.companyId}
                  onClick={() => handleSelectWorkspace(ws.companyId)}
                  disabled={loading}
                  className="w-full p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl flex items-center justify-between text-left group transition-all duration-150 disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 group-hover:bg-emerald-200 text-slate-600 group-hover:text-emerald-800 flex items-center justify-center transition-colors">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800 group-hover:text-emerald-950">
                        {ws.companyName}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-600 uppercase tracking-wider">
                        Função: {ws.role === 'OWNER' ? 'Proprietário' : ws.role}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setWorkspaces(null)}
              disabled={loading}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
              Voltar ao Login
            </button>
          </div>
        ) : (
          /* Default Login Form */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@empresa.com.br"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={onNavigateToForgotPassword}
                  className="text-[11px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Esqueci a senha
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Entrar no Sistema
                </>
              )}
            </button>
          </form>
        )}

        {/* Download App Section */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">
            Também disponível para:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsDownloadsOpen(true)}
              className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-center gap-2 transition-all"
            >
              <Monitor className="w-4 h-4 text-blue-500" /> Windows
            </button>
            <button
              type="button"
              onClick={() => setIsDownloadsOpen(true)}
              className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-center gap-2 transition-all"
            >
              <Smartphone className="w-4 h-4 text-emerald-500" /> Android
            </button>
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsDownloadsOpen(true)}
              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Baixar aplicativo 3eatcru Varejo
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-xs font-bold text-slate-500">
            Precisa cadastrar nova filial?{' '}
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="text-emerald-600 hover:text-emerald-700 font-black uppercase tracking-wider ml-1"
            >
              Cadastrar Empresa
            </button>
          </p>
        </div>
      </div>

      <DownloadsModal 
        isOpen={isDownloadsOpen} 
        onClose={() => setIsDownloadsOpen(false)} 
      />
    </>
  );
}
