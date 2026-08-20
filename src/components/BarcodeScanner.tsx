import React, { useState } from 'react';
import { Camera, X, QrCode, Sparkles } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState('');

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Escanear / Digitar Código</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center justify-center gap-6">
          {/* Visual Camera Simulation */}
          <div className="w-full aspect-video bg-slate-900 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center border-2 border-dashed border-emerald-500/50">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent animate-pulse" />
            <Camera className="w-10 h-10 text-emerald-400 mb-2 animate-bounce" />
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Leitor Óptico Ativo</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Aponte o código de barras para a câmera</p>
            
            {/* Corner Markers */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
          </div>

          <div className="w-full relative flex items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">ou digite o código</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleSubmitManual} className="w-full flex gap-2">
            <input 
              type="text" 
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ex: 7891234567890"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            <button 
              type="submit"
              className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 shrink-0"
            >
              Confirmar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
