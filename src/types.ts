import { CompanyRole } from "./types/identity";
export * from './types/identity';
export * from './types/licensing';


export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: CompanyRole;
  companyId?: string;
  companyName?: string;
  branchId?: string;
  terminalId?: string;
  permissions?: Record<string, boolean>;
  avatarUrl?: string;
  active?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventorySettings {
  sectors: string[];
  tags: string[];
  categories: string[];
  companyId?: string;
}

export interface FiscalData {
  ncm?: string;         // Nomenclatura Comum do Mercosul (ex: 6109.10.00)
  cest?: string;        // Código Especificador da Substituição Tributária
  cfop?: string;        // Código Fiscal de Operações e Prestações (ex: 5102)
  origin?: string;      // 0 - Nacional, 1 - Estrangeira, etc.
  csosnCst?: string;    // CSOSN (Simples Nacional) ou CST (Regime Normal)
  icmsPercent?: number; // Alíquota ICMS %
  pisPercent?: number;  // Alíquota PIS %
  cofinsPercent?: number; // Alíquota COFINS %
}

export interface ProductVariation {
  id: string;
  name: string;          // Ex: "Tamanho M / Preto", "38 / Couro"
  size?: string;         // Ex: P, M, G, GG, XG, 38, 39, 40
  color?: string;        // Ex: Preto, Azul, Vermelho
  stock: number;
  price?: number;        // Preço diferenciado se houver
  barcode?: string;
}

export interface PerfumeData {
  brand?: string;
  line?: string;
  volumeMl?: number;
  gender?: 'Masculino' | 'Feminino' | 'Unissex';
  origin?: 'Nacional' | 'Importado';
}

export interface FootwearData {
  material?: string;
  sizeNumber?: number;
  gender?: 'Masculino' | 'Feminino' | 'Infantil' | 'Unissex';
}

export interface ApparelData {
  gridType?: 'ADULTO' | 'INFANTIL' | 'CALCADO';
  availableSizes?: string[];
  materials?: string;
}

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  sku?: string;
  price: number;
  costPrice?: number;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  promoPrice?: number;
  promoEndDate?: string;
  stock: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  category: string;
  sector?: string;
  brand?: string;
  supplierId?: string;
  supplierName?: string;
  location?: string;
  stockByLocation?: Record<string, number>;
  batchNumber?: string;
  expirationDate?: string;
  isKit?: boolean;
  kitComponents?: Array<{ productId: string; quantity: number; productName: string }>;
  tags?: string[];
  imageUrl?: string;
  fiscalData?: FiscalData;
  variations?: ProductVariation[];
  perfumeData?: PerfumeData;
  footwearData?: FootwearData;
  apparelData?: ApparelData;
  companyId?: string;
  updatedAt?: any;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount?: number; // em R$ ou %
  selectedVariation?: ProductVariation;
  notes?: string;
}

export enum PaymentMethod {
  CASH = 'CASH',
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  MULTIPLE = 'MULTIPLE'
}

export function normalizePaymentMethod(m?: string): PaymentMethod {
  if (!m) return PaymentMethod.CASH;
  const upper = String(m).trim().toUpperCase();
  if (upper === 'DINHEIRO' || upper === 'CASH') return PaymentMethod.CASH;
  if (upper === 'PIX') return PaymentMethod.PIX;
  if (upper === 'CREDITO' || upper === 'CREDIT' || upper === 'CREDIT_CARD') return PaymentMethod.CREDIT_CARD;
  if (upper === 'DEBITO' || upper === 'DEBIT' || upper === 'DEBIT_CARD') return PaymentMethod.DEBIT_CARD;
  if (upper === 'MULTIPLE' || upper === 'MULTIPLO' || upper === 'MULTIPLOU') return PaymentMethod.MULTIPLE;
  return PaymentMethod.CASH;
}

export interface SaleItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
  variationName?: string;
}

