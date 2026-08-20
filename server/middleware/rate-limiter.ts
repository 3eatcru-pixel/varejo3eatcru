import express from 'express';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// Dual-tiered thresholds (Audit Point 11 & 23)
const STRICT_LIMIT = 15; // Max 15 requests/min for auth & public endpoints
const GLOBAL_LIMIT = 300; // Max 300 requests/min for standard workspace endpoints

export const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const auth = (req as any).auth;
    const uid = auth?.uid;
    const companyId = auth?.companyId;
    const ip = req.ip || "unknown";
    const now = Date.now();
    
    // Check if current endpoint requires strict rate limit
    const isStrictRoute = 
        req.path.startsWith('/api/auth/login') || 
        req.path.startsWith('/api/auth/register') ||
        req.path.startsWith('/api/auth/reset-password') ||
        req.path.startsWith('/api/pulse/public/order') ||
        req.path.startsWith('/api/pulse/public');

    const limit = isStrictRoute ? STRICT_LIMIT : GLOBAL_LIMIT;
    
    // Per-user or per-IP key
    const clientKey = `${uid || ip}:${isStrictRoute ? 'strict' : 'global'}`;

    // Per-tenant key (Noisy Neighbor protection)
    const tenantKey = companyId ? `tenant:${companyId}:global` : null;
    const TENANT_GLOBAL_LIMIT = 2000; // Shared limit for all users of a single tenant per minute

    // Check Tenant Limit first
    if (tenantKey && !isStrictRoute) {
        const tenantData = rateLimitMap.get(tenantKey);
        if (tenantData && now < tenantData.resetTime && tenantData.count >= TENANT_GLOBAL_LIMIT) {
            return res.status(429).json({ 
                error: "TENANT_RATE_LIMIT_EXCEEDED",
                message: "Sua empresa atingiu o limite global de requisições por minuto. Por favor, aguarde um pouco." 
            });
        }
        if (!tenantData || now > tenantData.resetTime) {
            rateLimitMap.set(tenantKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        } else {
            tenantData.count += 1;
        }
    }

    const clientData = rateLimitMap.get(clientKey);
    if (!clientData || now > clientData.resetTime) {
      rateLimitMap.set(clientKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      return next();
    }

    if (clientData.count >= limit) {
      return res.status(429).json({ 
         error: "TOO_MANY_REQUESTS",
         message: "Limite de requisições temporariamente excedido para sua proteção. Por favor, aguarde um minuto e tente novamente." 
       });
    }

    clientData.count += 1;
    next();
};

