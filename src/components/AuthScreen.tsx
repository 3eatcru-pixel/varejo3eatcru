import React, { useState } from 'react';
import LoginPage from '../auth/LoginPage';
import RegisterPage from '../auth/RegisterPage';
import ForgotPasswordPage from '../auth/ForgotPasswordPage';
import HQLoginPage from '../auth/HQLoginPage';

export type AuthViewMode = 'login' | 'register' | 'forgot_password' | 'hq_login';

interface AuthScreenProps {
  initialMode?: AuthViewMode;
}

export default function AuthScreen({ initialMode = 'login' }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthViewMode>(initialMode);

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Render Active Sub-Page */}
      {mode === 'login' && (
        <LoginPage
          onNavigateToRegister={() => setMode('register')}
          onNavigateToForgotPassword={() => setMode('forgot_password')}
          onNavigateToHQLogin={() => setMode('hq_login')}
        />
      )}

      {mode === 'register' && (
        <RegisterPage onBackToLogin={() => setMode('login')} />
      )}

      {mode === 'forgot_password' && (
        <ForgotPasswordPage onBackToLogin={() => setMode('login')} />
      )}

      {mode === 'hq_login' && (
        <HQLoginPage onBackToLogin={() => setMode('login')} />
      )}

      {/* Footer Branding */}
      <div className="mt-8 text-center">
        <p className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
          VarejoPro Enterprise • Desenvolvido com segurança e privacidade
        </p>
      </div>
    </div>
  );
}
