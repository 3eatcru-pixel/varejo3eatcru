import { 
  CartItem, 
  SaleItem, 
  PaymentMethod, 
  SplitPayment, 
  Product, 
  CashRegister, 
  CashOperation,
  CashOperationType,
  CashRegisterReconciliation,
  normalizePaymentMethod
} from '@varejopro/types';

/**
 * Calculates item totals and subtotal for a list of cart items.
 */
export function calculateCartTotals(items: CartItem[], discountAmount = 0, loyaltyDiscount = 0) {
  const subtotal = items.reduce((acc, item) => {
    const unitPrice = item.selectedVariation?.price ?? item.product.price;
    const itemDiscount = item.discount || 0;
    const itemTotal = Math.max(0, (unitPrice * item.quantity) - itemDiscount);
    return acc + itemTotal;
  }, 0);

  const totalDiscount = Math.max(0, discountAmount + loyaltyDiscount);
  const total = Math.max(0, subtotal - totalDiscount);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    total: Number(total.toFixed(2))
  };
}

/**
 * Validates and calculates change given for a cash payment.
 */
export function calculateCashChange(total: number, cashReceived: number): number {
  if (cashReceived < total) return 0;
  return Number((cashReceived - total).toFixed(2));
}

/**
 * Validates split payments against total sale amount.
 */
export function validateSplitPayments(total: number, splits: SplitPayment[]): { isValid: boolean; difference: number } {
  const sum = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const diff = Number((sum - total).toFixed(2));
  return {
    isValid: Math.abs(diff) < 0.01,
    difference: diff
  };
}

/**
 * Reconciles cash register balances based on opening balance, sales totals, and sangria/suprimento operations.
 */
export function calculateCashRegisterBalances(
  initialBalance: number,
  salesTotalsByMethod: Record<PaymentMethod, number>,
  operations: CashOperation[],
  declaredAmounts: {
    cash?: number;
    pix?: number;
    credit?: number;
    debit?: number;
  }
): CashRegisterReconciliation {
  const safeInitial = Number(initialBalance) || 0;

  const totalSalesCash = Number(salesTotalsByMethod[PaymentMethod.CASH] || 0);
  const totalSalesPix = Number(salesTotalsByMethod[PaymentMethod.PIX] || 0);
  const totalSalesCredit = Number(salesTotalsByMethod[PaymentMethod.CREDIT_CARD] || 0);
  const totalSalesDebit = Number(salesTotalsByMethod[PaymentMethod.DEBIT_CARD] || 0);
  const totalSalesAll = totalSalesCash + totalSalesPix + totalSalesCredit + totalSalesDebit;

  let totalSangria = 0;
  let totalSuprimento = 0;

  for (const op of operations) {
    if (op.type === CashOperationType.SANGRIA) {
      totalSangria += Number(op.amount) || 0;
    } else if (op.type === CashOperationType.SUPRIMENTO) {
      totalSuprimento += Number(op.amount) || 0;
    }
  }

  const expectedCash = Number((safeInitial + totalSalesCash + totalSuprimento - totalSangria).toFixed(2));
  const expectedPix = Number(totalSalesPix.toFixed(2));
  const expectedCredit = Number(totalSalesCredit.toFixed(2));
  const expectedDebit = Number(totalSalesDebit.toFixed(2));
  const totalExpectedAll = Number((expectedCash + expectedPix + expectedCredit + expectedDebit).toFixed(2));

  const declaredCash = Number(declaredAmounts.cash ?? expectedCash);
  const declaredPix = Number(declaredAmounts.pix ?? expectedPix);
  const declaredCredit = Number(declaredAmounts.credit ?? expectedCredit);
  const declaredDebit = Number(declaredAmounts.debit ?? expectedDebit);
  const totalDeclaredAll = Number((declaredCash + declaredPix + declaredCredit + declaredDebit).toFixed(2));

  return {
    expectedCash,
    declaredCash,
    diffCash: Number((declaredCash - expectedCash).toFixed(2)),
    expectedPix,
    declaredPix,
    diffPix: Number((declaredPix - expectedPix).toFixed(2)),
    expectedCredit,
    declaredCredit,
    diffCredit: Number((declaredCredit - expectedCredit).toFixed(2)),
    expectedDebit,
    declaredDebit,
    diffDebit: Number((declaredDebit - expectedDebit).toFixed(2)),
    totalSalesCash,
    totalSalesPix,
    totalSalesCredit,
    totalSalesDebit,
    totalSalesAll,
    totalSangria,
    totalSuprimento,
    totalDeclaredAll,
    totalExpectedAll
  };
}
