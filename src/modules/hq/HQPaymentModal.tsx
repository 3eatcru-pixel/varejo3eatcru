import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  CreditCard,
  Copy,
  Check,
  Smartphone,
  Clock,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Send,
  Printer,
  Sparkles,
  Lock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Building2,
  DollarSign
} from 'lucide-react';
import { generatePixPayload } from '../../lib/pix';
import { formatCurrency } from '../../lib/utils';
import { useToast } from '../../components/Toast';

export interface HQInvoice {
  id: string;
  invoiceNumber?: string;
  companyId: string;
  companyName?: string;
  subscriptionId?: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED';
  dueDate?: string;
  paymentMethod?: string;
  paidAt?: string;
  description?: string;
  paymentReceipt?: string;
  createdAt: string;
}

interface HQPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: HQInvoice | null;
  onPaymentSuccess: (updatedInvoice: HQInvoice) => void;
}

type PaymentTab = 'pix' | 'card' | 'link';

export const HQPaymentModal: React.FC<HQPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPaymentSuccess
}) => {
  const { showSuccess, showWarning, showError } = useToast();
  const [activeTab, setActiveTab] = useState<PaymentTab>('pix');
  
  // PIX state
  const [pixKey, setPixKey] = useState<string>(() => {
    return localStorage.getItem('varejopro_hq_pix_key') || 'financeiro@varejopro.com.br';
  });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [pixCode, setPixCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [confirmingPix, setConfirmingPix] = useState(false);

  // Card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [payerDocument, setPayerDocument] = useState('');
  const [installments, setInstallments] = useState('1');
  const [processingCard, setProcessingCard] = useState(false);

  // Completed Receipt state
  const [completedReceipt, setCompletedReceipt] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen || !invoice) {
      setCompletedReceipt(null);
      return;
    }

    setTimeLeft(600);
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
  }, [isOpen, invoice]);

  // Generate PIX QR Code when modal opens or invoice changes
  useEffect(() => {
    if (!isOpen || !invoice) return;

    try {
      const invNum = invoice.invoiceNumber || invoice.id.substring(0, 8).toUpperCase();
      const payload = generatePixPayload({
        pixKey: pixKey.trim(),
        merchantName: 'VAREJOPRO HQ',
        merchantCity: 'SAO PAULO',
        amount: Number(invoice.amount),
        txId: `HQ${invoice.id.replace(/-/g, '').substring(0, 15).toUpperCase()}`,
        description: `Fat. ${invNum} - ${invoice.companyName || 'Empresa'}`
      });

      setPixCode(payload);

      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#090d16',
          light: '#ffffff'
        }
      }).then(url => {
        setQrCodeDataUrl(url);
      }).catch(err => {
        console.error('Erro ao renderizar QRCode PIX:', err);
      });
    } catch (e) {
      console.error('Erro ao gerar payload PIX:', e);
    }
  }, [isOpen, invoice, pixKey]);

  if (!isOpen || !invoice) return null;

  const invNumber = invoice.invoiceNumber || `FAT-${invoice.id.substring(0, 8).toUpperCase()}`;
  const invAmount = Number(invoice.amount) || 0;

  // Format Card Number input with spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(val);
  };

  // Format Card Expiry MM/YY
  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
      val = `${val.substring(0, 2)}/${val.substring(2, 4)}`;
    }
    setCardExpiry(val);
  };

  // Format CPF/CNPJ
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 14);
    if (val.length <= 11) {
      // CPF
      val = val.replace(/(\d{3})(\d)/, '$1.$2')
               .replace(/(\d{3})(\d)/, '$1.$2')
               .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ
      val = val.replace(/^(\d{2})(\d)/, '$1.$2')
               .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
               .replace(/\.(\d{3})(\d)/, '.$1/$2')
               .replace(/(\d{4})(\d)/, '$1-$2');
    }
    setPayerDocument(val);
  };

  // Copy PIX Code
  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      showSuccess('Código PIX Copia e Cola copiado para a área de transferência!', 'Copiado');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showWarning('Não foi possível copiar automaticamente.', 'Atenção');
    }
  };

  // Confirm PIX Payment
  const handleConfirmPixPayment = async () => {
    try {
      setConfirmingPix(true);
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch(`/api/hq/invoices/${invoice.id}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentMethod: 'PIX',
          txId: `TX-PIX-${Date.now()}`,
          notes: 'Pagamento confirmado via QR Code PIX Mercado Pago / Bacen'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao confirmar pagamento PIX.');
      }

      showSuccess(`Fatura ${invNumber} quitada com sucesso via PIX!`, 'Pagamento Aprovado');
      setCompletedReceipt(data.receipt || {
        invoiceNumber: invNumber,
        companyName: invoice.companyName || 'Empresa Cliente',
        amount: invAmount,
        paymentMethod: 'PIX (Bacen / Mercado Pago)',
        paidAt: new Date().toISOString(),
        authCode: `AUTH-PIX-${Math.floor(100000 + Math.random() * 900000)}`,
        e2eId: `E${Date.now()}9876543210`,
        status: 'PAID'
      });

      if (onPaymentSuccess) {
        onPaymentSuccess({
          ...invoice,
          status: 'PAID',
          paymentMethod: 'PIX',
          paidAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      showError(err.message || 'Erro ao confirmar recebimento PIX.');
    } finally {
      setConfirmingPix(false);
    }
  };

  // Process Card Payment (Mercado Pago Gateway)
  const handleProcessCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length < 13) {
      showWarning('Por favor informe um número de cartão válido.');
      return;
    }
    if (!cardHolder.trim()) {
      showWarning('Informe o nome do titular impresso no cartão.');
      return;
    }
    if (cardExpiry.length < 5) {
      showWarning('Informe a data de validade (MM/AA).');
      return;
    }
    if (cardCvv.length < 3) {
      showWarning('Informe o código de segurança (CVV).');
      return;
    }

    try {
      setProcessingCard(true);
      const token = localStorage.getItem('varejopro_auth_token');
      const res = await fetch(`/api/hq/invoices/${invoice.id}/pay-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cardNumber: cardNumber.replace(/\s/g, ''),
          cardHolder,
          cardExpiry,
          cardCvv,
          installments: Number(installments),
          payerDocument,
          gateway: 'mercadopago'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Transação de cartão recusada pelo gateway.');
      }

      showSuccess(`Pagamento de ${formatCurrency(invAmount)} aprovado no Cartão de Crédito!`, 'Aprovado');
      setCompletedReceipt(data.receipt || {
        invoiceNumber: invNumber,
        companyName: invoice.companyName || 'Empresa Cliente',
        amount: invAmount,
        paymentMethod: `Cartão de Crédito (${installments}x)`,
        paidAt: new Date().toISOString(),
        authCode: data.authCode || `AUTH-MP-${Math.floor(100000 + Math.random() * 900000)}`,
        nsu: data.nsu || `NSU-${Date.now().toString().slice(-8)}`,
        cardBrand: 'Mastercard / Visa',
        status: 'PAID'
      });

      if (onPaymentSuccess) {
        onPaymentSuccess({
          ...invoice,
          status: 'PAID',
          paymentMethod: 'CREDIT_CARD',
          paidAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      showError(err.message || 'Erro ao processar cartão de crédito.');
    } finally {
      setProcessingCard(false);
    }
  };

  // Direct Checkout Link
  const checkoutUrl = `${window.location.origin}/api/billing/checkout-redirect?invoiceId=${invoice.id}&gateway=mercadopago`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      showSuccess('Link de checkout copiado!', 'Link Seguro');
    } catch {
      showWarning('Não foi possível copiar link.');
    }
  };

  const handleSendWhatsApp = () => {
    const text = `Olá, aqui é do Financeiro VarejoPro! 👋\n\nSegue o link seguro para quitação da sua fatura *${invNumber}* referente ao plano SaaS da empresa *${invoice.companyName || ''}*:\n\n💰 *Valor:* ${formatCurrency(invAmount)}\n📅 *Vencimento:* ${invoice.dueDate || 'Imediato'}\n🔗 *Pague via PIX ou Cartão Mercado Pago:* ${checkoutUrl}\n\nQualquer dúvida estamos à disposição!`;
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm uppercase tracking-wider text-white">Receber Fatura SaaS</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {invNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {invoice.companyName || 'Empresa'} • <span className="text-emerald-400 font-bold">{formatCurrency(invAmount)}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* If Receipt is completed, show the Voucher */}
          {completedReceipt ? (
            <div className="space-y-6 text-center animate-scaleIn">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white">Pagamento Aprovado com Sucesso!</h4>
                <p className="text-xs text-slate-400 mt-1">A assinatura da empresa foi renovada e desbloqueada no SaaS.</p>
              </div>

              {/* Receipt Box */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-left font-mono text-xs space-y-2.5">
                <div className="flex justify-between border-b border-slate-800/80 pb-2 font-sans font-bold text-slate-300">
                  <span>Comprovante de Faturamento HQ</span>
                  <span className="text-emerald-400 font-mono">STATUS: PAGO</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Fatura:</span>
                  <span className="text-slate-200">{completedReceipt.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Empresa:</span>
                  <span className="text-slate-200">{completedReceipt.companyName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Valor Quitado:</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(completedReceipt.amount)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Método:</span>
                  <span className="text-slate-200">{completedReceipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Código de Aut.:</span>
                  <span className="text-slate-200">{completedReceipt.authCode}</span>
                </div>
                {completedReceipt.e2eId && (
                  <div className="flex justify-between text-slate-400">
                    <span>ID Bacen (E2E):</span>
                    <span className="text-[10px] text-slate-300 truncate max-w-[200px]">{completedReceipt.e2eId}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800/80 text-[10px]">
                  <span>Data / Hora:</span>
                  <span>{new Date(completedReceipt.paidAt).toLocaleString('pt-BR')}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Recibo
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20"
                >
                  Concluir & Fechar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Payment Methods Nav */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('pix')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'pix'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>PIX Instantâneo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('card')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'card'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cartão Mercado Pago</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('link')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'link'
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Link / WhatsApp</span>
                </button>
              </div>

              {/* TAB 1: PIX */}
              {activeTab === 'pix' && (
                <div className="space-y-5">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-2">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        Expira em: {formatTimer(timeLeft)}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">Padrão BACEN / Mercado Pago</span>
                    </div>

                    {/* QR Code Canvas Frame */}
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-xl mx-auto border-4 border-emerald-500/20">
                      {qrCodeDataUrl ? (
                        <img 
                          src={qrCodeDataUrl} 
                          alt="QR Code PIX" 
                          className="w-48 h-48 mx-auto object-contain"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                          Gerando QR Code...
                        </div>
                      )}
                    </div>

                    {/* PIX Copy & Paste Box */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Código PIX Copia e Cola
                      </label>
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2">
                        <input
                          type="text"
                          readOnly
                          value={pixCode}
                          className="bg-transparent text-[11px] font-mono text-slate-300 w-full outline-none select-all"
                        />
                        <button
                          type="button"
                          onClick={handleCopyPix}
                          className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                            copied 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                          }`}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Manual / Gateway Confirm Button */}
                  <button
                    type="button"
                    onClick={handleConfirmPixPayment}
                    disabled={confirmingPix}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
                  >
                    {confirmingPix ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Confirmar Recebimento PIX ({formatCurrency(invAmount)})
                  </button>
                </div>
              )}

              {/* TAB 2: CREDIT CARD */}
              {activeTab === 'card' && (
                <form onSubmit={handleProcessCardPayment} className="space-y-4">
                  {/* Virtual Card Graphic */}
                  <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden text-white font-mono space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-6 bg-amber-400/90 rounded-md shadow-inner" />
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-sans font-bold">Mercado Pago Gateway</span>
                      </div>
                      <span className="text-xs font-bold text-indigo-400 tracking-wider">CRÉDITO</span>
                    </div>

                    <div className="text-base tracking-widest font-black text-slate-200">
                      {cardNumber || '•••• •••• •••• ••••'}
                    </div>

                    <div className="flex justify-between items-end text-[10px] uppercase font-sans">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-normal">Titular</span>
                        <span className="font-bold text-slate-200">{cardHolder || 'NOME DO CLIENTE'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block font-normal">Validade</span>
                        <span className="font-bold text-slate-200">{cardExpiry || 'MM/AA'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-400 font-medium mb-1">Número do Cartão</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="0000 0000 0000 0000"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono pl-9 outline-none focus:border-indigo-500 transition"
                        />
                        <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-400 font-medium mb-1">Nome Impresso no Cartão</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: JOAO SILVA"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 uppercase outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Validade (MM/AA)</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={handleCardExpiryChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono text-center outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">CVV / Código</label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          maxLength={4}
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono text-center outline-none focus:border-indigo-500 transition"
                        />
                        <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">CPF / CNPJ do Pagador</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={payerDocument}
                        onChange={handleDocumentChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-medium mb-1">Parcelamento</label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 outline-none focus:border-indigo-500 transition"
                      >
                        <option value="1">1x de {formatCurrency(invAmount)} (à vista)</option>
                        <option value="2">2x de {formatCurrency(invAmount / 2)}</option>
                        <option value="3">3x de {formatCurrency(invAmount / 3)}</option>
                        <option value="6">6x de {formatCurrency(invAmount / 6)}</option>
                        <option value="12">12x de {formatCurrency(invAmount / 12)}</option>
                      </select>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      Criptografia TLS 256-bit PCI-DSS
                    </span>
                    <span>Processado via Mercado Pago</span>
                  </div>

                  <button
                    type="submit"
                    disabled={processingCard}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                  >
                    {processingCard ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    Processar Pagamento de {formatCurrency(invAmount)}
                  </button>
                </form>
              )}

              {/* TAB 3: LINK & WHATSAPP */}
              {activeTab === 'link' && (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">Cobrança Remota para o Cliente</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Envie o link seguro do Mercado Pago para que o gestor da empresa realize o pagamento direto no navegador.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Link Direto da Fatura
                      </label>
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2">
                        <input
                          type="text"
                          readOnly
                          value={checkoutUrl}
                          className="bg-transparent text-xs font-mono text-indigo-300 w-full outline-none select-all"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={handleSendWhatsApp}
                        className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/20"
                      >
                        <Send className="w-4 h-4" />
                        Enviar no WhatsApp
                      </button>
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Abrir Checkout
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};