export enum SaleStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface SplitPayment {
  method: PaymentMethod;
  amount: number;
}

export interface Sale {
  id?: string;
  code: string;
  idempotencyKey?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod; // Principal ou MULTIPLO
  splitPayments?: SplitPayment[];
  cashReceived?: number;
  changeGiven?: number;
  customerName?: string;
  customerCpf?: string;
  customerId?: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscountAmount?: number;
  cashierUid?: string;
  cashierId?: string;
  cashierName: string;
  cashRegisterId?: string;
  registerId?: string;
  branchId?: string;
  terminalId?: string;
  status: SaleStatus;
  companyId?: string;
  notes?: string;
  cancelledAt?: any;
  cancelledByUid?: string;
  cancelledByName?: string;
  cancellationReason?: string;
  authorizedBy?: string; // UID of manager who authorized discount
  refundedAmount?: number; // Accumulated refunded amount
  refundStatus?: 'NONE' | 'PARTIAL' | 'FULL'; // Financial refund status
  createdAt: any;
}

export enum CashRegisterStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export enum CashOperationType {
  SANGRIA = 'SANGRIA',     // Retirada de dinheiro para o cofre
  SUPRIMENTO = 'SUPRIMENTO' // Entrada de dinheiro para troco
}

export interface CashOperation {
  id: string;
  type: CashOperationType;
  amount: number;
  reason: string;
  operatorUid: string;
  operatorName: string;
  timestamp: any;
}

export interface CashRegisterReconciliation {
  expectedCash: number;
  declaredCash: number;
  diffCash: number;
  expectedPix: number;
  declaredPix: number;
  diffPix: number;
  expectedCredit: number;
  declaredCredit: number;
  diffCredit: number;
  expectedDebit: number;
  declaredDebit: number;
  diffDebit: number;
  totalSalesCash: number;
  totalSalesPix: number;
  totalSalesCredit: number;
  totalSalesDebit: number;
  totalSalesAll: number;
  totalSangria: number;
  totalSuprimento: number;
  totalDeclaredAll: number;
  totalExpectedAll: number;
}

export interface CashRegister {
  id: string;
  companyId?: string;
  registerName?: string;
  terminalId?: string;
  branchId?: string;
  status: CashRegisterStatus;
  openedAt: any;
  openedByUid: string;
  openedByName: string;
  initialBalance: number; // Saldo inicial do troco
  closedAt?: any;
  closedByUid?: string;
  closedByName?: string;
  finalBalanceCalculated?: number; // Calculado pelo sistema
  finalBalanceDeclared?: number;   // Contado pelo operador
  cashDifference?: number;         // Quebra/Diferença em espécie
  reconciliation?: CashRegisterReconciliation;
  operations: CashOperation[];
  totalsByPaymentMethod: {
    [key in PaymentMethod]?: number;
  };
  notes?: string;
}

export enum MovementType {
  SALE = 'SALE',               // Venda no caixa
  ENTRY = 'ENTRY',             // Entrada por nota/compra
  PURCHASE = 'PURCHASE',       // Compra de fornecedor
  ADJUSTMENT = 'ADJUSTMENT',   // Ajuste manual de inventário
  RETURN = 'RETURN',           // Devolução/Cancelamento de venda
  LOSS = 'LOSS',               // Perda, avaria ou roubo
  TRANSFER = 'TRANSFER'        // Transferência de estoque
}

export interface StockMovement {
  id?: string;
  productId: string;
  productName: string;
  previousStock: number;
  quantityDelta: number; // +10 ou -2
  quantity?: number;     // Alias
  newStock: number;
  type: MovementType;
  reason: string;
  saleId?: string;
  purchaseId?: string;
  operatorUid: string;
  operatorName: string;
  companyId?: string;
  createdAt: any;
}

export type LoyaltyTier = 'BRONZE' | 'PRATA' | 'OURO' | 'VIP';

