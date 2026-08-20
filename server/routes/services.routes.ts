import express from 'express';
import { requireApiAuth, requirePermission } from '../middleware/auth.ts';
import { db } from '../../src/db/index.ts';
import { companyServices, companyProfessionals, appointments } from '../../src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = express.Router();

// Helper to standardise service mapping
function mapService(s: any) {
  return {
    ...s,
    durationMinutes: s.durationMinutes ?? s.duration ?? 30,
    bufferMinutes: s.bufferMinutes ?? 0,
    categoryId: s.categoryId || 'geral',
    bookable: s.bookable !== false,
    requiresProfessional: s.requiresProfessional !== false,
    active: s.active !== false,
  };
}

// Helper to standardise professional mapping
function mapProfessional(p: any) {
  let serviceIds = [];
  try {
    serviceIds = p.serviceIds ? JSON.parse(p.serviceIds) : [];
    if (!Array.isArray(serviceIds)) serviceIds = [];
  } catch {
    serviceIds = [];
  }
  return {
    ...p,
    displayName: p.displayName || p.name,
    serviceIds,
  };
}

// --- SERVICES ENDPOINTS ---

const getServicesHandler = async (req: express.Request, res: express.Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID not found in authentication context.' });
    }
    const snap = await db.select().from(companyServices).where(eq(companyServices.companyId, companyId));
    res.json({ success: true, services: snap.map(mapService) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const saveServiceHandler = async (req: express.Request, res: express.Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID not found.' });
    }

    if (req.body.id) {
      const existing = await db.select().from(companyServices).where(
        and(eq(companyServices.id, String(req.body.id)), eq(companyServices.companyId, companyId))
      );
      if (existing.length === 0) {
        const anyService = await db.select().from(companyServices).where(eq(companyServices.id, String(req.body.id)));
        if (anyService.length > 0) {
          return res.status(403).json({ error: 'Acesso negado: este serviço pertence a outra empresa.' });
        }
      }
    }

    const serviceId = req.body.id || randomUUID();
    const payload = {
      id: serviceId,
      companyId,
      name: req.body.name,
      description: req.body.description || null,
      price: Number(req.body.price) || 0,
      duration: Number(req.body.durationMinutes) || Number(req.body.duration) || 30,
      durationMinutes: Number(req.body.durationMinutes) || Number(req.body.duration) || 30,
      bufferMinutes: Number(req.body.bufferMinutes) || 0,
      categoryId: req.body.categoryId || 'geral',
      bookable: req.body.bookable !== false,
      requiresProfessional: req.body.requiresProfessional !== false,
      active: req.body.active !== false,
      createdAt: new Date().toISOString()
    };

    await db.insert(companyServices)
      .values(payload)
      .onConflictDoUpdate({
        target: companyServices.id,
        set: {
          name: payload.name,
          description: payload.description,
          price: payload.price,
          duration: payload.duration,
          durationMinutes: payload.durationMinutes,
          bufferMinutes: payload.bufferMinutes,
          categoryId: payload.categoryId,
          bookable: payload.bookable,
          requiresProfessional: payload.requiresProfessional,
          active: payload.active,
        }
      });

    res.json({ success: true, service: mapService(payload) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const deleteServiceHandler = async (req: express.Request, res: express.Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const id = req.params.id || req.query.id;
    if (!id) {
      return res.status(400).json({ error: 'Missing service id parameter.' });
    }

    await db.delete(companyServices).where(
      and(
        eq(companyServices.id, String(id)),
        eq(companyServices.companyId, companyId)
      )
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Map Standard and Legacy routes
router.get('/api/services', requireApiAuth, getServicesHandler);
router.get('/api/services/list', requireApiAuth, getServicesHandler);
router.post('/api/services', requireApiAuth, requirePermission('manageStock'), saveServiceHandler);
router.post('/api/services/save', requireApiAuth, requirePermission('manageStock'), saveServiceHandler);
router.delete('/api/services/:id', requireApiAuth, requirePermission('manageStock'), deleteServiceHandler);
router.post('/api/services/delete', requireApiAuth, requirePermission('manageStock'), deleteServiceHandler);
router.get('/api/services/delete', requireApiAuth, requirePermission('manageStock'), deleteServiceHandler);


// --- PROFESSIONALS ENDPOINTS ---

const getProfessionalsHandler = async (req: express.Request, res: express.Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID not found.' });
    }
    const snap = await db.select().from(companyProfessionals).where(eq(companyProfessionals.companyId, companyId));
    res.json({ success: true, professionals: snap.map(mapProfessional) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const saveProfessionalHandler = async (req: express.Request, res: express.Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID not found.' });
    }

    if (req.body.id) {
      const existing = await db.select().from(companyProfessionals).where(
        and(eq(companyProfessionals.id, String(req.body.id)), eq(companyProfessionals.companyId, companyId))
      );
      if (existing.length === 0) {
        const anyProf = await db.select().from(companyProfessionals).where(eq(companyProfessionals.id, String(req.body.id)));
        if (anyProf.length > 0) {
          return res.status(403).json({ error: 'Acesso negado: este profissional pertence a outra empresa.' });
        }
      }
    }

    const profId = req.body.id || randomUUID();
    const payload = {
      id: profId,
      companyId,
      name: req.body.displayName || req.body.name,
      displayName: req.body.displayName || req.body.name,
      serviceIds: req.body.serviceIds ? JSON.stringify(req.body.serviceIds) : '[]',
      createdAt: new Date().toISOString()
    };

    await db.insert(companyProfessionals)
      .values(payload)
      .onConflictDoUpdate({
        target: companyProfessionals.id,
        set: {
          name: payload.name,
          displayName: payload.displayName,
          serviceIds: payload.serviceIds,
        }
      });

    res.json({ success: true, professional: mapProfessional(payload) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const deleteProfessionalHandler = async (req: express.Request, res: express.Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const id = req.params.id || req.query.id;
    if (!id) {
      return res.status(400).json({ error: 'Missing professional id parameter.' });
    }

    await db.delete(companyProfessionals).where(
      and(
        eq(companyProfessionals.id, String(id)),
        eq(companyProfessionals.companyId, companyId)
      )
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

router.get('/api/professionals', requireApiAuth, getProfessionalsHandler);
router.get('/api/professionals/list', requireApiAuth, getProfessionalsHandler);
router.post('/api/professionals', requireApiAuth, requirePermission('manageStock'), saveProfessionalHandler);
router.post('/api/professionals/save', requireApiAuth, requirePermission('manageStock'), saveProfessionalHandler);
router.delete('/api/professionals/:id', requireApiAuth, requirePermission('manageStock'), deleteProfessionalHandler);
router.post('/api/professionals/delete', requireApiAuth, requirePermission('manageStock'), deleteProfessionalHandler);
router.get('/api/professionals/delete', requireApiAuth, requirePermission('manageStock'), deleteProfessionalHandler);


// --- APPOINTMENTS ENDPOINTS ---

const getAppointmentsHandler = async (req: express.Request, res: express.Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID not found.' });
    }
    const snap = await db.select().from(appointments).where(eq(appointments.companyId, companyId));
    res.json({ success: true, appointments: snap });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const createAppointmentHandler = async (req: express.Request, res: express.Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID not found.' });
    }

    const { serviceId, professionalId, startAt, customerName, customerPhone, customerEmail, notes } = req.body;

    // Validate professional belongs to company
    if (professionalId) {
      const profRows = await db.select().from(companyProfessionals).where(
        and(
          eq(companyProfessionals.id, professionalId),
          eq(companyProfessionals.companyId, companyId)
        )
      );
      if (profRows.length === 0) {
        return res.status(400).json({ error: 'Profissional inválido ou de outra empresa.' });
      }
    }

    // Resolve service details to store snapshot
    const servSnap = await db.select().from(companyServices).where(
      and(
        eq(companyServices.id, serviceId),
        eq(companyServices.companyId, companyId)
      )
    );
    const service = servSnap[0];
    if (!service) {
      return res.status(400).json({ error: 'Serviço não encontrado ou pertence a outra empresa.' });
    }

    const serviceName = service.name;
    const servicePrice = service.price || 0;
    const duration = service.durationMinutes || service.duration || 30;

    // Calculate endAt
    const startDate = new Date(startAt);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Formato de data e hora do agendamento inválido.' });
    }
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const endAt = endDate.toISOString();

    const apptId = randomUUID();
    const payload = {
      id: apptId,
      companyId,
      serviceId,
      serviceName,
      servicePrice,
      professionalId: professionalId || 'geral',
      date: startAt.split('T')[0],
      startAt,
      endAt,
      customerName: String(customerName || 'Cliente Balcão').trim(),
      customerPhone: customerPhone ? String(customerPhone).trim() : null,
      customerEmail: customerEmail ? String(customerEmail).trim() : null,
      notes: notes ? String(notes).trim() : null,
      status: 'CONFIRMADO', // Auto-confirm standard bookings
      createdAt: new Date().toISOString()
    };

    await db.insert(appointments).values(payload);
    res.json({ success: true, appointment: payload });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const deleteAppointmentHandler = async (req: express.Request, res: express.Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID not found.' });
    }

    const id = req.params.id || req.query.id || req.body.id;
    if (!id) {
      return res.status(400).json({ error: 'Missing appointment id.' });
    }

    await db.delete(appointments).where(
      and(
        eq(appointments.id, String(id)),
        eq(appointments.companyId, companyId)
      )
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const updateAppointmentStatusHandler = async (req: express.Request, res: express.Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: 'Company ID not found.' });
    }

    const id = req.params.id || req.body.appointmentId;
    const status = req.body.status;
    if (!id || !status) {
      return res.status(400).json({ error: 'Missing appointment id or status.' });
    }

    // Secure UPDATE with companyId clause (Multi-tenant check)
    await db.update(appointments)
      .set({ status })
      .where(
        and(
          eq(appointments.id, String(id)),
          eq(appointments.companyId, companyId)
        )
      );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

router.get('/api/appointments', requireApiAuth, getAppointmentsHandler);
router.get('/api/appointments/list', requireApiAuth, getAppointmentsHandler);
router.post('/api/appointments', requireApiAuth, requirePermission('posAccess'), createAppointmentHandler);
router.post('/api/appointments/create', requireApiAuth, requirePermission('posAccess'), createAppointmentHandler);
router.put('/api/appointments/:id/status', requireApiAuth, requirePermission('posAccess'), updateAppointmentStatusHandler);
router.post('/api/appointments/update-status', requireApiAuth, requirePermission('posAccess'), updateAppointmentStatusHandler);
router.delete('/api/appointments/:id', requireApiAuth, requirePermission('posAccess'), deleteAppointmentHandler);
router.post('/api/appointments/delete', requireApiAuth, requirePermission('posAccess'), deleteAppointmentHandler);

export default router;
