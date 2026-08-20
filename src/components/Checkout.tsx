import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  runTransaction, 
  query, 
  where,
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  QrCode, 
  CreditCard, 
  Banknote, 
  Receipt, 
  CheckCircle2, 
  User, 
  Package, 
  X, 
  Printer, 
  Lock, 
  AlertTriangle, 
  Users, 
  Wifi, 
  WifiOff, 
  Send, 
  Share2,
  Keyboard,
  Loader2,
  ChevronUp,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  Product, 
  CartItem, 
  PaymentMethod, 
  Sale, 
  SaleStatus, 
  UserProfile, 
  CashRegister, 
  MovementType,
  Client,
  OperationType,
  StoreSettings
} from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { handleFirestoreError } from '../lib/firestore-errors';
import BarcodeScanner from './BarcodeScanner';
import PixPaymentModal from './PixPaymentModal';
import { SaleReceiptModal } from './SaleReceiptModal';
import { processSaleTransaction, CheckoutPayload } from '../services/SaleService';
import { OfflineQueueService } from '../services/OfflineQueueService';
import { SyncEngine } from '../services/offline/SyncEngine';
import { useToast } from './Toast';

interface CheckoutProps {
  user: UserProfile;
  activeRegister: CashRegister | null;
  onOpenRegisterRequested: () => void;
}

