import express, { Request, Response } from 'express';
import { requireApiAuth, requirePermission } from '../middleware/auth';
import { db } from '../../src/db';
import { employees, users, branches, employeeSchedules } from '../../src/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { logAuditEvent } from '../lib/audit';

const router = express.Router();

// 1. GET /api/employees - List all employees of the company
router.get('/api/employees', requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Contexto de empresa não encontrado.' });

    const companyEmployees = await db.select()
      .from(employees)
      .where(eq(employees.companyId, companyId));

    return res.json({ success: true, employees: companyEmployees });
  } catch (error: any) {
    console.error('Erro ao buscar funcionários:', error);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
  }
});

// 2. POST /api/employees - Create or Update employee
router.post('/api/employees', requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const adminUid = (req as any).auth?.uid;
    if (!companyId) return res.status(401).json({ error: 'Contexto de empresa não encontrado.' });

    const {
      id,
      userId,
      name,
      email,
      registrationNumber,
      role,
      department,
      branchId,
      status,
      pulseStatus,
      commissionRate,
      admissionDate
    } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'O nome do funcionário é obrigatório.' });
    }
    if (!role || role.trim().length === 0) {
      return res.status(400).json({ error: 'O cargo/função é obrigatório.' });
    }

    // Tenant Isolation validations
    if (branchId) {
      const branchExists = await db.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.companyId, companyId)));
      if (branchExists.length === 0) {
        return res.status(400).json({ error: 'A filial selecionada é inválida ou pertence a outra empresa.' });
      }
    }

    if (userId) {
      // Ensure user belongs to this company (verified via memberships)
      const userExists = await db.select().from(users).where(eq(users.id, userId));
      if (userExists.length === 0) {
        return res.status(400).json({ error: 'O usuário do sistema vinculado é inválido.' });
      }
    }

    const safeCommission = Math.max(0, Number(commissionRate) || 0);
    const nowIso = new Date().toISOString();

    if (id) {
      // Update employee
      const existing = await db.select().from(employees).where(and(eq(employees.id, id), eq(employees.companyId, companyId)));
      if (existing.length === 0) {
        return res.status(403).json({ error: 'Funcionário não encontrado ou pertence a outra empresa.' });
      }

      await db.update(employees)
        .set({
          userId: userId || null,
          name: name.trim().substring(0, 100),
          email: email ? email.trim().substring(0, 100) : null,
          avatarUrl: req.body.avatarUrl || existing[0].avatarUrl,
          registrationNumber: registrationNumber ? String(registrationNumber).trim().substring(0, 50) : null,
          role: role.trim().substring(0, 50),
          department: department ? department.trim().substring(0, 50) : null,
          branchId: branchId || null,
          status: status || 'ACTIVE',
          pulseStatus: pulseStatus || 'AVAILABLE',
          commissionRate: safeCommission,
          admissionDate: admissionDate || null,
          updatedAt: nowIso
        })
        .where(and(eq(employees.id, id), eq(employees.companyId, companyId)));

      logAuditEvent(companyId, adminUid, 'EMPLOYEE_UPDATE', `Funcionário ${name} (ID: ${id}) atualizado com sucesso.`, req);
      return res.json({ success: true, message: 'Funcionário atualizado com sucesso!', employeeId: id });
    } else {
      // Create employee
      const newId = 'emp_' + randomUUID().substring(0, 8);
      await db.insert(employees)
        .values({
          id: newId,
          companyId,
          userId: userId || null,
          name: name.trim().substring(0, 100),
          email: email ? email.trim().substring(0, 100) : null,
          avatarUrl: req.body.avatarUrl || null,
          registrationNumber: registrationNumber ? String(registrationNumber).trim().substring(0, 50) : null,
          role: role.trim().substring(0, 50),
          department: department ? department.trim().substring(0, 50) : null,
          branchId: branchId || null,
          status: status || 'ACTIVE',
          pulseStatus: pulseStatus || 'AVAILABLE',
          commissionRate: safeCommission,
          admissionDate: admissionDate || null,
          createdAt: nowIso,
          updatedAt: nowIso
        });

      logAuditEvent(companyId, adminUid, 'EMPLOYEE_CREATE', `Funcionário ${name} (ID: ${newId}) cadastrado com sucesso.`, req);
      return res.json({ success: true, message: 'Funcionário cadastrado com sucesso!', employeeId: newId });
    }
  } catch (error: any) {
    console.error('Erro ao salvar funcionário:', error);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
  }
});

