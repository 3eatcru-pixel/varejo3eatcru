import React, { useState, useEffect } from 'react';
import { Database, Download, FileArchive, Folder, RefreshCw, CheckCircle2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function PlatformBackupCenter() {
  const [companiesCount, setCompaniesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const snap = await getDocs(collection(db, 'platform_companies'));
      setCompaniesCount(snap.size);
    } catch (e) {
      setCompaniesCount(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Status Integração Drive</p>
              <h3 className="text-2xl font-black text-emerald-400 tracking-tight">Ativo (Por Tenant)</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Folder className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            <span>Estrutura de pastas isolada por empresa</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Empresas Gerenciadas</p>
              <h3 className="text-2xl font-black text-slate-100 tracking-tight">{loading ? '...' : companiesCount}</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <Database className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <p className="mt-4 text-xs font-medium text-slate-400">
            Tenants ativos na plataforma HQ
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Último Backup Geral</p>
              <h3 className="text-2xl font-black text-slate-100 tracking-tight">Sob Demanda (Manual)</h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <RefreshCw className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <p className="mt-4 text-xs font-medium text-slate-400">
            Executado diretamente no painel do PDV/Cofre da Empresa
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Diretórios e Cofre de Backups por Empresa</h3>
          <span className="text-xs text-slate-400 font-mono">Google Drive API v3</span>
        </div>
        <div className="p-8 text-center text-slate-400">
          <Folder className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
          <p className="text-sm font-medium text-slate-300 mb-1">Backups Organizados por Tenant</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Cada empresa conecta o seu próprio Google Drive e gera cópias de segurança JSON com produtos, vendas, clientes e caixas em <code className="text-slate-300">VarejoPro / Companies / {'{companyId}'}</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
