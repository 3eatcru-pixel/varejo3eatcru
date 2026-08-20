import express, { Request, Response } from 'express';
import { requireApiAuth, requirePermission } from '../middleware/auth';
import { db } from '../../src/db';
import { employees, users, branches } from '../../src/db/schema';
import { eq, and } from 'drizzle-orm';
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

export default router;