// 3. DELETE /api/employees/:id - Delete employee record
router.delete('/api/employees/:id', requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const adminUid = (req as any).auth?.uid;
    const id = req.params.id as string;

    if (!companyId) return res.status(401).json({ error: 'Contexto de empresa não encontrado.' });

    const existing = await db.select().from(employees).where(and(eq(employees.id, id), eq(employees.companyId, companyId)));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado ou pertence a outra empresa.' });
    }

    await db.delete(employees).where(and(eq(employees.id, id), eq(employees.companyId, companyId)));

    logAuditEvent(companyId, adminUid, 'EMPLOYEE_DELETE', `Funcionário ${existing[0].name} (ID: ${id}) excluído.`, req);
    return res.json({ success: true, message: 'Funcionário removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao remover funcionário:', error);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
  }
});

// 4. GET /api/employees/pulse-status - List active employees and their real-time Pulse availability status
router.get('/api/employees/pulse-status', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Contexto de empresa não encontrado.' });

    const activeEmployees = await db.select()
      .from(employees)
      .where(and(
        eq(employees.companyId, companyId),
        eq(employees.status, 'ACTIVE')
      ));

    return res.json({ success: true, employees: activeEmployees });
  } catch (error: any) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
  }
});

// 5. POST /api/employees/:id/pulse-status - Update own or employee's operational status
router.post('/api/employees/:id/pulse-status', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const uid = (req as any).auth?.uid;
    const employeeId = req.params.id as string;
    const { pulseStatus } = req.body;

    if (!companyId) return res.status(401).json({ error: 'Contexto de empresa não encontrado.' });
    if (!['AVAILABLE', 'BUSY', 'OFFLINE'].includes(pulseStatus)) {
      return res.status(400).json({ error: 'Status do Pulse inválido. Escolha entre AVAILABLE, BUSY, OFFLINE.' });
    }

    const [emp] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.companyId, companyId)));
    if (!emp) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    // Security check: must be linked to logged-in user OR have manager/admin privileges
    const isSelf = emp.userId === uid;
    const userRole = (req as any).auth?.role;
    const isManagerOrAdmin = ['OWNER', 'ADMIN', 'MANAGER'].includes(userRole);

    if (!isSelf && !isManagerOrAdmin) {
      return res.status(403).json({ error: 'Acesso negado: Você não pode alterar o status de outro funcionário.' });
    }

    await db.update(employees)
      .set({ pulseStatus })
      .where(and(eq(employees.id, employeeId), eq(employees.companyId, companyId)));

    logAuditEvent(companyId, uid, 'EMPLOYEE_PULSE_STATUS', `Status do Pulse para ${emp.name} atualizado para ${pulseStatus}.`, req);
    return res.json({ success: true, message: `Status de disponibilidade atualizado para ${pulseStatus}.` });
  } catch (error: any) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
  }
});

// ==========================================
// 6. EMPLOYEE WORK SCHEDULES (ESCALA DE TRABALHO)
// ==========================================

// 6.1 GET /api/employees/schedules - List all schedules for the company
router.get('/api/employees/schedules', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) return res.status(401).json({ error: 'Contexto de empresa não encontrado.' });

    const { employeeId, branchId, dayOfWeek, shiftDate } = req.query;

    let queryBuilder = db.select({
      id: employeeSchedules.id,
      companyId: employeeSchedules.companyId,
      employeeId: employeeSchedules.employeeId,
      branchId: employeeSchedules.branchId,
      dayOfWeek: employeeSchedules.dayOfWeek,
      shiftDate: employeeSchedules.shiftDate,
      shiftType: employeeSchedules.shiftType,
      startTime: employeeSchedules.startTime,
      endTime: employeeSchedules.endTime,
      breakMinutes: employeeSchedules.breakMinutes,
      status: employeeSchedules.status,
      notes: employeeSchedules.notes,
      createdAt: employeeSchedules.createdAt,
      updatedAt: employeeSchedules.updatedAt,
      employeeName: employees.name,
      employeeRole: employees.role,
      employeeDepartment: employees.department,
      employeeAvatar: employees.avatarUrl,
      branchName: branches.name,
    })
    .from(employeeSchedules)
    .innerJoin(employees, eq(employeeSchedules.employeeId, employees.id))
    .leftJoin(branches, eq(employeeSchedules.branchId, branches.id))
    .where(eq(employeeSchedules.companyId, companyId))
    .orderBy(desc(employeeSchedules.createdAt));

    const schedulesList = await queryBuilder;

    // Filter in memory if specific query parameters are supplied
    const filtered = schedulesList.filter(item => {
      if (employeeId && item.employeeId !== employeeId) return false;
      if (branchId && item.branchId !== branchId) return false;
      if (dayOfWeek !== undefined && String(item.dayOfWeek) !== String(dayOfWeek)) return false;
      if (shiftDate && item.shiftDate !== shiftDate) return false;
      return true;
    });

    return res.json({ success: true, schedules: filtered });
  } catch (error: any) {
    console.error('Erro ao buscar escalas de trabalho:', error);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
  }
});

