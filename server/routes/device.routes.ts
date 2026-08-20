import { Router, Request, Response } from 'express';
import { requireApiAuth } from '../middleware/auth';
import { db } from '../../src/db';
import { devices } from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { LicenseService } from '../services/license.service';

const router = Router();

router.get('/api/devices', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) return res.status(400).json({ error: 'Contexto de empresa não encontrado.' });

    const [devicesList, entitlements] = await Promise.all([
      db.select().from(devices).where(eq(devices.companyId, companyId)),
      LicenseService.getCompanyEntitlements(companyId)
    ]);

    return res.json({
      success: true,
      devices: devicesList,
      entitlements: {
        activeDevicesCount: entitlements.usage.devices,
        maxDevicesLimit: entitlements.limits.devices,
        planTier: entitlements.planTier,
        status: entitlements.status
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao carregar dispositivos.' });
  }
});

router.post('/api/devices/register', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const { deviceId, deviceName, deviceType, branchId } = req.body;

    if (!companyId || !deviceId) return res.status(400).json({ error: 'companyId e deviceId são obrigatórios.' });

    const docId = `${companyId}_${deviceId}`;
    const now = new Date().toISOString();

    const existingDevice = await db.select().from(devices).where(eq(devices.id, docId)).limit(1);

    if (existingDevice.length === 0) {
      // Use atomic check via LicenseService if possible, though LicenseService currently just does a check.
      // To be truly atomic, we'd do it in a TX.
      const quotaCheck = await LicenseService.checkResourceQuota(companyId, 'devices', 1);
      
      const newDevice = {
        id: docId,
        companyId,
        branchId: branchId || null,
        name: deviceName || `PDV`,
        type: deviceType || 'PDV',
        status: quotaCheck.allowed ? 'ACTIVE' : 'INACTIVE',
        activatedAt: quotaCheck.allowed ? now : '',
      };
      
      await db.insert(devices).values(newDevice);
      
      return res.json({
        success: true,
        device: newDevice,
        activated: quotaCheck.allowed,
        quotaInfo: quotaCheck
      });
    } else {
      await db.update(devices)
        .set({ name: deviceName || existingDevice[0].name })
        .where(eq(devices.id, docId));
        
      const updated = await db.select().from(devices).where(eq(devices.id, docId)).limit(1);
      
      return res.json({
        success: true,
        device: updated[0],
        activated: updated[0].status === 'ACTIVE'
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao registrar dispositivo.' });
  }
});

router.post('/api/devices/activate', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const { deviceId, deviceName } = req.body;

    if (!companyId || !deviceId) return res.status(400).json({ error: 'companyId e deviceId são obrigatórios.' });

    const docId = `${companyId}_${deviceId}`;
    const now = new Date().toISOString();

    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(devices).where(eq(devices.id, docId)).limit(1);
      
      if (existing.length > 0 && existing[0].status === 'ACTIVE') {
        return res.json({ success: true, message: 'Dispositivo já está ativo.', device: existing[0] });
      }

      // Check quota atomically within transaction
      const entitlements = await LicenseService.getCompanyEntitlements(companyId);
      const limit = entitlements.limits.devices;
      
      const activeDevices = await tx.select().from(devices).where(and(eq(devices.companyId, companyId), eq(devices.status, 'ACTIVE')));
      if (activeDevices.length >= limit && entitlements.status !== 'SUSPENDED') {
         return res.status(402).json({
          error: 'Limite de dispositivos atingido para este plano.',
          code: 'DEVICE_LIMIT_REACHED'
        });
      }
      
      if (existing.length === 0) {
        const payload = {
          id: docId,
          companyId,
          branchId: null,
          name: deviceName || 'Terminal PDV',
          type: 'PDV',
          status: 'ACTIVE',
          activatedAt: now
        };
        await tx.insert(devices).values(payload);
        return res.json({ success: true, device: payload });
      } else {
        await tx.update(devices).set({ status: 'ACTIVE', activatedAt: now }).where(eq(devices.id, docId));
        const updated = await tx.select().from(devices).where(eq(devices.id, docId)).limit(1);
        return res.json({ success: true, device: updated[0] });
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao ativar dispositivo.' });
  }
});

router.post('/api/devices/:deviceId/release', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const deviceId = String(req.params.deviceId || '');
    const docId = deviceId.includes('_') ? deviceId : `${companyId}_${deviceId}`;

    const existing = await db.select().from(devices).where(eq(devices.id, docId)).limit(1);
    if (existing.length === 0) return res.status(404).json({ error: 'Dispositivo não encontrado.' });
    if (existing[0].companyId !== companyId) return res.status(403).json({ error: 'Acesso negado.' });

    await db.update(devices).set({ status: 'INACTIVE' }).where(eq(devices.id, docId));

    return res.json({ success: true, message: 'Vaga de dispositivo liberada com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao liberar dispositivo.' });
  }
});

export default router;
