import { relations } from 'drizzle-orm';
import { pgTable, text, integer, doublePrecision, boolean, unique, index } from 'drizzle-orm/pg-core';

// --- PLATFORM & TENANTS ---

export const companies = pgTable('companies', {
  id: text('id').primaryKey(), // e.g., 'empresa_principal'
  name: text('name').notNull(),
  document: text('document'), // CNPJ/CPF
  logoUrl: text('logo_url'),
  planTier: text('plan_tier').default('FREE').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const branches = pgTable('branches', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  address: text('address'),
  createdAt: text('created_at').notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  documentNumber: text('document_number'),
  bio: text('bio'),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'DISABLED'
  tokenVersion: integer('token_version').notNull().default(1),
  emailVerified: boolean('email_verified').default(true),
  createdAt: text('created_at').notNull(),
});

export const memberships = pgTable('memberships', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  companyId: text('company_id').notNull().references(() => companies.id),
  role: text('role').notNull(), // 'OWNER', 'ADMIN', 'MANAGER', 'CASHIER'
  createdAt: text('created_at').notNull(),
});

export const devices = pgTable('devices', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  branchId: text('branch_id').references(() => branches.id),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'PDV', 'TABLET'
  status: text('status').notNull(), // 'ACTIVE', 'INACTIVE'
  activatedAt: text('activated_at').notNull(),
});

// --- CORE BUSINESS (CATALOG & STOCK) ---

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  sku: text('sku'),
  barcode: text('barcode'),
  price: doublePrecision('price').notNull(),
  costPrice: doublePrecision('cost_price'),
  stock: doublePrecision('stock').notNull().default(0),
  categoryId: text('category_id'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  companyActiveNameIdx: index('products_company_active_name_idx').on(table.companyId, table.isActive, table.name),
  companyBarcodeIdx: index('products_company_barcode_idx').on(table.companyId, table.barcode),
}));

export const inventoryMovements = pgTable('inventory_movements', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  productId: text('product_id').notNull().references(() => products.id),
  userId: text('user_id').references(() => users.id),
  type: text('type').notNull(), // 'IN', 'OUT', 'SALE', 'REFUND'
  quantity: doublePrecision('quantity').notNull(),
  referenceId: text('reference_id'), // saleId or purchaseId
  createdAt: text('created_at').notNull(),
});

// --- SERVICES & APPOINTMENTS ---

export const companyServices = pgTable('company_services', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  description: text('description'),
  price: doublePrecision('price').notNull(),
  duration: integer('duration').notNull(),
  durationMinutes: integer('duration_minutes'),
  bufferMinutes: integer('buffer_minutes'),
  categoryId: text('category_id'),
  bookable: boolean('bookable').default(true),
  requiresProfessional: boolean('requires_professional').default(true),
  active: boolean('active').default(true),
  createdAt: text('created_at').notNull(),
});

export const companyProfessionals = pgTable('company_professionals', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  displayName: text('display_name'),
  serviceIds: text('service_ids'), // stored as JSON string array
  createdAt: text('created_at').notNull(),
});

export const appointments = pgTable('appointments', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  serviceId: text('service_id').notNull(),
  serviceName: text('service_name'),
  servicePrice: doublePrecision('service_price'),
  professionalId: text('professional_id').notNull(),
  date: text('date').notNull(),
  startAt: text('start_at'),
  endAt: text('end_at'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  customerEmail: text('customer_email'),
  notes: text('notes'),
  status: text('status').notNull(), // 'PENDENTE', 'CONFIRMADO', 'CONCLUÍDO', 'CANCELADO'
  createdAt: text('created_at').notNull(),
});

// --- POS & SALES ---

export const cashRegisters = pgTable('cash_registers', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  branchId: text('branch_id').references(() => branches.id),
  deviceId: text('device_id').references(() => devices.id),
  openedBy: text('opened_by').notNull().references(() => users.id),
  closedBy: text('closed_by').references(() => users.id),
  status: text('status').notNull(), // 'OPEN', 'CLOSED'
  openingBalance: doublePrecision('opening_balance').notNull(),
  closingBalance: doublePrecision('closing_balance'),
  declaredCash: doublePrecision('declared_cash'),
  declaredCredit: doublePrecision('declared_credit'),
  declaredDebit: doublePrecision('declared_debit'),
  declaredPix: doublePrecision('declared_pix'),
  cashDifference: doublePrecision('cash_difference'),
  notes: text('notes'),
  openedAt: text('opened_at').notNull(),
  closedAt: text('closed_at'),
});

export const cashRegisterOperations = pgTable('cash_register_operations', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  cashRegisterId: text('cash_register_id').notNull().references(() => cashRegisters.id),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // 'SANGRIA', 'SUPRIMENTO'
  amount: doublePrecision('amount').notNull(),
  reason: text('reason').notNull(),
  createdAt: text('created_at').notNull(),
});