// 6.2 POST /api/employees/schedules - Create or Update a schedule shift entry
router.post('/api/employees/schedules', requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const adminUid = (req as any).auth?.uid;
    if (!companyId) return res.status(401).json({ error: 'Contexto de empresa não encontrado.' });

    const {
      id,
      employeeId,
      branchId,
      dayOfWeek,
      shiftDate,
      shiftType,
      startTime,
      endTime,
      breakMinutes,
      status,
      notes
    } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'O funcionário é obrigatório.' });
    }

    if (dayOfWeek === undefined || dayOfWeek === null) {
      return res.status(400).json({ error: 'O dia da semana é obrigatório (0 = Domingo a 6 = Sábado).' });
    }

    // Validate employee exists and belongs to company (Tenant Isolation)
    const empExists = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.companyId, companyId)));
    if (empExists.length === 0) {
      return res.status(400).json({ error: 'Funcionário selecionado não pertence a esta empresa.' });
    }

    if (branchId) {
      const branchExists = await db.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.companyId, companyId)));
      if (branchExists.length === 0) {
        return res.status(400).json({ error: 'A filial selecionada é inválida ou pertence a outra empresa.' });
      }
    }

    const nowIso = new Date().toISOString();
    const safeDay = Math.min(6, Math.max(0, parseInt(String(dayOfWeek), 10) || 0));
    const safeBreak = Math.max(0, parseInt(String(breakMinutes), 10) || 0);

    if (id) {
      // Update existing schedule entry
      const existing = await db.select().from(employeeSchedules).where(and(eq(employeeSchedules.id, id), eq(employeeSchedules.companyId, companyId)));
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Escala de turno não encontrada ou pertence a outra empresa.' });
      }

      await db.update(employeeSchedules)
        .set({
          employeeId,
          branchId: branchId || null,
          dayOfWeek: safeDay,
          shiftDate: shiftDate ? String(shiftDate).trim() : null,
          shiftType: shiftType || 'PADRAO',
          startTime: startTime || '08:00',
          endTime: endTime || '17:00',
          breakMinutes: safeBreak,
          status: status || 'SCHEDULED',
          notes: notes ? String(notes).trim() : null,
          updatedAt: nowIso
        })
        .where(and(eq(employeeSchedules.id, id), eq(employeeSchedules.companyId, companyId)));

      logAuditEvent(companyId, adminUid, 'SCHEDULE_UPDATE', `Turno de escala atualizado para funcionário ${empExists[0].name}.`, req);
      return res.json({ success: true, message: 'Turno de escala atualizado com sucesso!', scheduleId: id });
    } else {
      // Create new schedule entry
      const newId = 'sch_' + randomUUID().substring(0, 8);
      await db.insert(employeeSchedules)
        .values({
          id: newId,
          companyId,
          employeeId,
          branchId: branchId || null,
          dayOfWeek: safeDay,
          shiftDate: shiftDate ? String(shiftDate).trim() : null,
          shiftType: shiftType || 'PADRAO',
          startTime: startTime || '08:00',
          endTime: endTime || '17:00',
          breakMinutes: safeBreak,
          status: status || 'SCHEDULED',
          notes: notes ? String(notes).trim() : null,
          createdAt: nowIso,
          updatedAt: nowIso
        });

      logAuditEvent(companyId, adminUid, 'SCHEDULE_CREATE', `Novo turno na escala atribuído para ${empExists[0].name}.`, req);
      return res.json({ success: true, message: 'Turno adicionado à escala com sucesso!', scheduleId: newId });
    }
  } catch (error: any) {
    console.error('Erro ao salvar escala de trabalho:', error);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
  }
});

