import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Mail, 
  MessageSquare, 
  Check, 
  Copy, 
  Package, 
  FileText, 
  Clock, 
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Supplier, Product, UserProfile } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useToast } from '../../components/Toast';

export interface OrderItemQuote {
  id: string;
  name: string;
  sku?: string;
  currentStock?: number;
  requestedQty: number;
  unit: string;
  targetPrice?: number;
  notes?: string;
}

interface SupplierContactHubModalProps {
  supplier: Supplier;
  user?: UserProfile;
  products?: Product[];
  onClose: () => void;
}

export const SupplierContactHubModal: React.FC<SupplierContactHubModalProps> = ({
  supplier,
  user,
  products = [],
  onClose
}) => {
  const { showSuccess, showWarning } = useToast();
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [templateType, setTemplateType] = useState<'quote_order' | 'replenishment' | 'payment_proof' | 'custom'>('quote_order');
  const [orderReference, setOrderReference] = useState(`COT-${Date.now().toString().slice(-5)}`);
  const [deliveryDeadline, setDeliveryDeadline] = useState('7 dias úteis');
  const [paymentTerms, setPaymentTerms] = useState('Boleto 28 dias / PIX');
  const [generalObservations, setGeneralObservations] = useState('Por favor, confirmar disponibilidade e prazo de entrega.');
  
  // Custom items in quote
  const [items, setItems] = useState<OrderItemQuote[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQty, setCustomItemQty] = useState(1);
  const [customItemUnit, setCustomItemUnit] = useState('UN');

  // Load products with low stock automatically if template is replenishment
  useEffect(() => {
    if (templateType === 'replenishment') {
      const lowStockProducts = products
        .filter(p => (p.stock || 0) <= (p.minStock || 5))
        .slice(0, 8)
        .map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: p.stock || 0,
          requestedQty: Math.max(10, ((p.minStock || 10) * 2) - (p.stock || 0)),
          unit: p.unit || 'UN',
          targetPrice: p.costPrice || undefined
        }));

      if (lowStockProducts.length > 0) {
        setItems(lowStockProducts);
      }
    }
  }, [templateType, products]);

  const handleAddProductFromCatalog = () => {
    if (!selectedProductToAdd) return;
    const prod = products.find(p => p.id === selectedProductToAdd);
    if (!prod) return;

    if (items.some(i => i.id === prod.id)) {
      showWarning('Este item já está na lista da cotação.', 'Item duplicado');
      return;
    }

    setItems(prev => [
      ...prev,
      {
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        currentStock: prod.stock,
        requestedQty: 10,
        unit: prod.unit || 'UN',
        targetPrice: prod.costPrice
      }
    ]);
    setSelectedProductToAdd('');
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    setItems(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: customItemName.trim(),
        requestedQty: customItemQty > 0 ? customItemQty : 1,
        unit: customItemUnit,
      }
    ]);
    setCustomItemName('');
    setCustomItemQty(1);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateQty = (id: string, qty: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, requestedQty: Math.max(1, qty) } : i));
  };

  const companyName = user?.name ? `${user.name} (VarejoPro)` : 'Nossa Empresa';

  // Generate Message Content
  const generateFormattedMessage = (): string => {
    const contactGreeting = supplier.contactName ? `Olá, ${supplier.contactName}!` : `Olá, equipe ${supplier.name}!`;

    if (templateType === 'quote_order' || templateType === 'replenishment') {
      const isReplenish = templateType === 'replenishment';
      let msg = `🛒 *${isReplenish ? 'PEDIDO DE REPOSIÇÃO DE ESTOQUE' : 'SOLICITAÇÃO DE COTAÇÃO / PEDIDO'}*\n`;
      msg += `📋 *Ref:* ${orderReference}\n`;
      msg += `🏢 *Comprador:* ${companyName}\n`;
      msg += `📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}\n`;
      msg += `⏳ *Prazo Desejado:* ${deliveryDeadline}\n`;
      msg += `💳 *Condição:* ${paymentTerms}\n\n`;
      msg += `${contactGreeting}\n`;
      msg += `Gostaríamos de solicitar a cotação/faturamento dos itens listados abaixo:\n\n`;

      if (items.length === 0) {
        msg += `_(Nenhum item específico adicionado. Por favor, envie a tabela atualizada de preços e catálogo.)_\n\n`;
      } else {
        items.forEach((it, idx) => {
          msg += `*${idx + 1}. ${it.name}*\n`;
          if (it.sku) msg += `   • Código/SKU: ${it.sku}\n`;
          msg += `   • Quantidade solicitada: *${it.requestedQty} ${it.unit}*\n`;
          if (it.targetPrice) msg += `   • Último Custo / Preço Alvo: ${formatCurrency(it.targetPrice)}\n`;
        });
        msg += `\n`;
      }

      if (generalObservations.trim()) {
        msg += `📌 *Observações:* ${generalObservations.trim()}\n\n`;
      }

      msg += `Aguardamos retorno com disponibilidade, valores e prazo de entrega. Obrigado! 🤝`;
      return msg;
    }

    if (templateType === 'payment_proof') {
      let msg = `💰 *COMPROVANTE DE PAGAMENTO / AVISO FINANCEIRO*\n\n`;
      msg += `${contactGreeting}\n`;
      msg += `Informamos que o pagamento referente aos nossos pedidos/faturas foi processado com sucesso pelo departamento financeiro de *${companyName}*.\n\n`;
      if (generalObservations.trim()) {
        msg += `📌 *Detalhes:* ${generalObservations.trim()}\n\n`;
      }
      msg += `Favor acusar recebimento e confirmar a liberação do envio. Obrigado! 📄`;
      return msg;
    }

    // Custom
    let msg = `💬 *MENSAGEM COMERCIAL - ${companyName.toUpperCase()}*\n\n`;
    msg += `${contactGreeting}\n\n`;
    msg += `${generalObservations || 'Entrando em contato para tratar de assuntos comerciais e fornecimento.'}\n\n`;
    msg += `Atenciosamente,\n*${companyName}*`;
    return msg;
  };

  const messageText = generateFormattedMessage();

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    showSuccess('Mensagem copiada para a área de transferência!', 'Copiado');
  };

  const handleSendWhatsApp = () => {
    const rawPhone = (supplier.phone || '').replace(/\D/g, '');
    if (!rawPhone) {
      showWarning('Este fornecedor não possui telefone cadastrado.', 'Sem Telefone');
      return;
    }

    // Add country code 55 if not present
    const formattedPhone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
    const encoded = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encoded}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    showSuccess('WhatsApp Web / App aberto com sucesso!', 'WhatsApp');
  };

  const handleSendEmail = () => {
    if (!supplier.email) {
      showWarning('Este fornecedor não possui e-mail cadastrado.', 'Sem E-mail');
      return;
    }

    const subject = encodeURIComponent(`[${companyName}] ${templateType === 'payment_proof' ? 'Comprovante Financeiro' : 'Cotação de Fornecimento / Pedido'} - Ref: ${orderReference}`);
    const body = encodeURIComponent(messageText);
    const mailtoUrl = `mailto:${supplier.email}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    showSuccess('Cliente de e-mail acionado com a mensagem formatada!', 'E-mail');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-100">
                  Hub Profissional de Contato com Fornecedor
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  PRO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Envio estruturado de cotações, pedidos de compra e reposição para <span className="font-bold text-slate-200">{supplier.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Configuration Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Channel and Template Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                  Canal de Disparo
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setChannel('whatsapp')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                      channel === 'whatsapp'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('email')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                      channel === 'email'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    E-mail
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                  Modelo de Mensagem
                </label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="quote_order">🛒 Cotação / Pedido de Compra</option>
                  <option value="replenishment">🚨 Reposição de Estoque Baixo</option>
                  <option value="payment_proof">💰 Comprovante Financeiro</option>
                  <option value="custom">✍️ Mensagem Personalizada</option>
                </select>
              </div>
            </div>

            {/* Quick Header Variables */}
            <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Nº Cotação/Ref</label>
                <input
                  type="text"
                  value={orderReference}
                  onChange={(e) => setOrderReference(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Prazo Desejado</label>
                <input
                  type="text"
                  value={deliveryDeadline}
                  onChange={(e) => setDeliveryDeadline(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Condição Pgto</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200"
                />
              </div>
            </div>

            {/* Items Table for Quote */}
            {(templateType === 'quote_order' || templateType === 'replenishment') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-400" />
                    Lista de Itens da Cotação ({items.length})
                  </span>
                </div>

                {/* Add from Catalog */}
                {products.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      value={selectedProductToAdd}
                      onChange={(e) => setSelectedProductToAdd(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="">Selecione um produto do catálogo do ERP...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Estoque: {p.stock || 0} {p.unit || 'UN'}) {p.sku ? `- SKU: ${p.sku}` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddProductFromCatalog}
                      disabled={!selectedProductToAdd}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </button>
                  </div>
                )}

                {/* Add Custom Item */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ou digite o nome de um produto avulso..."
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qtd"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(Number(e.target.value))}
                    className="w-16 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-center font-bold text-slate-200 outline-none focus:border-indigo-500"
                  />
                  <select
                    value={customItemUnit}
                    onChange={(e) => setCustomItemUnit(e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs font-bold text-slate-200 outline-none"
                  >
                    <option value="UN">UN</option>
                    <option value="CX">CX</option>
                    <option value="KG">KG</option>
                    <option value="PCT">PCT</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    disabled={!customItemName.trim()}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-xs font-bold transition"
                  >
                    +
                  </button>
                </div>

                {/* Items List */}
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {items.length === 0 ? (
                    <div className="p-4 bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-500">
                      Nenhum item adicionado ainda. Selecione produtos acima para compor a lista.
                    </div>
                  ) : (
                    items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="font-bold text-slate-200 truncate">{it.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            {it.sku && <span>SKU: {it.sku}</span>}
                            {it.currentStock !== undefined && (
                              <span className="text-amber-400">Estoque Atual: {it.currentStock}</span>
                            )}
                            {it.targetPrice && <span>Últ. Custo: {formatCurrency(it.targetPrice)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400">Qtd:</span>
                          <input
                            type="number"
                            min="1"
                            value={it.requestedQty}
                            onChange={(e) => handleUpdateQty(it.id, Number(e.target.value))}
                            className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-xs text-center font-bold text-slate-100"
                          />
                          <span className="text-[10px] font-mono text-slate-400">{it.unit}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Observations */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">
                Observações Adicionais / Instruções
              </label>
              <textarea
                rows={2}
                value={generalObservations}
                onChange={(e) => setGeneralObservations(e.target.value)}
                placeholder="Ex: Faturar para o CNPJ matriz, entregar até sexta-feira..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Right: Live Preview & Action Card (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Pré-visualização do Envio
                </span>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                >
                  <Copy className="w-3 h-3" />
                  Copiar Texto
                </button>
              </div>

              {/* Message Box */}
              <div className="mt-3 bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed selection:bg-indigo-600">
                {messageText}
              </div>
            </div>

            {/* Destination Info & Submit Actions */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Destinatário:</span>
                  <span className="font-bold text-slate-200">{supplier.name}</span>
                </div>
                {supplier.contactName && (
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Representante:</span>
                    <span className="font-bold text-slate-200">{supplier.contactName}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>WhatsApp/Tel:</span>
                  <span className="font-mono text-emerald-400">{supplier.phone || 'Não informado'}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>E-mail:</span>
                  <span className="font-mono text-blue-400 truncate max-w-[180px]">{supplier.email || 'Não informado'}</span>
                </div>
              </div>

              {channel === 'whatsapp' ? (
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Disparar Cotação no WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition"
                >
                  <Mail className="w-4 h-4" />
                  <span>Enviar Cotação por E-mail</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SupplierContactHubModal;