export const sales = pgTable('sales', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  branchId: text('branch_id').references(() => branches.id),
  cashRegisterId: text('cash_register_id').references(() => cashRegisters.id),
  userId: text('user_id').notNull().references(() => users.id),
  status: text('status').notNull(), // 'COMPLETED', 'CANCELED'
  subtotal: doublePrecision('subtotal').notNull(),
  discount: doublePrecision('discount').notNull().default(0),
  total: doublePrecision('total').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'CREDIT', 'DEBIT', 'PIX', 'CASH'
  idempotencyKey: text('idempotency_key'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  unqIdempotency: unique().on(table.companyId, table.idempotencyKey),
  companyCreatedAtIdx: index('sales_company_created_idx').on(table.companyId, table.createdAt),
  companyStatusIdx: index('sales_company_status_idx').on(table.companyId, table.status),
}));

export const saleItems = pgTable('sale_items', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').notNull().references(() => sales.id),
  productId: text('product_id').notNull().references(() => products.id),
  quantity: doublePrecision('quantity').notNull(),
  unitPrice: doublePrecision('unit_price').notNull(),
  totalPrice: doublePrecision('total_price').notNull(),
});

export const fiscalDocuments = pgTable('fiscal_documents', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id),
  saleId: text('sale_id').notNull().references(() => sales.id),
  type: text('type').notNull().default('NFCE'),
  status: text('status').notNull().default('AUTHORIZED'),
  xml: text('xml').notNull(),
  protocol: text('protocol'),
  accessKey: text('access_key'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
});

// --- FINANCE ---

export const financialRecords = pgTable('financial_records', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  type: text('type').notNull(), // 'RECEIVABLE', 'PAYABLE'
  description: text('description').notNull(),
  amount: doublePrecision('amount').notNull(),
  dueDate: text('due_date').notNull(),
  category: text('category').notNull(),
  entityName: text('entity_name'),
  status: text('status').notNull().default('PENDING'), // 'PENDING', 'PAID', 'OVERDUE'
  paymentDate: text('payment_date'),
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  companyTypeDueIdx: index('financial_records_company_type_due_idx').on(table.companyId, table.type, table.dueDate),
}));

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  email: text('email').notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  createdAt: text('created_at').notNull(),
});

// --- RELATIONS ---

export const companiesRelations = relations(companies, ({ many }) => ({
  branches: many(branches),
  users: many(memberships),
  products: many(products),
  sales: many(sales),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  company: one(companies, { fields: [sales.companyId], references: [companies.id] }),
  user: one(users, { fields: [sales.userId], references: [users.id] }),
  items: many(saleItems),
  cashRegister: one(cashRegisters, { fields: [sales.cashRegisterId], references: [cashRegisters.id] })
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] })
}));

// --- PLATFORM ADMIN (HQ) ---
export const platformCompanies = pgTable('platform_companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('FREE'),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: text('created_at').notNull(),
});

export const platformSubscriptions = pgTable('platform_subscriptions', {
  id: text('id').primaryKey(), // Matches companyId
  planId: text('plan_id').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  currentPeriodEnd: text('current_period_end').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  updatedAt: text('updated_at').notNull(),
});

export const platformInvoices = pgTable('platform_invoices', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  subscriptionId: text('subscription_id').notNull(),
  amount: doublePrecision('amount').notNull(),
  status: text('status').notNull().default('PENDING'),
  paymentMethod: text('payment_method'),
  description: text('description'),
  dueDate: text('due_date'),
  paidAt: text('paid_at'),
  paymentReceipt: text('payment_receipt'),
  createdAt: text('created_at').notNull(),
});

export const platformTickets = pgTable('platform_tickets', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status').notNull().default('OPEN'),
  priority: text('priority').notNull(),
  companyId: text('company_id').notNull(),
  createdAt: text('created_at').notNull(),
});

export const platformErrorLogs = pgTable('platform_error_logs', {
  id: text('id').primaryKey(),
  message: text('message').notNull(),
  level: text('level').notNull().default('ERROR'),
  timestamp: text('timestamp').notNull(),
});

export const platformReleases = pgTable('platform_releases', {
  id: text('id').primaryKey(), // version string like 10_2_0
  version: text('version').notNull(),
  notes: text('notes'),
  publishedAt: text('published_at').notNull(),
});

export const platformWebhooks = pgTable('platform_webhooks', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  events: text('events').notNull(),
  active: boolean('active').default(true),
});

export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  document: text('document'),
  email: text('email'),
  phone: text('phone'),
  balance: doublePrecision('balance').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const clientLedger = pgTable('client_ledger', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id),
  companyId: text('company_id').notNull().references(() => companies.id),
  type: text('type').notNull(), // 'CREDIT', 'DEBIT'
  amount: doublePrecision('amount').notNull(),
  balanceAfter: doublePrecision('balance_after').notNull(),
  reason: text('reason').notNull(),
  createdBy: text('created_by'),
  createdAt: text('created_at').notNull(),
});

