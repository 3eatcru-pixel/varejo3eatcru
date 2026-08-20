import React, { useState } from 'react';
import { Laptop, Smartphone, Globe, Shield, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function SessionsTab() {
  const { sessions, revokeSession } = useAuth();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const handleRevokeOne = async (sessionId: string) => {
    setLoadingAction(sessionId);
    try {
      await revokeSession(sessionId);
      setMsg('Sessão encerrada com sucesso.');
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(err.message || 'Erro ao encerrar sessão.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    setLoadingAction('all');
    try {
      await revokeSession(undefined, true);
      setMsg('Todas as outras sessões foram desconectadas.');
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg(err.message || 'Erro ao desconectar sessões.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
            Dispositivos & Sessões Conectadas
          </h3>
          <p className="text-xs font-bold text-slate-400">
            Controle os navegadores e aplicativos onde sua conta está atualmente aberta
          </p>
        </div>

        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAllOthers}
            disabled={loadingAction === 'all'}
            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-black text-xs uppercase tracking-wider px-4 py-2 rounded-2xl transition-all flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {loadingAction === 'all' ? 'Desconectando...' : 'Encerrar Outras Sessões'}
          </button>
        )}
      </div>

      {msg && (
        <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}

      <div className="divide-y divide-slate-100 border border-slate-200 rounded-3xl overflow-hidden bg-white">
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">
            Sua sessão atual está ativa e protegida.
          </div>
        ) : (
          sessions.map((sess, idx) => (
            <div key={sess.id || idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 text-slate-800 rounded-2xl flex items-center justify-center font-black">
                  {sess.device?.includes('Smartphone') ? (
                    <Smartphone className="w-5 h-5 text-slate-600" />
                  ) : (
                    <Laptop className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2">
                    {sess.browser || 'Navegador Web'} • {sess.os || 'Sistema'}
                    {idx === 0 && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase">
                        Sessão Atual
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                    {sess.device || 'Dispositivo'} • Conectado em {sess.createdAt ? new Date(sess.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Recentemente'}
                  </p>
                </div>
              </div>

              {idx !== 0 && (
                <button
                  onClick={() => handleRevokeOne(sess.id)}
                  disabled={loadingAction === sess.id}
                  className="text-xs font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 py-1.5 px-3 rounded-xl hover:bg-rose-50 transition-all"
                >
                  {loadingAction === sess.id ? 'Encerrando...' : 'Desconectar'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
