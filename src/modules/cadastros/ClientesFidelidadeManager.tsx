import React, { useState } from 'react';
import { Users, Award, MessageCircle } from 'lucide-react';
import ClientsList from './ClientsList';
import LoyaltyProgram from '../fidelidade/LoyaltyProgram';
import WhatsAppMarketing from '../whatsapp/WhatsAppMarketing';
import { UserProfile } from '../../types';

export default function ClientesFidelidadeManager({ user }: { user?: UserProfile }) {
  const [activeSubTab, setActiveSubTab] = useState<'clients' | 'loyalty' | 'whatsapp'>('clients');

  return (
    <div className="flex-1 bg-slate-100 flex flex-col overflow-hidden">
      {/* Sub-navigation Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('clients')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeSubTab === 'clients'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            Clientes Cadastrados
          </button>

          <button
            onClick={() => setActiveSubTab('loyalty')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeSubTab === 'loyalty'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400" />
            Clube de Fidelidade
          </button>

          <button
            onClick={() => setActiveSubTab('whatsapp')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeSubTab === 'whatsapp'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            WhatsApp Marketing
          </button>
        </div>
      </div>

      {/* Content View */}
      <div className="flex-1 overflow-y-auto">
        {activeSubTab === 'clients' && <ClientsList user={user} />}
        {activeSubTab === 'loyalty' && <LoyaltyProgram user={user} />}
        {activeSubTab === 'whatsapp' && <WhatsAppMarketing user={user} />}
      </div>
    </div>
  );
}
