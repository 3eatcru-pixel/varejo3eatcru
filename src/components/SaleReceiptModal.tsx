import React, { useState } from 'react';
import { Printer, Send, FileCheck, Loader2, QrCode, FileCode } from 'lucide-react';
import { Sale } from '../types';
import { formatCurrency } from '../lib/utils';
import { useToast } from './Toast';
import { XmlGeneratorService } from '../services/fiscal/XmlGeneratorService';

interface SaleReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  storeSettings?: { storeName?: string; cnpj?: string; address?: string } | null;
  onShareWhatsapp: () => void;
}

export const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  storeSettings,
  onShareWhatsapp
}) => {
  const { showSuccess, showError } = useToast();
  const [isIssuingNfce, setIsIssuingNfce] = useState(false);
  const [nfceIssued, setNfceIssued] = useState(false);
  const [nfceAccessKey, setNfceAccessKey] = useState('');
  const [nfceXml, setNfceXml] = useState<string>('');

  if (!isOpen || !sale) return null;

  const handleEmitNfce = () => {
    setIsIssuingNfce(true);
    
    // Simulate SEFAZ Emission
    setTimeout(() => {
      setIsIssuingNfce(false);
      setNfceIssued(true);
      
      const randomKey = Array.from({length: 44}, () => Math.floor(Math.random() * 10)).join('');
      setNfceAccessKey(randomKey);
      
      // Generate XML using the service
      try {
        const emitente = {
          cnpj: storeSettings?.cnpj || '00.000.000/0001-91',
          xNome: storeSettings?.storeName || 'VAREJOPRO COMERCIO LTDA',
          xFant: storeSettings?.storeName || 'VAREJOPRO POS',
          IE: '123456789',
          CRT: '1',
          endereco: {
            xLgr: 'Rua Principal',
            nro: '100',
            xBairro: 'Centro',
            cMun: '4106902',
            xMun: 'Curitiba',
            UF: 'PR',
            CEP: '80000000'
          }
        };
        const nNFCe = Math.floor(Math.random() * 100000) + 1;
        const xmlContent = XmlGeneratorService.generateNfceXml(sale, emitente, nNFCe, 1);
        setNfceXml(xmlContent);
        showSuccess('NFC-e autorizada pela SEFAZ! XML gerado com sucesso.', 'Emissão Concluída');
      } catch (e) {
        console.error("Erro ao gerar XML", e);
      }
      
    }, 2500);
  };

  const handleDownloadXml = () => {
    if (!nfceXml) return;
    const blob = new Blob([nfceXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nfce_${nfceAccessKey}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess('Arquivo XML baixado com sucesso.', 'Download Concluído');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div id="printable-receipt" className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-slate-200 font-mono text-xs text-slate-800 space-y-4 print:shadow-none print:border-none print:p-0 print:m-0">
        <div className="text-center pb-3 border-b border-dashed border-slate-300">
          <h3 className="font-black text-sm uppercase">{storeSettings?.storeName || 'VAREJOPRO POS'}</h3>
          <p className="text-[10px] text-slate-500">{storeSettings?.cnpj ? `CNPJ: ${storeSettings.cnpj}` : 'CNPJ: Não Cadastrado'}</p>
          {storeSettings?.address && <p className="text-[10px] text-slate-500">{storeSettings.address}</p>}
          {!nfceIssued ? (
            <p className="text-[10px] text-slate-500 mt-1">Recibo de Venda - Não é documento fiscal</p>
          ) : (
            <p className="text-[11px] font-bold text-slate-800 mt-1 uppercase">Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</p>
          )}
          <p className="text-[10px] text-slate-400 font-bold mt-1">CÓD: {sale.code}</p>
          {sale.customerName && (
            <p className="text-[10px] text-slate-600 mt-0.5">Consumidor: {sale.customerCpf ? sale.customerCpf : sale.customerName}</p>
          )}
        </div>

        <div className="space-y-1 max-h-40 overflow-y-auto">
          {sale.items.map((item, i) => (
            <div key={i} className="flex justify-between text-[11px]">
              <span>{item.quantity}x {item.productName}</span>
              <span>{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-dashed border-slate-300 space-y-1">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal:</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Desconto:</span>
              <span>-{formatCurrency(sale.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
          {sale.splitPayments && sale.splitPayments.length > 0 ? (
            <div className="text-[10px] text-slate-600 pt-1 space-y-0.5 border-t border-dotted border-slate-200">
              <div className="font-bold text-slate-700">Pagamento Dividido:</div>
              {sale.splitPayments.map((sp, idx) => (
                <div key={idx} className="flex justify-between pl-2">
                  <span className="uppercase">{sp.method}:</span>
                  <span>{formatCurrency(sp.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between text-[10px] text-slate-500 pt-1">
              <span>Pagamento:</span>
              <span className="uppercase">{sale.paymentMethod}</span>
            </div>
          )}
          {sale.changeGiven ? (
            <div className="flex justify-between text-[10px] text-emerald-600 font-bold">
              <span>Troco:</span>
              <span>{formatCurrency(sale.changeGiven)}</span>
            </div>
          ) : null}
        </div>

        {nfceIssued && (
          <div className="pt-3 border-t border-dashed border-slate-300 text-center space-y-2">
            <p className="text-[9px] break-all leading-tight">CHAVE DE ACESSO:<br/>{nfceAccessKey}</p>
            <div className="mx-auto w-24 h-24 bg-slate-100 border border-slate-200 rounded flex items-center justify-center">
               <QrCode className="w-16 h-16 text-slate-800" />
            </div>
            <p className="text-[9px] font-bold">Protocolo de Autorização: 1{Math.floor(Math.random() * 10000000000)}</p>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 no-print">
          {!nfceIssued && (
            <button 
              onClick={handleEmitNfce}
              disabled={isIssuingNfce}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white py-3 rounded-xl font-sans font-bold text-xs uppercase flex items-center justify-center gap-2 transition-colors mb-2 shadow-md"
            >
              {isIssuingNfce ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Emitindo na SEFAZ...</>
              ) : (
                <><FileCheck className="w-4 h-4" /> Emitir NFC-e (Demostração)</>
              )}
            </button>
          )}

          <div className="flex gap-2">
            <button 
              onClick={() => {
                 document.body.classList.remove('print-58mm');
                 window.print();
              }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl font-sans font-bold text-[10px] uppercase flex items-center justify-center gap-1"
            >
              <Printer className="w-4 h-4" /> Imp 80mm
            </button>
             <button 
              onClick={() => {
                 document.body.classList.add('print-58mm');
                 window.print();
              }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl font-sans font-bold text-[10px] uppercase flex items-center justify-center gap-1"
            >
              <Printer className="w-4 h-4" /> Imp 58mm
            </button>
            <button 
              onClick={onShareWhatsapp} 
              className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2.5 rounded-xl font-sans font-bold text-[10px] uppercase flex items-center justify-center gap-1 border border-emerald-200"
            >
              <Send className="w-4 h-4 text-emerald-600" /> Wpp
            </button>
          </div>

          {nfceIssued && (
            <button 
              onClick={handleDownloadXml}
              className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-xl font-sans font-bold text-xs uppercase flex items-center justify-center gap-2 transition-colors border border-blue-200"
            >
              <FileCode className="w-4 h-4" /> Baixar XML Autorizado
            </button>
          )}

          <button 
            onClick={() => {
               setNfceIssued(false);
               onClose();
            }} 
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-sans font-black text-xs uppercase tracking-wider transition-all shadow-md mt-1"
          >
            Nova Venda
          </button>
        </div>
      </div>
    </div>
  );
};
