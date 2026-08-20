import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Download, X, Globe, ShieldCheck, Loader2 } from 'lucide-react';
import { DOWNLOAD_CONFIG } from '../config/downloads';

interface DownloadsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReleaseInfo {
  version: string;
  windows: string;
  android: string;
  publishedAt: string;
}

export default function DownloadsModal({ isOpen, onClose }: DownloadsModalProps) {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/releases/latest')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.release) {
            setRelease(data.release);
          }
        })
        .catch(err => console.error('Failed to fetch release info', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-2 text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Download className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
            Central de Downloads
          </h2>
          <p className="text-xs font-bold text-slate-500">
            Instale o 3eatcru Varejo nativamente no seu dispositivo ou acesse via Web PWA.
          </p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Windows Installer */}
              <a
                href={release?.windows || DOWNLOAD_CONFIG.windows}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 transition-all flex flex-col items-center text-center space-y-3 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Windows (Desktop)</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Instalador nativo (.exe)</p>
                </div>
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1 mt-auto">
                  Baixar para Windows <Download className="w-3.5 h-3.5" />
                </span>
              </a>

              {/* Android APK */}
              <a
                href={release?.android || DOWNLOAD_CONFIG.android}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 transition-all flex flex-col items-center text-center space-y-3 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Android (PDV / Celular)</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Aplicativo APK oficial</p>
                </div>
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1 mt-auto">
                  Baixar APK <Download className="w-3.5 h-3.5" />
                </span>
              </a>
            </div>

            {/* WebApp Info */}
            <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl flex items-center gap-3">
              <Globe className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-white uppercase tracking-wider">Versão Web / PWA</p>
                <p className="text-slate-400 font-medium mt-0.5">Acesse diretamente pelo navegador de qualquer dispositivo com suporte a offline sync.</p>
              </div>
            </div>
            
            <div className="text-center pt-2">
              <p className="text-[10px] font-bold text-slate-400 flex flex-col items-center justify-center gap-1 uppercase tracking-wider">
                <span className="flex items-center gap-1 text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
                  Canal Oficial de Distribuição
                </span>
                <span className="text-slate-700 font-mono mt-0.5">Versão {release?.version || '10.2.0-alfa'}</span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
