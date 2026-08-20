import React, { useState } from 'react';
import { User, Phone, MapPin, Globe, CheckCircle2, AlertCircle, Save, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileTab() {
  const { profile, updateProfileDetails } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [preferredName, setPreferredName] = useState(profile?.preferredName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [timezone, setTimezone] = useState(profile?.timezone || 'America/Sao_Paulo');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateProfileDetails({
        fullName,
        preferredName,
        phone,
        timezone
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações no perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Perfil atualizado com sucesso!</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-rose-800 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
            Nome Completo
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
            Nome de Exibição / Tratamento
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="Como prefere ser chamado"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
            Telefone / WhatsApp
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
            Fuso Horário
          </label>
          <div className="relative">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            >
              <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
              <option value="America/Manaus">Manaus (GMT-4)</option>
              <option value="America/Cuiaba">Cuiabá (GMT-4)</option>
              <option value="America/Belem">Belém (GMT-3)</option>
              <option value="America/Fortaleza">Fortaleza (GMT-3)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button
          type="submit"
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-3 rounded-2xl transition-all shadow-md flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Informações'}
        </button>
      </div>
    </form>
  );
}
