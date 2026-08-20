import React, { useState } from 'react';
import { UserProfile, CompanyRole } from '../../types';
import { User, Mail, Phone, Shield, Key, Smartphone, LogOut, CheckCircle2, Loader2, Save, Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

export default function ProfileSettings({ user }: { user: UserProfile }) {
  const { showSuccess, showError } = useToast();
  const { logout, updateProfileDetails } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfileDetails({
        fullName: formData.name,
        phone: formData.phone
      });
      showSuccess('Seu perfil foi atualizado com sucesso.', 'Perfil Atualizado');
    } catch (err: any) {
      showError(err.message || 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <User className="w-6 h-6 text-emerald-500" />
              Meu Perfil
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Gerencie suas informações pessoais e preferências de conta
            </p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-rose-100 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center text-3xl font-black text-slate-400 overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <button className="absolute -bottom-2 -right-2 p-2 bg-emerald-500 text-slate-950 rounded-xl shadow-lg border-2 border-white hover:scale-110 transition-all">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="font-black text-slate-900">{user.name}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{user.role}</p>
              <p className="text-xs text-slate-500 mt-1">{user.email}</p>
            </div>
            
            <div className="w-full pt-4 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                <span>Status da Conta</span>
                <span className="text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ativa
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                <span>Membro Desde</span>
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <form onSubmit={handleSave} className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Informações Básicas
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Nome Completo
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> E-mail de Acesso
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> Celular / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Shield className="w-3 h-3" /> Nível de Acesso
                  </label>
                  <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs font-black text-slate-600 uppercase tracking-wider">
                    {user.role}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Save className="w-4 h-4 text-emerald-400" />
                  )}
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
