import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Copy, 
  Check, 
  X, 
  Smartphone, 
  Clock, 
  ShieldCheck, 
  Settings, 
  AlertCircle 
} from 'lucide-react';
import { generatePixPayload } from '../lib/pix';
import { formatCurrency } from '../lib/utils';
import { useToast } from './Toast';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  customerName?: string;
  companyName?: string;
  onConfirmPayment: () => void;
}

export default function PixPaymentModal({
  isOpen,
  onClose,
  amount,
  customerName,
  companyName = 'VarejoPro Store',
  onConfirmPayment
}: PixPaymentModalProps) {
  const { showSuccess, showWarning } = useToast();
  const [pixKey, setPixKey] = useState<string>(() => {
    return localStorage.getItem('varejopro_pix_key') || 'financeiro@varejopro.com.br';
  });
  const [isEditingKey, setIsEditingKey] = useState<boolean>(false);
  const [tempPixKey, setTempPixKey] = useState<string>(pixKey);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [pixCode, setPixCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes timer

  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(300);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !pixKey) return;

    try {
      const payload = generatePixPayload({
        pixKey: pixKey.trim(),
        merchantName: companyName || 'VarejoPro',
        merchantCity: 'SAO PAULO',
        amount: amount,
        txId: `VP${Date.now().toString().slice(-10)}`,
        description: `Venda PDV ${customerName ? `- ${customerName}` : ''}`
      });

      setPixCode(payload);

      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }).then(url => {
        setQrCodeDataUrl(url);
      }).catch(err => {
        console.error('Erro ao gerar QRCode:', err);
      });
    } catch (e) {
      console.error('Erro ao calcular payload PIX:', e);
    }
  }, [isOpen, pixKey, amount, companyName, customerName]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      showSuccess('Código PIX Copia e Cola copiado com sucesso!', 'Copiado');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      showWarning('Não foi possível copiar automaticamente.', 'Aviso');
    }
  };

  const handleSaveKey = () => {
    if (!tempPixKey.trim()) {
      showWarning('A Chave PIX não pode ficar vazia.', 'Chave Inválida');
      return;
    }
    setPixKey(tempPixKey.trim());
    localStorage.setItem('varejopro_pix_key', tempPixKey.trim());
    setIsEditingKey(false);
    showSuccess('Chave PIX atualizada com sucesso!', 'Configuração Salva');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base uppercase tracking-wider">Pagamento PIX Dinâmico</h3>
              <p className="text-xs text-emerald-100 font-medium">Apresente o QR Code ao cliente</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-all text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Amount Badge */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
              Valor Total a Pagar
            </span>
            <span className="text-3xl font-black text-emerald-600 tracking-tight">
              {formatCurrency(amount)}
            </span>
          </div>

          {/* QR Code Display Area */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-dashed border-emerald-300">
            {qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code PIX" 
                className="w-56 h-56 object-contain rounded-xl shadow-sm"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                <Smartphone className="w-8 h-8 animate-bounce text-emerald-500" />
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 text-xs font-bold text-slate-500">
              <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Expira em: <strong className="text-slate-800">{formatTimer(timeLeft)}</strong></span>
            </div>
          </div>

          {/* Key configuration toggle */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
            {!isEditingKey ? (
              <div className="flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Chave PIX do Estabelecimento:</span>
                  <span className="font-bold text-slate-800 truncate">{pixKey}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTempPixKey(pixKey);
                    setIsEditingKey(true);
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  title="Alterar Chave PIX"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Informe a Chave PIX (E-mail, CPF, CNPJ, Celular ou Aleatória):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempPixKey}
                    onChange={(e) => setTempPixKey(e.target.value)}
                    placeholder="ex: chave@empresa.com.br"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingKey(false)}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleCopyCode}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-200"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copied ? 'Código PIX Copiado!' : 'Copiar Código PIX (Copia e Cola)'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onConfirmPayment();
                onClose();
              }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Confirmar Recebimento do PIX</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
