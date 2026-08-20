import express from "express";
import path from "path";
import fs from "fs";
import * as dotenv from 'dotenv';
dotenv.config();

import { runMigrations } from './src/db/migrate.ts';
import { rateLimiter } from './server/middleware/rate-limiter.ts';
import { enforceTenantIsolation } from './server/middleware/tenant.middleware.ts';
import { auditLog } from './server/middleware/audit.middleware.ts';

import authRoutes from './server/routes/auth.routes.ts';
import geminiRoutes from './server/routes/gemini.routes.ts';
import fiscalRoutes from './server/routes/fiscal.routes.ts';
import financeRoutes from './server/routes/finance.routes.ts';
import stockRoutes from './server/routes/stock.routes.ts';
import saleRoutes from './server/routes/sale.routes.ts';
import cashRegisterRoutes from './server/routes/cash-register.routes.ts';
import clientRoutes from './server/routes/client.routes.ts';
import hqRoutes from './server/routes/hq.routes.ts';
import accountRoutes from './server/routes/account.routes.ts';
import billingRoutes from './server/routes/billing.routes.ts';
import servicesRoutes from './server/routes/services.routes.ts';
import pulseRoutes from './server/routes/pulse.routes.ts';
import deviceRoutes from './server/routes/device.routes.ts';
import releasesRoutes from './server/routes/releases.routes.ts';
import atendimentoLocalRoutes from './server/routes/atendimento-local.routes.ts';
import employeeRoutes from './server/routes/employee.routes.ts';
import uploadRoutes from './server/routes/upload.routes.ts';


async function startServer() {
  const app = express();

  // 🛡️ HTTP Hardening and Security Headers Middleware (Audit Point 12)
  app.use((req, res, next) => {
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Clickjacking protection
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // XSS protection headers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Strict Transport Security (HSTS)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Secure Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Explicit production-grade CORS configuration
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin === 'null' ? '*' : origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Idempotency-Key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Limit JSON requests payload size to 1MB to prevent Denial of Service (Audit Point 12)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  // Static serving of secure uploads with cache control
  const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsPath, {
    maxAge: '1d',
    immutable: true,
    index: false
  }));

  // Global Rate Limiting Connection (Audit Point 11 & 23)
  app.use(rateLimiter);

  // Global Tenant Isolation Enforcer (Audit Point 24)
  app.use(enforceTenantIsolation);

  // API Routes
  app.use(authRoutes);
  app.use(geminiRoutes);
  app.use(fiscalRoutes);
  app.use(financeRoutes);
  app.use(stockRoutes);
  app.use(saleRoutes);
  app.use(cashRegisterRoutes);
  app.use(clientRoutes);
  app.use(hqRoutes);
  app.use(accountRoutes);
  app.use(billingRoutes);
  app.use(servicesRoutes);
  app.use(pulseRoutes);
  app.use(deviceRoutes);
  app.use(releasesRoutes);
  app.use(atendimentoLocalRoutes);
  app.use(employeeRoutes);
  app.use(uploadRoutes);


  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Frontend Serving (Vite in Dev / Static in Prod)
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, "index.html"));
      }
      next();
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // Execute database initialization asynchronously so port binding is instant
  runMigrations().catch(err => {
    console.warn("Database initialization notice on startup:", err);
  });
}

startServer().catch((err: any) => {
  console.error("Fatal error starting server:", err);
});