export const userSessions = pgTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull(),
  deviceInfo: text('device_info'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
});

export const userInvitations = pgTable('user_invitations', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  email: text('email').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull().default('PENDING'),
  invitedBy: text('invited_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
});

export const platformAdmins = pgTable('platform_admins', {
  id: text('id').primaryKey().references(() => users.id),
  grantedAt: text('granted_at').notNull(),
});

export const pulseQRCodes = pgTable('pulse_qrcodes', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  code: text('code').notNull(),
  type: text('type').notNull(),
  title: text('title'),
  description: text('description'),
  context: text('context'),
  welcomeMessage: text('welcome_message'),
  targetData: text('target_data'),
  active: boolean('active').default(true),
  createdAt: text('created_at').notNull(),
});

// --- NEW PLATFORM REAL PERSISTENT TABLES (AUDIT, SUPPORT SESSIONS, FLAGS, COUPONS) ---

export const platformSupportSessions = pgTable('platform_support_sessions', {
  id: text('id').primaryKey(), // sessionId
  targetCompanyId: text('target_company_id').notNull(),
  adminUid: text('admin_uid').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'REVOKED', 'EXPIRED'
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
  revokedAt: text('revoked_at'),
});

export const platformFeatureFlags = pgTable('platform_feature_flags', {
  id: text('id').primaryKey(), // e.g. 'global', 'plan:PRO', 'company:company_id'
  flagsJson: text('flags_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const platformCoupons = pgTable('platform_coupons', {
  id: text('id').primaryKey(), // coupon code
  discount: doublePrecision('discount').notNull(),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'INACTIVE'
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull(),
});

export const platformAuditLogs = pgTable('platform_audit_logs', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  details: text('details'),
  timestamp: text('timestamp').notNull(),
});

// --- UNIVERSAL ATENDIMENTO LOCAL MODEL ---

export const atendimentosLocais = pgTable('atendimentos_locais', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  branchId: text('branch_id'),
  sector: text('sector'), // ex: 'Salão', 'VIP', 'Balcão', 'Área Externa', 'Pista 2'
  identifier: text('identifier').notNull(), // ex: 'Mesa 12', 'Comanda 404', 'Pista 3', 'Atendimento 03'
  type: text('type').notNull(), // 'MESA', 'BALCÃO', 'LOCAL', 'COMANDA', 'PONTO_ATENDIMENTO'
  status: text('status').notNull().default('LIVRE'), // 'LIVRE', 'OCUPADO', 'AGUARDANDO_PAGAMENTO', 'FINALIZADO'
  customerName: text('customer_name'),
  responsibleStaffId: text('responsible_staff_id'),
  totalConsumo: doublePrecision('total_consumo').default(0.0),
  active: boolean('active').default(true),
  deviceFingerprint: text('device_fingerprint'), // For Pulse session isolation (Audit Point 11)
  expiresAt: text('expires_at'), // For session expiration
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
});

export const employees = pgTable('employees', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  userId: text('user_id').references(() => users.id),
  name: text('name').notNull(),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  registrationNumber: text('registration_number'), // matrícula
  role: text('role').notNull(), // cargo / função: 'Atendente', 'Garçom', 'Estoquista', 'Vendedor', 'Gerente' etc.
  department: text('department'), // departamento: 'Atendimento', 'Vendas', 'Estoque', 'Gerência' etc.
  branchId: text('branch_id').references(() => branches.id),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE', 'INACTIVE'
  pulseStatus: text('pulse_status').notNull().default('AVAILABLE'), // 'AVAILABLE', 'BUSY', 'OFFLINE'
  commissionRate: doublePrecision('commission_rate').notNull().default(0), // comissão em % (ex: 5.0)
  admissionDate: text('admission_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
});

export const employeeSchedules = pgTable('employee_schedules', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  employeeId: text('employee_id').notNull().references(() => employees.id),
  branchId: text('branch_id').references(() => branches.id),
  dayOfWeek: integer('day_of_week').notNull(), // 0: Domingo, 1: Segunda, 2: Terça, 3: Quarta, 4: Quinta, 5: Sexta, 6: Sábado
  shiftDate: text('shift_date'), // YYYY-MM-DD for specific day or null for recurring weekly schedule
  shiftType: text('shift_type').notNull().default('PADRAO'), // 'PADRAO', 'MANHA', 'TARDE', 'NOITE', 'PLANTAO_12X36', 'FOLGA', 'FERIAS', 'EXTRA'
  startTime: text('start_time').notNull().default('08:00'), // '08:00'
  endTime: text('end_time').notNull().default('17:00'), // '17:00'
  breakMinutes: integer('break_minutes').notNull().default(60), // Intervalo (ex: 60 minutos)
  status: text('status').notNull().default('SCHEDULED'), // 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'FOLGA', 'FERIAS', 'CANCELLED'
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
});



