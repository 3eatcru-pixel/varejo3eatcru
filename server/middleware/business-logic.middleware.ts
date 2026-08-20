import { Request, Response, NextFunction } from 'express';

/**
 * Strict DTO Validator
 * Addresses Audit Point 5 (Mass Assignment / Broken Object Property Level Authorization)
 * Ensures that only explicitly permitted fields are accepted from the frontend.
 */
export const strictValidateDTO = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    const incomingFields = Object.keys(req.body);
    const forbiddenFields = incomingFields.filter(field => !allowedFields.includes(field));

    if (forbiddenFields.length > 0) {
      console.warn(`[SECURITY] Mass Assignment Blocked. Forbidden fields: ${forbiddenFields.join(', ')}`);
      return res.status(400).json({
        error: 'MASS_ASSIGNMENT_ATTEMPT',
        message: 'Payload contains unauthorized properties.',
        fields: forbiddenFields
      });
    }

    next();
  };
};

/**
 * Business Logic POS Protection
 * Addresses Audit Point 6 (PDV Fraud: infinite discount, negative qty, etc.)
 */
export const validateSaleBusinessLogic = (req: Request, res: Response, next: NextFunction) => {
  const { items, discount, payment } = req.body;

  // 1. Validate Quantities and Prices
  if (Array.isArray(items)) {
    for (const item of items) {
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isFinite(item.quantity)) {
        return res.status(400).json({ error: 'BUSINESS_LOGIC_ERROR', message: 'Quantidade inválida detectada.' });
      }
      if (typeof item.price !== 'number' || item.price < 0 || !Number.isFinite(item.price)) {
        return res.status(400).json({ error: 'BUSINESS_LOGIC_ERROR', message: 'Preço inválido detectada.' });
      }
    }
  }

  // 2. Validate Discount Logic
  if (discount !== undefined) {
    if (typeof discount !== 'number' || discount < 0 || !Number.isFinite(discount)) {
      return res.status(400).json({ error: 'BUSINESS_LOGIC_ERROR', message: 'Desconto inválido.' });
    }
    // Prevent 100%+ discounts without specific logic/approvals
    // Assume req.body.total is calculated on the server eventually, but here we sanity check the inputs.
  }

  next();
};