// 6.3 POST /api/employees/schedules/batch-generate - Auto-generate weekly shift template for employees
router.post('/api/employees/schedules/batch-generate', requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const adminUid = (req as any).auth?.uid;
    if (!companyId) return res.status(401).json({ error: 'Contexto de empresa não encontrado.' });

    const { employeeIds, templateType, defaultStartTime, defaultEndTime, breakMinutes, offDays } = req.body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ error: 'Selecione ao menos um funcionário para gerar a escala.' });
    }

    // Verify all employee IDs belong to company
    const validEmployees = await db.select().from(employees).where(and(eq(employees.companyId, companyId), eq(employees.status, 'ACTIVE')));
    const validEmpIdSet = new Set(validEmployees.map(e => e.id));
    const targetEmployees = employeeIds.filter(id => validEmpIdSet.has(id));

    if (targetEmployees.length === 0) {
      return res.status(400).json({ error: 'Nenhum funcionário ativo válido encontrado para esta empresa.' });
    }

    const nowIso = new Date().toISOString();
    const start = defaultStartTime || '08:00';
    const end = defaultEndTime || '17:00';
    const breakMins = parseInt(String(breakMinutes), 10) || 60;
    const selectedOffDays: number[] = Array.isArray(offDays) ? offDays : [0]; // default Sunday is off

    let insertedCount = 0;

    for (const empId of targetEmployees) {
      // For days 0 to 6 (Sunday to Saturday)
      for (let day = 0; day <= 6; day++) {
        const isOff = selectedOffDays.includes(day);
        const newId = 'sch_' + randomUUID().substring(0, 8);

        await db.insert(employeeSchedules)
          .values({
            id: newId,
            companyId,
            employeeId: empId,
            dayOfWeek: day,
            shiftDate: null, // weekly recurring
            shiftType: isOff ? 'FOLGA' : (templateType || 'PADRAO'),
            startTime: isOff ? '00:00' : start,
            endTime: isOff ? '00:00' : end,
            breakMinutes: isOff ? 0 : breakMins,
            status: isOff ? 'FOLGA' : 'SCHEDULED',
            notes: isOff ? 'Folga semanal programada' : `Escala semanal ${templateType || 'padrão'}`,
            createdAt: nowIso,
            updatedAt: nowIso
          });
        insertedCount++;
      }
    }

    logAuditEvent(companyId, adminUid, 'SCHEDULE_BATCH_GENERATE', `Escala semanal gerada automaticamente para ${targetEmployees.length} funcionários (${insertedCount} turnos criados).`, req);

    return res.json({
      success: true,
      message: `Escala semanal gerada com sucesso para ${targetEmployees.length} colaboradores (${insertedCount} turnos cadastrados)!`,
      count: insertedCount
    });
  } catch (error: any) {
    console.error('Erro na geração em lote da escala:', error);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
  }
});

// 6.4 DELETE /api/employees/schedules/:id - Remove a shift schedule entry
router.delete('/api/employees/schedules/:id', requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const adminUid = (req as any).auth?.uid;
    const id = req.params.id as string;

    if (!companyId) return res.status(401).json({ error: 'Contexto de empresa não encontrado.' });

    const existing = await db.select().from(employeeSchedules).where(and(eq(employeeSchedules.id, id), eq(employeeSchedules.companyId, companyId)));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Turno de escala não encontrado.' });
    }

    await db.delete(employeeSchedules).where(and(eq(employeeSchedules.id, id), eq(employeeSchedules.companyId, companyId)));

    logAuditEvent(companyId, adminUid, 'SCHEDULE_DELETE', `Turno de escala #${id} removido.`, req);
    return res.json({ success: true, message: 'Turno de escala removido com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao remover escala:', error);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
  }
});

// 6.5 PUT /api/employees/schedules/:id/status - Quick update status of shift (e.g. mark FOLGA, COMPLETED, SWAPPED)
router.put('/api/employees/schedules/:id/status', requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const adminUid = (req as any).auth?.uid;
    const id = req.params.id as string;
    const { status, shiftType } = req.body;

    if (!companyId) return res.status(401).json({ error: 'Contexto de empresa não encontrado.' });

    const existing = await db.select().from(employeeSchedules).where(and(eq(employeeSchedules.id, id), eq(employeeSchedules.companyId, companyId)));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Turno de escala não encontrado.' });
    }

    await db.update(employeeSchedules)
      .set({
        status: status || existing[0].status,
        shiftType: shiftType || existing[0].shiftType,
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(employeeSchedules.id, id), eq(employeeSchedules.companyId, companyId)));

    logAuditEvent(companyId, adminUid, 'SCHEDULE_STATUS_CHANGE', `Status do turno #${id} alterado para ${status}.`, req);
    return res.json({ success: true, message: 'Status do turno atualizado com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao alterar status do turno:', error);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: error.message });
  }
});

export default router;