export interface Client {
  id: string;
  name: string;
  cpfCnpj?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  birthdate?: string; // Formato YYYY-MM-DD
  instagram?: string;
  address?: string;
  city?: string;
  notes?: string;
  points?: number;
  pointsBalance?: number;
  loyaltyPoints?: number; // Alias legado
  totalSpent?: number;
  purchaseCount?: number;
  tier?: LoyaltyTier;
  creditLimit?: number;      // Limite do fiado / crediário
  creditBalance?: number;    // Saldo devedor atual
  isCreditBlocked?: boolean; // Trava de inadimplência
  companyId?: string;
  lastPurchaseDate?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface RefundRecord {
  id: string;
  saleId: string;
  saleCode: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reason: string;
  operatorUid: string;
  operatorName: string;
  companyId: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  companyId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface Purchase {
  id?: string;
  code: string;
  invoiceNumber?: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalCost: number;
  paymentMethod?: string;
  notes?: string;
  companyId?: string;
  createdAt: any;
  createdByUid: string;
  createdByName: string;
}

export type EmployeePulseStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export interface Employee {
  id: string;
  companyId: string;
  userId?: string;
  name: string;
  email?: string;
  registrationNumber?: string;
  role: string;
  department?: string;
  branchId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  pulseStatus: EmployeePulseStatus;
  commissionRate: number;
  admissionDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export enum RecordType {
  RECEIVABLE = 'RECEIVABLE', // A Receber
  PAYABLE = 'PAYABLE'        // A Pagar
}

export enum RecordStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

export interface FinancialRecord {
  id: string;
  type: RecordType;
  description: string;
  amount: number;
  dueDate: string;
  category: string;
  entityName?: string;
  status: RecordStatus;
  paymentDate?: string;
  notes?: string;
  companyId?: string;
  createdAt?: any;
  createdByUid?: string;
  updatedAt?: any;
}

export enum TaxRegime {
  SIMPLES_NACIONAL = '1',
  SIMPLES_EXCESSO = '2',
  SIMPLES_NACIONAL_EXCESSO = '2',
  LUCRO_PRESUMIDO = '3',
  REGIME_NORMAL = '3'
}

export interface StoreSettings {
  storeName: string;
  cnpj: string;
  address: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  slogan?: string;
  primaryColor?: string; // Cor de destaque da marca da empresa
  accentColor?: string;
  companyId?: string;
  updatedAt?: any;
}

export interface FiscalConfig {
  companyName: string;
  tradeName?: string;
  cnpj: string;
  stateRegistration?: string;
  taxRegime: TaxRegime;
  nfceCscId: string;
  nfceCscToken: string;
  nfceSeries: number;
  nfeSeries: number;
  certificateExpiry?: string;
  companyId?: string;
  updatedAt?: any;
  updatedByUid?: string;
}

export interface FiscalDocument {
  id: string;
  saleId: string;
  type: string; // 'NFC-e' | 'NF-e'
  status: string; // 'AUTHORIZED' | 'REJECTED' | 'DENIED'
  protocol?: string;
  createdAt: any;
  companyId: string;
}

export interface Branch {
  id: string;
  code: string; // Ex: FIL-01, MATRIZ
  name: string;
  cnpj?: string;
  ie?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  isActive: boolean;
  companyId: string;
  createdAt: any;
}

export interface Terminal {
  id: string;
  code: string; // Ex: PDV-01, PDV-02
  name: string;
  branchId: string;
  branchName?: string;
  printerModel?: string;
  printerPaperWidth?: '58mm' | '80mm';
  hasCashDrawer?: boolean;
  hasScale?: boolean;
  hasBarcodeScanner?: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  companyId: string;
  createdAt: any;
}

export interface WhatsAppTemplate {
  id: string;
  title: string;
  type: 'BIRTHDAY' | 'THANK_YOU' | 'PROMO' | 'COLLECTION';
  message: string;
}

export enum OperationType {
  GET = 'read',
  LIST = 'list',
  WRITE = 'write',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}