export default function Checkout({ user, activeRegister, onOpenRegisterRequested }: CheckoutProps) {
  const { showWarning, showError, showSuccess } = useToast();
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [splitPayments, setSplitPayments] = useState<Array<{ method: PaymentMethod; amount: number }>>([
    { method: PaymentMethod.PIX, amount: 0 },
    { method: PaymentMethod.CASH, amount: 0 }
  ]);
  const [cashReceived, setCashReceived] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Completed sale modal
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const refreshOfflineCount = async () => {
    if (!user?.companyId) return;
    const count = await SyncEngine.getPendingCount(user.companyId);
    setPendingOfflineCount(count);
  };

  useEffect(() => {
    refreshOfflineCount();
    const unsub = SyncEngine.addListener((evt) => {
      if (evt.companyId === user?.companyId) {
        refreshOfflineCount();
      }
    });
    return () => unsub();
  }, [user?.companyId, user?.branchId, user?.terminalId]);

  useEffect(() => {
    if (!user?.companyId) return;
    const unsub = onSnapshot(doc(db, 'settings', `store_${user.companyId}`), (docSnap) => {
      if (docSnap.exists()) {
        setStoreSettings(docSnap.data() as StoreSettings);
      }
    }, (err) => {
      console.warn('Erro ao carregar configurações da loja:', err);
    });
    return () => unsub();
  }, [user?.companyId]);

  // Online/offline window events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerOfflineSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerOfflineSync = async () => {
    if (!navigator.onLine || !user?.companyId) return;
    try {
      setIsSyncingOffline(true);
      await SyncEngine.processQueue(user.companyId);
      await refreshOfflineCount();
    } catch (e) {
      console.warn("Falha no sync de vendas offline:", e);
    } finally {
      setIsSyncingOffline(false);
    }
  };

  // Keyboard Shortcuts (F2: New Sale, F3: Search, F8: Finalize, F9: Scanner, ESC: Clear/Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in text inputs (except ESC and functional keys)
      if (e.key === 'F2') {
        e.preventDefault();
        setCart([]);
        setDiscountAmount(0);
        setCashReceived('');
        setCustomerName('');
        setCustomerCpf('');
        setSelectedClientId('');
        showSuccess("Nova venda iniciada", "Carrinho Limpo");
      } else if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0 && !submitting) {
          handleFinalizeSale();
        } else {
          showWarning('Adicione itens ao carrinho antes de finalizar.', 'Atenção');
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        setIsScannerOpen(true);
      } else if (e.key === 'Escape') {
        if (isScannerOpen) setIsScannerOpen(false);
        else if (isReceiptOpen) setIsReceiptOpen(false);
        else if (isPixModalOpen) setIsPixModalOpen(false);
        else if (isMobileCartOpen) setIsMobileCartOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, submitting, isScannerOpen, isReceiptOpen, isPixModalOpen, isMobileCartOpen]);

  // Real-time products listener
  useEffect(() => {
    if (!user?.companyId) return;
    const q = query(
      collection(db, 'products'),
      where('companyId', '==', user.companyId),
      limit(500)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((doc) => {
        prods.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(prods);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => unsubscribe();
  }, [user?.companyId]);

  // Clients listener
  useEffect(() => {
    if (!user?.companyId) return;
    const q = query(collection(db, 'clients'), where('companyId', '==', user.companyId), limit(300));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cliList: Client[] = [];
      snapshot.forEach((doc) => {
        cliList.push({ id: doc.id, ...doc.data() } as Client);
      });
      setClients(cliList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'clients');
    });

    return () => unsubscribe();
  }, [user?.companyId]);

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    if (!clientId) {
      setCustomerName('');
      setCustomerCpf('');
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setCustomerName(client.name);
      setCustomerCpf(client.cpfCnpj || '');
      if (client.points && client.points >= 100) {
        showSuccess(`Cliente possui ${client.points} pontos no programa fidelidade!`, 'Fidelidade Ativa');
      }
    }
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showWarning(`Produto "${product.name}" sem estoque disponível.`, 'Estoque Zerado');
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showWarning(`Estoque máximo atingido (${product.stock} un).`, 'Aviso de Estoque');
          return prevCart;
        }
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty > item.product.stock) {
            showWarning(`Estoque máximo atingido (${item.product.stock} un).`, 'Aviso de Estoque');
            return item;
          }
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const handleScan = (barcode: string) => {
    const foundProduct = products.find(p => p.barcode === barcode || p.sku === barcode);
    if (foundProduct) {
      addToCart(foundProduct);
      showSuccess(`Item "${foundProduct.name}" bipado com sucesso!`, 'Código Identificado');
      setIsScannerOpen(false);
    } else {
      showError(`Produto com código "${barcode}" não cadastrado.`, 'Não Encontrado');
    }
  };

  const handleShareWhatsapp = () => {
    if (!lastSale) return;
    const client = clients.find(c => c.name === lastSale.customerName || c.cpfCnpj === lastSale.customerCpf);
    const phone = client?.whatsapp || client?.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      showWarning('Cliente sem WhatsApp/telefone cadastrado para envio automático.', 'Atenção');
      return;
    }

    const itemsSummary = lastSale.items
      .map(i => `• ${i.quantity}x ${i.productName} - ${formatCurrency(i.total)}`)
      .join('\n');

    const msg = `*Comprovante de Compra - ${storeSettings?.storeName || 'VarejoPro'}*\n\n` +
      `Cupom: #${lastSale.code}\n` +
      `Data: ${new Date(lastSale.createdAt).toLocaleString('pt-BR')}\n` +
      `Cliente: ${lastSale.customerName || 'Consumidor Final'}\n\n` +
      `*Itens:*\n${itemsSummary}\n\n` +
      `*Total: ${formatCurrency(lastSale.total)}*\n` +
      `Forma de Pagto: ${lastSale.paymentMethod}\n\n` +
      `Agradecemos pela preferência!`;

    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discountAmount);

  const totalSplitSum = splitPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const splitRemaining = Math.max(0, total - totalSplitSum);

  const numCashReceived = parseFloat(cashReceived) || 0;
  const changeGiven = paymentMethod === PaymentMethod.CASH && numCashReceived > total 
    ? numCashReceived - total 
    : 0;

  const handleFinalizeSale = async () => {
    if (!activeRegister) {
      showWarning("Não é possível finalizar vendas com o caixa fechado. Abra um turno de caixa primeiro.", "Caixa Fechado");
      return;
    }

    if (cart.length === 0) {
      showWarning("O carrinho está vazio. Adicione itens antes de finalizar a venda.", "Carrinho Vazio");
      return;
    }

    if (isSplitPayment) {
      if (Math.abs(totalSplitSum - total) > 0.01) {
        showError(`A soma dos pagamentos fracionados (${formatCurrency(totalSplitSum)}) deve ser igual ao total da venda (${formatCurrency(total)}). Restam ${formatCurrency(splitRemaining)}.`, "Pagamento Incompleto");
        return;
      }
    }

    setSubmitting(true);
    setCheckoutError(null);

    try {
      const companyId = user.companyId || 'empresa_principal';
      const branchId = user.branchId || `${companyId}_matriz`;
      const terminalId = user.terminalId || `${companyId}_pdv01`;

      const payload: CheckoutPayload = {
        cart: cart.map(c => ({
          product: { id: c.product.id, name: c.product.name, price: c.product.price },
          quantity: c.quantity
        })),
        subtotal,
        discountAmount,
        total,
        paymentMethod,
        splitPayments: isSplitPayment ? splitPayments : undefined,
        cashReceived: paymentMethod === PaymentMethod.CASH && numCashReceived > 0 ? numCashReceived : undefined,
        changeGiven: changeGiven > 0 ? changeGiven : undefined,
        selectedClientId: selectedClientId || undefined,
        customerName: customerName || undefined,
        customerCpf: customerCpf || undefined,
        activeRegister: { id: activeRegister.id },
        branchId,
        terminalId,
        user
      };

      let completedSale: Sale;

      if (!navigator.onLine) {
        await OfflineQueueService.enqueueSale(payload);
        completedSale = {
          id: `offline_${Date.now()}`,
          code: `VD-${Math.floor(100000 + Math.random() * 900000)}`,
          companyId,
          branchId,
          terminalId,
          registerId: activeRegister.id,
          cashierUid: user.uid,
          cashierName: user.name,
          items: cart.map(c => ({
            productId: c.product.id,
            productName: c.product.name,
            quantity: c.quantity,
            price: c.product.price,
            total: c.product.price * c.quantity
          })),
          subtotal,
          discount: discountAmount,
          total,
          paymentMethod: payload.paymentMethod as any,
          splitPayments: payload.splitPayments,
          status: SaleStatus.COMPLETED,
          refundedAmount: 0,
          refundStatus: 'NONE',
          createdAt: new Date().toISOString(),
          cashReceived: payload.cashReceived,
          changeGiven: payload.changeGiven,
          customerName,
          customerCpf
        };
        refreshOfflineCount();
        showSuccess(`Venda #${completedSale.code} salva em modo offline! Sincronizará assim que retornar a internet.`, 'Venda Offline Registrada');
      } else {
        completedSale = await processSaleTransaction(payload);
        
        // Attempt automatic fiscal issuance
        try {
          const token = localStorage.getItem('varejopro_auth_token');
          await fetch('/api/fiscal/issue-document', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ saleId: completedSale.id })
          });
        } catch (err) {
          console.error("Erro na emissão fiscal automática:", err);
          showWarning("Venda concluída, mas a emissão fiscal automática falhou. Verifique em Gestão Fiscal.", "Aviso Fiscal");
        }
        showSuccess(`Venda #${completedSale.code} realizada com sucesso!`, 'Venda Concluída');
      }

      setLastSale(completedSale);
      setIsReceiptOpen(true);
      setIsMobileCartOpen(false);

      // Reset cart
      setCart([]);
      setDiscountAmount(0);
      setCashReceived('');
      setCustomerName('');
      setCustomerCpf('');
      setSelectedClientId('');
      setIsSplitPayment(false);
      setSplitPayments([
        { method: PaymentMethod.PIX, amount: 0 },
        { method: PaymentMethod.CASH, amount: 0 }
      ]);
    } catch (error: any) {
      console.error("Erro na transação de venda:", error);
      setCheckoutError(error.message || "Erro ao processar venda no banco de dados.");
    } finally {
      setSubmitting(false);
    }
  };

  // Categories list
  const categories = Array.from(new Set(products.map(p => p.category || 'Geral'))).filter(Boolean);

  const filteredCatalog = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCat = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const cartItemCount = cart.reduce((a, b) => a + b.quantity, 0);

  // Cart summary & controls JSX (Shared between Desktop panel and Mobile Sheet)
  const renderCartContent = (isMobileSheet = false) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-500" />
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Caixa Registradora</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-slate-200 text-slate-700 font-black px-2.5 py-1 rounded-full">
            {cartItemCount} {cartItemCount === 1 ? 'ITEM' : 'ITENS'}
          </span>
          {isMobileSheet && (
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(false)}
              className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {checkoutError && (
        <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{checkoutError}</span>
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-300 p-6">
            <ShoppingCart className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-xs font-bold uppercase tracking-wider">Carrinho Vazio</p>
            <p className="text-[10px] text-slate-400 mt-1">Toque nos produtos do catálogo para iniciar a venda</p>
          </div>
        ) : cart.map((item) => (
          <div key={item.product.id} className="pt-3 first:pt-0 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase text-slate-900 truncate">{item.product.name}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                {formatCurrency(item.product.price)} x {item.quantity} = <span className="text-slate-900">{formatCurrency(item.product.price * item.quantity)}</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                type="button"
                onClick={() => updateQuantity(item.product.id, -1)}
                aria-label="Diminuir quantidade"
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-600 hover:text-slate-900 bg-slate-100 active:bg-slate-200 rounded-xl"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xs font-black w-6 text-center">{item.quantity}</span>
              <button 
                type="button"
                onClick={() => updateQuantity(item.product.id, 1)}
                aria-label="Aumentar quantidade"
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-600 hover:text-slate-900 bg-slate-100 active:bg-slate-200 rounded-xl"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => removeFromCart(item.product.id)}
                aria-label="Remover item"
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all ml-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary & Payment Controls */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3.5 shrink-0">
        {/* Quick Client Selection */}
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
            Cliente Cadastrado
          </label>
          <div className="relative">
            <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedClientId}
              onChange={(e) => handleSelectClient(e.target.value)}
              className="w-full min-h-[44px] bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="">Cliente Avulso (Não identificado)</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.cpfCnpj ? `(${c.cpfCnpj})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer CPF / Discount */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">CPF/CNPJ Cupom</label>
            <input 
              type="text" 
              placeholder="000.000.000-00"
              value={customerCpf}
              onChange={e => setCustomerCpf(e.target.value)}
              className="w-full min-h-[44px] bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Desconto (R$)</label>
            <input 
              type="number" 
              placeholder="0.00"
              value={discountAmount || ''}
              onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
              className="w-full min-h-[44px] bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none text-red-600 font-mono"
            />
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Forma de Pagamento
            </label>
            <button
              type="button"
              onClick={() => {
                setIsSplitPayment(!isSplitPayment);
                if (!isSplitPayment) {
                  setSplitPayments([
                    { method: PaymentMethod.PIX, amount: 0 },
                    { method: PaymentMethod.CASH, amount: 0 }
                  ]);
                }
              }}
              className={cn(
                "text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider transition-colors min-h-[32px]",
                isSplitPayment
                  ? "bg-amber-500 text-slate-950 font-bold"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              )}
            >
              {isSplitPayment ? '✓ Dividir Ativo' : '+ Dividir Pagamento'}
            </button>
          </div>

          {!isSplitPayment ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: PaymentMethod.PIX, label: 'PIX', icon: QrCode },
                  { id: PaymentMethod.CREDIT_CARD, label: 'Crédito', icon: CreditCard },
                  { id: PaymentMethod.DEBIT_CARD, label: 'Débito', icon: CreditCard },
                  { id: PaymentMethod.CASH, label: 'Dinheiro', icon: Banknote },
                ].map(method => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                      className={cn(
                        "min-h-[48px] p-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-all",
                        isSelected 
                          ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{method.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* PIX Dynamic QR Code Button */}
              {paymentMethod === PaymentMethod.PIX && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (cart.length === 0) {
                        showWarning('Adicione itens ao carrinho antes de gerar o PIX.', 'Carrinho Vazio');
                        return;
                      }
                      setIsPixModalOpen(true);
                    }}
                    className="w-full min-h-[48px] py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Gerar QR Code PIX em Tela</span>
                  </button>
                </div>
              )}

              {/* Cash Change Calculator */}
              {paymentMethod === PaymentMethod.CASH && (
                <div className="bg-white p-3 mt-2 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Dinheiro Recebido:</span>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      className="w-28 text-right bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-black border-t border-slate-100 pt-1.5">
                    <span className="text-slate-500">Troco:</span>
                    <span className={cn(changeGiven > 0 ? "text-emerald-600" : "text-slate-400")}>
                      {formatCurrency(changeGiven)}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Split payment builder */
            <div className="bg-white p-3 rounded-2xl border border-amber-300/80 bg-amber-50/20 space-y-2.5">
              <div className="space-y-2">
                {splitPayments.map((split, index) => (
                  <div key={index} className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <select
                      value={split.method}
                      onChange={(e) => {
                        const newSplits = [...splitPayments];
                        newSplits[index].method = e.target.value as PaymentMethod;
                        setSplitPayments(newSplits);
                      }}
                      className="bg-white border border-slate-200 text-[10px] font-black uppercase rounded-lg px-2 py-1.5 text-slate-800 outline-none"
                    >
                      <option value={PaymentMethod.PIX}>PIX</option>
                      <option value={PaymentMethod.CASH}>Dinheiro</option>
                      <option value={PaymentMethod.CREDIT_CARD}>Crédito</option>
                      <option value={PaymentMethod.DEBIT_CARD}>Débito</option>
                    </select>

                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={split.amount || ''}
                        onChange={(e) => {
                          const newSplits = [...splitPayments];
                          newSplits[index].amount = parseFloat(e.target.value) || 0;
                          setSplitPayments(newSplits);
                        }}
                        className="w-full pl-7 pr-2 py-1.5 text-right text-xs font-black bg-white border border-slate-200 rounded-lg outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const otherSum = splitPayments.reduce((acc, s, idx) => idx === index ? acc : acc + (Number(s.amount) || 0), 0);
                        const remaining = Math.max(0, total - otherSum);
                        const newSplits = [...splitPayments];
                        newSplits[index].amount = parseFloat(remaining.toFixed(2));
                        setSplitPayments(newSplits);
                      }}
                      title="Completar valor restante"
                      className="px-2 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-black rounded-lg min-h-[36px]"
                    >
                      Resto
                    </button>

                    {splitPayments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSplitPayments(splitPayments.filter((_, idx) => idx !== index))}
                        className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {splitPayments.length < 4 && (
                <button
                  type="button"
                  onClick={() => {
                    setSplitPayments([...splitPayments, { method: PaymentMethod.CREDIT_CARD, amount: 0 }]);
                  }}
                  className="w-full min-h-[36px] py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  + Adicionar Outra Forma
                </button>
              )}

              <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[10px] font-black">
                <span className="text-slate-500">Soma: R$ {totalSplitSum.toFixed(2)}</span>
                <span className={cn(
                  Math.abs(totalSplitSum - total) <= 0.01 ? "text-emerald-600 font-bold" : "text-rose-600"
                )}>
                  {Math.abs(totalSplitSum - total) <= 0.01 
                    ? '✓ Total 100% Coberto' 
                    : `Falta: R$ ${splitRemaining.toFixed(2)}`
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="pt-2 border-t border-slate-200 space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs font-bold text-red-500 uppercase">
              <span>Desconto:</span>
              <span>- {formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-slate-900 pt-1">
            <span>TOTAL:</span>
            <span className="text-emerald-600">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Dominant Primary Action Button */}
        <button 
          type="button"
          onClick={handleFinalizeSale}
          disabled={cart.length === 0 || submitting}
          className="w-full min-h-[48px] bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          {submitting ? (
            <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
              <span>Finalizar Venda (F8)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden h-full p-3 sm:p-4 lg:p-6 bg-slate-100 relative">
      {/* Product Catalog Grid & Search */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden pb-16 lg:pb-0">
        
        {/* Offline & Queue Alerts */}
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 sm:p-4 flex items-center justify-between text-amber-800 shadow-sm shrink-0">
            <div className="flex items-center gap-2.5 truncate">
              <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="truncate">
                <h3 className="font-black text-xs uppercase tracking-wider">Modo Offline Ativo</h3>
                <p className="text-[11px] font-medium opacity-90 truncate">Vendas gravadas no IndexedDB.</p>
              </div>
            </div>
            {pendingOfflineCount > 0 && (
              <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider shrink-0 ml-2">
                {pendingOfflineCount} {pendingOfflineCount === 1 ? 'pendente' : 'pendentes'}
              </span>
            )}
          </div>
        )}

        {isOnline && pendingOfflineCount > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 sm:p-4 flex items-center justify-between text-indigo-900 shadow-sm shrink-0">
            <div className="flex items-center gap-2.5 truncate">
              <Wifi className="w-5 h-5 text-indigo-600 animate-pulse shrink-0" />
              <div className="truncate">
                <h3 className="font-black text-xs uppercase tracking-wider">Conexão Restabelecida</h3>
                <p className="text-[11px] font-medium opacity-90 truncate">
                  {pendingOfflineCount} {pendingOfflineCount === 1 ? 'venda pendente' : 'vendas pendentes'}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={triggerOfflineSync}
              disabled={isSyncingOffline}
              className="min-h-[40px] px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50 shrink-0 ml-2"
            >
              {isSyncingOffline ? 'Sincronizando...' : `Sincronizar`}
            </button>
          </div>
        )}

        {/* Closed Cashier Alert */}
        {!activeRegister && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 sm:p-4 flex items-center justify-between text-amber-800 shadow-sm shrink-0">
            <div className="flex items-center gap-2.5 truncate">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-black uppercase tracking-wider">Caixa Fechado</p>
                <p className="text-[11px] text-amber-700 truncate">Abra um turno para finalizar vendas.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenRegisterRequested}
              className="min-h-[40px] px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 ml-2"
            >
              Abrir Caixa
            </button>
          </div>
        )}

        {/* Search & Action Bar */}
        <div className="flex items-center gap-2 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <Search className="w-5 h-5 text-slate-400 ml-1 shrink-0" />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Buscar por nome, SKU, EAN ou categoria... (F3)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-0 bg-transparent border-none text-xs font-bold outline-none placeholder:text-slate-400"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button 
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="min-h-[44px] px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shrink-0"
            title="Escanear Código de Barras (F9)"
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Escanear</span>
          </button>
        </div>

        {/* Category Horizontal Filter Chips */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "min-h-[36px] px-3 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0",
                !selectedCategory 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              Todos ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={cn(
                  "min-h-[36px] px-3 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shrink-0",
                  selectedCategory === cat
                    ? "bg-emerald-500 text-slate-950 font-black shadow-sm" 
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Desktop Keyboard Shortcuts Reference (Hidden on Mobile) */}
        <div className="hidden lg:flex bg-slate-900 text-white px-4 py-2 rounded-xl items-center justify-between text-[11px] font-medium shadow-sm shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Atalhos:</span>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto text-[10px]">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-emerald-400 font-black">F2</kbd>
              <span className="text-slate-300">Nova Venda</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-emerald-400 font-black">F3</kbd>
              <span className="text-slate-300">Busca</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-emerald-400 font-black">F8</kbd>
              <span className="text-slate-300">Finalizar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-emerald-400 font-black">F9</kbd>
              <span className="text-slate-300">Câmera</span>
            </span>
          </div>
        </div>

        {/* Responsive Product Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-4 pr-1">
          {filteredCatalog.map((product) => {
            const inCart = cart.find(c => c.product.id === product.id);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className={cn(
                  "min-h-[160px] bg-white p-3 sm:p-4 rounded-2xl border text-left flex flex-col justify-between transition-all group relative overflow-hidden active:scale-[0.98]",
                  product.stock <= 0 
                    ? "opacity-50 border-slate-200 cursor-not-allowed" 
                    : inCart 
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                      : "border-slate-200 hover:border-emerald-500 hover:shadow-md shadow-sm"
                )}
              >
                {/* Cart Badge if added */}
                {inCart && (
                  <span className="absolute top-2 right-2 z-10 bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md">
                    {inCart.quantity} no carrinho
                  </span>
                )}

                <div className="w-full aspect-square bg-slate-50 rounded-xl mb-2 overflow-hidden flex items-center justify-center border border-slate-100">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <Package className="w-7 h-7 text-slate-300" />
                  )}
                </div>

                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block truncate">
                    {product.category || 'Geral'}
                  </span>
                  <h4 className="text-xs font-black text-slate-900 line-clamp-2 uppercase mt-0.5">
                    {product.name}
                  </h4>
                </div>

                <div className="flex items-end justify-between mt-2 pt-1.5 border-t border-slate-100">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block">Preço</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600">{formatCurrency(product.price)}</span>
                  </div>
                  <span className={cn(
                    "text-[9px] font-black px-2 py-0.5 rounded-md uppercase",
                    product.stock <= 5 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
                  )}>
                    {product.stock} un
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Cart & Checkout Panel (≥ 1024px) */}
      <div className="hidden lg:flex w-96 xl:w-[400px] shrink-0 bg-white rounded-3xl border border-slate-200 shadow-lg flex-col overflow-hidden">
        {renderCartContent(false)}
      </div>

      {/* Floating Mobile Cart Action Bar (< 1024px) */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 p-2.5 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-30 flex items-center justify-between shadow-2xl px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center relative font-black">
            <ShoppingCart className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Total Carrinho</p>
            <p className="text-base font-black text-emerald-400">{formatCurrency(total)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileCartOpen(true)}
          className="min-h-[48px] px-5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2"
        >
          <span>Ver Carrinho ({cartItemCount})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Cart Sheet Modal (< 1024px) */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            onClick={() => setIsMobileCartOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
          />
          <div className="relative w-full max-h-[90vh] bg-white rounded-t-3xl shadow-2xl z-10 flex flex-col animate-in slide-in-from-bottom duration-200">
            {renderCartContent(true)}
          </div>
        </div>
      )}

      {/* Barcode Scanner overlay */}
      {isScannerOpen && (
        <BarcodeScanner onScan={handleScan} onClose={() => setIsScannerOpen(false)} />
      )}

      {/* Receipt Modal */}
      <SaleReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={lastSale}
        storeSettings={storeSettings}
        onShareWhatsapp={handleShareWhatsapp}
      />

      {/* Dynamic PIX QR Code Modal */}
      <PixPaymentModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        amount={total}
        customerName={customerName || undefined}
        companyName={user.companyId || 'VarejoPro'}
        onConfirmPayment={() => {
          setIsPixModalOpen(false);
          handleFinalizeSale();
        }}
      />
    </div>
  );
}
