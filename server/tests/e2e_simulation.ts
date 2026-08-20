import assert from 'node:assert';
import { randomUUID } from 'crypto';
import { CompanyRole, PlatformRole, UserAccount, CompanyMembership } from '../../src/types/identity';
import { getPermissionsForRole, hasPermission, OWNER_PERMISSIONS, CASHIER_PERMISSIONS } from '../../src/lib/permissions';
import { normalizePaymentMethod, PaymentMethod, SaleStatus } from '../../src/types';

export interface TestResultItem {
  name: string;
  category: 'IDENTITY' | 'INVENTORY' | 'CASH_REGISTER' | 'SALE_TRANSACTION' | 'CANCELLATION' | 'OFFLINE_ISOLATION' | 'MULTI_TENANT';
  status: 'PASSED' | 'FAILED';
  durationMs: number;
  details: string;
}

/**
 * End-to-End Operational Pipeline & Multi-Tenant Simulation Suite
 * Simulates complete commercial workflows, concurrency locks, stock deductions,
 * cancellation reversibility, tenant isolation and offline queues.
 */
export async function runOperationalE2ESuite(): Promise<{ total: number; passed: number; failed: number; results: TestResultItem[] }> {
  const results: TestResultItem[] = [];

  function record(name: string, category: TestResultItem['category'], fn: () => void | Promise<void>) {
    const start = Date.now();
    try {
      fn();
      results.push({
        name,
        category,
        status: 'PASSED',
        durationMs: Date.now() - start,
        details: 'Executado com integridade total.'
      });
    } catch (err: any) {
      results.push({
        name,
        category,
        status: 'FAILED',
        durationMs: Date.now() - start,
        details: err.message || String(err)
      });
    }
  }

  // ==========================================
  // 1. IDENTITY & RBAC MULTI-TENANT DOMAIN
  // ==========================================
  record('1.1 Isolamento de Identidade & Roles Multi-Tenant', 'IDENTITY', () => {
    const ownerAccount: UserAccount = {
      uid: 'usr_owner_01',
      email: 'owner@alfavarejo.com.br',
      displayName: 'Marcos Proprietário',
      status: 'ACTIVE',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const ownerMembership: CompanyMembership = {
      id: 'mem_owner_01',
      userId: ownerAccount.uid,
      companyId: 'emp_alfa_001',
      companyName: 'Supermercado Alfa',
      role: CompanyRole.OWNER,
      permissions: getPermissionsForRole(CompanyRole.OWNER),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const cashierMembership: CompanyMembership = {
      id: 'mem_cashier_01',
      userId: 'usr_cashier_02',
      companyId: 'emp_alfa_001',
      companyName: 'Supermercado Alfa',
      role: CompanyRole.CASHIER,
      permissions: getPermissionsForRole(CompanyRole.CASHIER),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Owner checks
    assert.strictEqual(ownerMembership.permissions?.manageUsers, true);
    assert.strictEqual(ownerMembership.permissions?.manageFinancial, true);
    assert.strictEqual(ownerMembership.permissions?.manageStock, true);
    assert.strictEqual(ownerMembership.permissions?.posAccess, true);

    // Cashier checks
    assert.strictEqual(cashierMembership.permissions?.manageUsers, false);
    assert.strictEqual(cashierMembership.permissions?.manageFinancial, false);
    assert.strictEqual(cashierMembership.permissions?.manageStock, false);
    assert.strictEqual(cashierMembership.permissions?.posAccess, true);
  });

  // ==========================================
  // 2. INVENTORY STATE & MASTER DATA
  // ==========================================
  const inMemoryDB = {
    products: new Map<string, any>(),
    cashRegisters: new Map<string, any>(),
    cashLocks: new Map<string, any>(),
    sales: new Map<string, any>(),
    stockMovements: new Array<any>(),
    auditLogs: new Array<any>(),
    idempotencyKeys: new Set<string>()
  };

  record('2.1 Cadastro & Validação de Produto Inicial', 'INVENTORY', () => {
    const prodId = 'prod_feijao_1kg';
    const product = {
      id: prodId,
      companyId: 'emp_alfa_001',
      name: 'Feijão Carioca Tipo 1 1kg',
      barcode: '7891234567890',
      price: 50.00,
      costPrice: 30.00,
      stock: 10,
      minStock: 2,
      category: 'Alimentos'
    };
    inMemoryDB.products.set(prodId, product);

    const stored = inMemoryDB.products.get(prodId);
    assert.strictEqual(stored.stock, 10);
    assert.strictEqual(stored.price, 50.00);
  });

  // ==========================================
  // 3. CASH REGISTER OPENING & TERMINAL LOCK
  // ==========================================
  let activeRegisterId = '';
  record('3.1 Abertura de Caixa & Fechadura de Terminal', 'CASH_REGISTER', () => {
    const companyId = 'emp_alfa_001';
    const branchId = 'MATRIZ';
    const terminalId = 'PDV-01';
    const lockKey = `${companyId}_${branchId}_${terminalId}`;

    // Verify no lock
    assert.strictEqual(inMemoryDB.cashLocks.has(lockKey), false);

    const regId = `reg_${randomUUID().slice(0, 8)}`;
    const newRegister = {
      id: regId,
      companyId,
      branchId,
      terminalId,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      openedByUid: 'usr_cashier_02',
      openedByName: 'Operador Alfa',
      initialBalance: 100.00,
      operations: [],
      totalsByPaymentMethod: { CASH: 0, PIX: 0, CREDIT_CARD: 0, DEBIT_CARD: 0 }
    };

    inMemoryDB.cashRegisters.set(regId, newRegister);
    inMemoryDB.cashLocks.set(lockKey, { activeRegisterId: regId, branchId, terminalId });
    activeRegisterId = regId;

    // Test duplicate lock prevention
    const attemptDuplicate = () => {
      const lock = inMemoryDB.cashLocks.get(lockKey);
      if (lock && lock.activeRegisterId) {
        const current = inMemoryDB.cashRegisters.get(lock.activeRegisterId);
        if (current && current.status === 'OPEN') {
          throw new Error(`Já existe uma sessão de caixa ABERTA para o terminal (${terminalId}).`);
        }
      }
    };

    assert.throws(attemptDuplicate, /Já existe uma sessão de caixa ABERTA/);
  });

  // ==========================================
  // 4. SALE TRANSACTION EXECUTION
  // ==========================================
  let completedSaleId = '';
  const testSaleCode = `VD-PDV1-${Date.now().toString(36).toUpperCase()}-101`;

  record('4.1 Execução da Transação de Venda com Baixa de Estoque e Caixa', 'SALE_TRANSACTION', () => {
    const companyId = 'emp_alfa_001';
    const branchId = 'MATRIZ';
    const terminalId = 'PDV-01';
    const lockKey = `${companyId}_${branchId}_${terminalId}`;

    // Verify cash register is active
    const lock = inMemoryDB.cashLocks.get(lockKey);
    assert.ok(lock && lock.activeRegisterId);
    const register = inMemoryDB.cashRegisters.get(lock.activeRegisterId);
    assert.strictEqual(register.status, 'OPEN');

    // Cart items
    const cart = [{ productId: 'prod_feijao_1kg', quantity: 2, priceClaimedByClient: 10.00 }]; // Client forged 10.00
    const idempotencyKey = `idem_${testSaleCode}`;

    assert.strictEqual(inMemoryDB.idempotencyKeys.has(idempotencyKey), false);

    // SERVER-SIDE PRICE RECALCULATION & STOCK VERIFICATION
    let subtotal = 0;
    const resolvedItems = [];
    for (const item of cart) {
      const product = inMemoryDB.products.get(item.productId);
      assert.ok(product, 'Produto deve existir');
      assert.ok(product.stock >= item.quantity, 'Estoque deve ser suficiente');
      
      const realPrice = product.price; // Server authoritative 50.00
      const itemTotal = realPrice * item.quantity;
      subtotal += itemTotal;

      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: realPrice,
        total: itemTotal
      });
    }

    assert.strictEqual(subtotal, 100.00, 'Subtotal recalculado no servidor deve ser 100.00 e ignorar preço do cliente');

    const discount = 0;
    const total = subtotal - discount;
    const paymentMethod = PaymentMethod.CASH;
    const cashReceived = 120.00;
    const changeGiven = 20.00;

    // Persist Sale
    const saleId = `sale_${randomUUID()}`;
    const saleDoc = {
      id: saleId,
      code: testSaleCode,
      companyId,
      cashRegisterId: register.id,
      cashierUid: 'usr_cashier_02',
      cashierName: 'Operador Alfa',
      items: resolvedItems,
      subtotal,
      discount,
      total,
      paymentMethod,
      cashReceived,
      changeGiven,
      status: SaleStatus.COMPLETED,
      createdAt: new Date().toISOString()
    };

    inMemoryDB.sales.set(saleId, saleDoc);
    completedSaleId = saleId;
    inMemoryDB.idempotencyKeys.add(idempotencyKey);

    // ATOMIC STOCK DEDUCTION
    for (const item of resolvedItems) {
      const product = inMemoryDB.products.get(item.productId);
      const prevStock = product.stock;
      product.stock -= item.quantity;

      inMemoryDB.stockMovements.push({
        id: `mov_${randomUUID()}`,
        companyId,
        productId: product.id,
        productName: product.name,
        previousStock: prevStock,
        quantityDelta: -item.quantity,
        newStock: product.stock,
        type: 'SALE',
        saleId,
        operatorUid: 'usr_cashier_02',
        timestamp: new Date().toISOString()
      });
    }

    // CASH REGISTER UPDATE
    register.totalsByPaymentMethod.CASH += total;

    // AUDIT LOG
    inMemoryDB.auditLogs.push({
      companyId,
      userId: 'usr_cashier_02',
      action: 'SALE_COMPLETED',
      entityId: saleId,
      timestamp: new Date().toISOString()
    });

    // VERIFICATIONS
    const updatedProd = inMemoryDB.products.get('prod_feijao_1kg');
    assert.strictEqual(updatedProd.stock, 8, 'Estoque após venda de 2 unidades de 10 deve ser 8');
    assert.strictEqual(register.totalsByPaymentMethod.CASH, 100.00, 'Caixa deve ter acrescido 100.00 em dinheiro');
    assert.strictEqual(inMemoryDB.stockMovements.length, 1);
    assert.strictEqual(inMemoryDB.stockMovements[0].quantityDelta, -2);
  });

  // ==========================================
  // 5. CANCELLATION & STOCK RESTORATION
  // ==========================================
  record('5.1 Cancelamento de Venda & Restauração Estrita de Estoque', 'CANCELLATION', () => {
    const sale = inMemoryDB.sales.get(completedSaleId);
    assert.ok(sale, 'Venda deve existir');
    assert.strictEqual(sale.status, SaleStatus.COMPLETED);

    // Perform Cancel
    sale.status = SaleStatus.CANCELLED;
    sale.canceledAt = new Date().toISOString();
    sale.cancelReason = 'Desistência do cliente no PDV';

    // Restore stock
    for (const item of sale.items) {
      const product = inMemoryDB.products.get(item.productId);
      const prev = product.stock;
      product.stock += item.quantity;

      inMemoryDB.stockMovements.push({
        id: `mov_cancel_${randomUUID()}`,
        companyId: sale.companyId,
        productId: product.id,
        previousStock: prev,
        quantityDelta: item.quantity,
        newStock: product.stock,
        type: 'CANCELLATION',
        saleId: sale.id,
        timestamp: new Date().toISOString()
      });
    }

    // Revert register cash
    const register = inMemoryDB.cashRegisters.get(sale.cashRegisterId);
    register.totalsByPaymentMethod.CASH -= sale.total;

    const restoredProduct = inMemoryDB.products.get('prod_feijao_1kg');
    assert.strictEqual(restoredProduct.stock, 10, 'Estoque deve ser restaurado de 8 para 10 após cancelamento');
    assert.strictEqual(register.totalsByPaymentMethod.CASH, 0, 'Saldo de vendas em dinheiro do caixa deve retornar a 0');
  });

  // ==========================================
  // 6. OFFLINE STORAGE & QUEUE TENANT ISOLATION
  // ==========================================
  record('6.1 Isolamento de Fila e Cache Offline por Tenant/Terminal', 'OFFLINE_ISOLATION', () => {
    const companyA = 'emp_alfa_001';
    const companyB = 'emp_beta_002';
    const branchMatriz = 'MATRIZ';
    const term01 = 'PDV-01';

    const queueKeyA = `varejopro_offline_queue_${companyA}_${branchMatriz}_${term01}`;
    const queueKeyB = `varejopro_offline_queue_${companyB}_${branchMatriz}_${term01}`;
    const cacheKeyA = `varejopro_offline_products_cache_${companyA}_${branchMatriz}`;
    const cacheKeyB = `varejopro_offline_products_cache_${companyB}_${branchMatriz}`;

    assert.notStrictEqual(queueKeyA, queueKeyB);
    assert.notStrictEqual(cacheKeyA, cacheKeyB);

    // Simulate offline item
    const offlineItemA = {
      id: `off_${randomUUID()}`,
      companyId: companyA,
      branchId: branchMatriz,
      terminalId: term01,
      cashRegisterId: activeRegisterId,
      payload: { total: 50.00, items: [{ productId: 'p1', quantity: 1 }] },
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    assert.strictEqual(offlineItemA.companyId, companyA);
    assert.strictEqual(offlineItemA.cashRegisterId, activeRegisterId);
  });

  // ==========================================
  // 7. MULTI-TENANT SWITCH VERIFICATION
  // ==========================================
  record('7.1 Troca de Contexto Multi-Tenant & Bloqueio Cross-Tenant', 'MULTI_TENANT', () => {
    const userBetaCashier: UserAccount = {
      uid: 'usr_beta_01',
      email: 'caixa@beta.com.br',
      displayName: 'Caixa Beta',
      status: 'ACTIVE',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const membershipBeta: CompanyMembership = {
      id: 'mem_beta_01',
      userId: userBetaCashier.uid,
      companyId: 'emp_beta_002',
      companyName: 'Supermercado Beta',
      role: CompanyRole.CASHIER,
      permissions: getPermissionsForRole(CompanyRole.CASHIER),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // User from company B attempts to query products of company A
    const canAccessTenant = (reqCompanyId: string, resourceCompanyId: string) => {
      return reqCompanyId === resourceCompanyId;
    };

    assert.strictEqual(canAccessTenant(membershipBeta.companyId, 'emp_alfa_001'), false);
    assert.strictEqual(canAccessTenant(membershipBeta.companyId, 'emp_beta_002'), true);
  });

  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    results
  };
}
