import express, { Request, Response } from 'express';
import { requireApiAuth, requirePermission } from '../middleware/auth';
import { db } from '../../src/db';
import { 
  users, companies, memberships, branches, devices, 
  userSessions, userInvitations, platformAdmins,
  platformCompanies, platformSubscriptions
} from '../../src/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { LicenseService } from '../services/license.service';
import { logAuditEvent } from '../lib/audit';
import { DEFAULT_FEATURE_FLAGS } from '../../src/types/feature_flags';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

const router = express.Router();

// Get Current User Profile & Account Data
router.get(['/api/account/profile', '/api/account/me'], requireApiAuth, async (req: Request, res: Response) => {
  try {
    const auth = (req as any).auth;
    if (!auth || !auth.uid) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    const uid = auth.uid;
    const [userRec] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    if (!userRec) return res.status(404).json({ error: 'Usuário não encontrado' });

    const userMemberships = await db.select().from(memberships).where(eq(memberships.userId, uid));
    const [adminRec] = await db.select().from(platformAdmins).where(eq(platformAdmins.id, uid)).limit(1);

    const activeMemberships = userMemberships.map(m => ({
      id: m.id,
      companyId: m.companyId,
      role: m.role,
      status: 'ACTIVE'
    }));

    const activeCompanyId = auth.companyId || (activeMemberships.length > 0 ? activeMemberships[0].companyId : null);
    let activeRole = 'OWNER';
    if (activeCompanyId) {
      const mem = activeMemberships.find(m => m.companyId === activeCompanyId);
      if (mem) activeRole = mem.role;
    }

    let companyName = 'Minha Loja';
    let companyPlan = 'FREE';
    if (activeCompanyId) {
      const [cRec] = await db.select().from(companies).where(eq(companies.id, activeCompanyId)).limit(1);
      if (cRec) {
        companyName = cRec.name;
        companyPlan = cRec.planTier;
      }
    }

    const accountObj = {
      uid,
      email: userRec.email,
      displayName: userRec.name,
      avatarUrl: userRec.avatarUrl || '',
      status: 'ACTIVE',
      emailVerified: userRec.emailVerified ?? true,
      createdAt: userRec.createdAt,
      updatedAt: userRec.createdAt
    };

    const profileObj = {
      uid,
      fullName: userRec.name,
      preferredName: userRec.name,
      phone: userRec.phone || '',
      avatarUrl: userRec.avatarUrl || '',
      bio: userRec.bio || '',
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      documentNumber: userRec.documentNumber || '',
      updatedAt: userRec.createdAt
    };

    const payload = {
      uid,
      email: userRec.email,
      name: userRec.name,
      phone: userRec.phone || '',
      photoUrl: userRec.avatarUrl || '',
      companyId: activeCompanyId,
      companyName,
      role: activeRole,
      status: 'ACTIVE',
      memberships: activeMemberships,
      isPlatformAdmin: !!adminRec
    };

    return res.json({ 
      success: true, 
      profile: profileObj,
      account: accountObj,
      user: payload,
      isPlatformAdmin: !!adminRec,
      platformRole: adminRec ? 'SUPER_ADMIN' : null
    });
  } catch (error: any) {
    console.error('Error in /api/account/profile:', error);
    return res.status(500).json({ error: 'Erro ao obter perfil de usuário', details: error.message });
  }
});

// Update Profile Details
router.put('/api/account/profile', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const auth = (req as any).auth;
    const uid = auth?.uid;
    const { fullName, preferredName, phone, documentNumber, avatarUrl, bio } = req.body;
    if (!uid) return res.status(401).json({ error: 'Usuário não autenticado' });

    const updateFields: any = {};
    const newName = preferredName || fullName;
    if (newName) updateFields.name = newName;
    if (phone !== undefined) updateFields.phone = phone;
    if (documentNumber !== undefined) updateFields.documentNumber = documentNumber;
    if (avatarUrl !== undefined) updateFields.avatarUrl = avatarUrl;
    if (bio !== undefined) updateFields.bio = bio;

    if (Object.keys(updateFields).length > 0) {
      await db.update(users).set(updateFields).where(eq(users.id, uid));
    }

    // Revoke sessions if name or avatar changed (optional, but good for consistency)
    // For now we just return the updated profile

    const [userRec] = await db.select().from(users).where(eq(users.id, uid)).limit(1);

    const updatedProfile = {
      uid,
      fullName: userRec.name,
      preferredName: userRec.name,
      phone: userRec.phone || '',
      avatarUrl: userRec.avatarUrl || '',
      bio: userRec.bio || '',
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      documentNumber: userRec.documentNumber || '',
      updatedAt: new Date().toISOString()
    };

    return res.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Workspaces List
router.get('/api/account/workspaces', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).auth?.uid;
    if (!uid) return res.status(401).json({ error: 'Usuário não autenticado' });

    const userMembers = await db.select({
      membershipId: memberships.id,
      role: memberships.role,
      companyId: companies.id,
      companyName: companies.name,
      planTier: companies.planTier
    })
    .from(memberships)
    .innerJoin(companies, eq(memberships.companyId, companies.id))
    .where(eq(memberships.userId, uid));

    const workspaces = userMembers.map(m => ({
      id: m.companyId,
      name: m.companyName,
      tradeName: m.companyName,
      planTier: m.planTier,
      status: 'ACTIVE',
      roleInCompany: m.role
    }));

    return res.json({ success: true, workspaces });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Switch Workspace
router.post('/api/account/workspaces/switch', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).auth?.uid;
    const { companyId, branchId, terminalId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId é obrigatório' });

    // Validate membership
    const [mem] = await db.select().from(memberships).where(
      and(eq(memberships.userId, uid), eq(memberships.companyId, companyId))
    ).limit(1);

    if (!mem && !(req as any).auth?.isPlatformAdmin) {
      return res.status(403).json({ error: 'Você não tem acesso a esta empresa.' });
    }

    const [comp] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    const [userRec] = await db.select().from(users).where(eq(users.id, uid)).limit(1);

    const newToken = jwt.sign(
      { 
        uid, 
        email: userRec.email, 
        role: mem ? mem.role : 'OWNER', 
        companyId,
        branchId: branchId || null,
        terminalId: terminalId || null
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ 
      success: true, 
      token: newToken,
      company: comp,
      role: mem ? mem.role : 'OWNER'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Create Workspace
router.post('/api/account/workspaces/create', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).auth?.uid;
    const { name, tradeName, cnpj, branchName } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome da empresa é obrigatório' });

    const companyId = randomUUID();
    const membershipId = randomUUID();
    const nowIso = new Date().toISOString();
    const trialEndIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    await db.transaction(async (tx) => {
      await tx.insert(companies).values({
        id: companyId,
        name: name || tradeName,
        document: cnpj || '',
        planTier: 'TRIAL',
        createdAt: nowIso,
        updatedAt: nowIso
      });

      await tx.insert(platformCompanies).values({
        id: companyId,
        name: name || tradeName,
        plan: 'TRIAL',
        status: 'ACTIVE',
        createdAt: nowIso
      });

      await tx.insert(platformSubscriptions).values({
        id: companyId,
        planId: 'TRIAL',
        status: 'TRIAL',
        currentPeriodEnd: trialEndIso,
        cancelAtPeriodEnd: false,
        updatedAt: nowIso
      });

      await tx.insert(memberships).values({
        id: membershipId,
        userId: uid,
        companyId,
        role: 'OWNER',
        createdAt: nowIso
      });

      await tx.insert(branches).values({
        id: `${companyId}_matriz`,
        companyId,
        name: branchName || 'Matriz Principal',
        createdAt: nowIso
      });

      await tx.insert(devices).values({
        id: `${companyId}_pdv01`,
        companyId,
        branchId: `${companyId}_matriz`,
        name: 'Terminal PDV Principal',
        type: 'PDV',
        status: 'ACTIVE',
        activatedAt: nowIso
      });
    });

    return res.json({ 
      success: true, 
      workspace: {
        id: companyId,
        name: name || tradeName,
        planTier: 'TRIAL',
        status: 'ACTIVE',
        roleInCompany: 'OWNER'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Feature Flags Resolver
router.get('/api/feature-flags/resolve', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const auth = (req as any).auth;
    const companyId = auth?.companyId;
    let planTier = 'FREE';

    if (companyId) {
      const entitlements = await LicenseService.getCompanyEntitlements(companyId);
      planTier = entitlements.planTier;
    }

    return res.json({
      flags: {
        ...DEFAULT_FEATURE_FLAGS,
        fiscalModule: true,
        offlineEngine: true,
        newCheckout: true,
        multiBranch: planTier === 'PRO' || planTier === 'BUSINESS' || planTier === 'ENTERPRISE',
        aiAssistant: planTier === 'BUSINESS' || planTier === 'ENTERPRISE',
        customBranding: planTier === 'BUSINESS' || planTier === 'ENTERPRISE'
      },
      sources: {
        newCheckout: 'GLOBAL',
        offlineEngine: 'GLOBAL',
        fiscalModule: 'GLOBAL',
        aiAssistant: 'PLAN',
        multiBranch: 'PLAN',
        customBranding: 'PLAN'
      },
      companyId: companyId || '',
      planTier
    });
  } catch (error: any) {
    return res.json({
      flags: DEFAULT_FEATURE_FLAGS,
      sources: {},
      companyId: '',
      planTier: 'FREE'
    });
  }
});

// Onboarding Route
router.post('/api/account/onboarding', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).auth?.uid;
    const { companyName, branchName, document } = req.body;
    
    if (!companyName) return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
    
    await db.transaction(async (tx) => {
      const companyId = randomUUID();
      const nowIso = new Date().toISOString();
      const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

      await tx.insert(companies).values({
        id: companyId,
        name: companyName,
        document: document || '',
        logoUrl: null,
        planTier: 'FREE',
        createdAt: nowIso,
        updatedAt: nowIso
      });

      await tx.insert(platformCompanies).values({
        id: companyId,
        name: companyName,
        plan: 'FREE',
        status: 'ACTIVE',
        createdAt: nowIso
      });

      await tx.insert(platformSubscriptions).values({
        id: companyId,
        planId: 'FREE',
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: nowIso
      });
      
      const membershipId = randomUUID();
      await tx.insert(memberships).values({
        id: membershipId,
        userId: uid,
        companyId,
        role: 'OWNER',
        createdAt: nowIso
      });
      
      const branchId = `${companyId}_matriz`;
      await tx.insert(branches).values({
        id: branchId,
        companyId,
        name: branchName || 'Matriz',
        createdAt: nowIso
      });
      
      const deviceId = `${companyId}_pdv01`;
      await tx.insert(devices).values({
        id: deviceId,
        companyId,
        branchId,
        name: 'Caixa Principal',
        type: 'PDV',
        status: 'ACTIVE',
        activatedAt: nowIso
      });
    });
    
    return res.json({ success: true, message: 'Conta configurada com sucesso' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Update Company Details
router.put('/api/account/company', requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const { name, document, logoUrl } = req.body;
    
    if (!companyId) return res.status(400).json({ error: 'Contexto de empresa não encontrado.' });
    
    const updateData: any = { updatedAt: new Date().toISOString() };
    if (name) updateData.name = name;
    if (document !== undefined) updateData.document = document;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    
    await db.update(companies).set(updateData).where(eq(companies.id, companyId));
    
    return res.json({ success: true, message: 'Dados da empresa atualizados.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Sessions API
router.post('/api/account/sessions', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).auth?.uid;
    const { deviceInfo, ipAddress, token } = req.body;
    
    if (!token) return res.status(400).json({ error: 'Token é obrigatório.' });
    
    const sessionId = randomUUID();
    await db.insert(userSessions).values({
      id: sessionId,
      userId: uid,
      token,
      deviceInfo: deviceInfo || 'Unknown Device',
      ipAddress: ipAddress || 'Unknown IP',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    });
    
    return res.json({ success: true, sessionId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/api/account/sessions', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).auth?.uid;
    const s = await db.select().from(userSessions).where(eq(userSessions.userId, uid));
    return res.json({ success: true, sessions: s });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/api/account/sessions/revoke', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).auth?.uid;
    const { sessionId, revokeAllOthers } = req.body;
    if (!uid) return res.status(401).json({ error: 'Usuário não autenticado' });

    if (revokeAllOthers) {
      await db.delete(userSessions).where(eq(userSessions.userId, uid));
    } else if (sessionId) {
      await db.delete(userSessions).where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, uid)));
    }
    return res.json({ success: true, message: 'Sessão revogada com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/api/account/sessions/:id', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const uid = (req as any).auth?.uid;
    const id = String(req.params.id);
    await db.delete(userSessions).where(and(eq(userSessions.id, id), eq(userSessions.userId, uid)));
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Members API (Supports both /api/account/members and /api/company/members)
router.get(['/api/account/members', '/api/company/members'], requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) return res.status(400).json({ error: 'Contexto de empresa não encontrado.' });
    
    const membersList = await db.select({
      id: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      name: users.name,
      email: users.email
    }).from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.companyId, companyId));
      
    const invitesList = await db.select().from(userInvitations).where(eq(userInvitations.companyId, companyId));
    
    return res.json({ 
      success: true, 
      members: membersList.map(m => ({ ...m, status: 'ACTIVE' })),
      invitations: invitesList
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post(['/api/account/members', '/api/account/members/invite', '/api/company/members/invite', '/api/company/members'], requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const auth = (req as any).auth;
    const { email, role, name } = req.body;
    
    if (!companyId || !email) return res.status(400).json({ error: 'E-mail do convidado é obrigatório.' });

    // Validate Role (Point 1)
    const allowedRoles = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'STOCK', 'VIEWER'];
    const finalRole = (role || 'CASHIER').toUpperCase();
    
    if (!allowedRoles.includes(finalRole)) {
      return res.status(400).json({ error: `O cargo "${finalRole}" não é válido.` });
    }

    // Role Hierarchy: Only an OWNER can invite another OWNER or ADMIN
    if ((finalRole === 'OWNER' || finalRole === 'ADMIN') && auth.role !== 'OWNER') {
      return res.status(403).json({ error: 'Somente o proprietário da conta pode convidar Administradores ou outros Proprietários.' });
    }

    // 1. Check feature entitlement
    const featCheck = await LicenseService.checkFeatureEntitlement(companyId, 'employees');
    if (!featCheck.allowed) {
      return res.status(403).json({ error: featCheck.reason, code: 'FEATURE_NOT_AVAILABLE' });
    }

    // 2. Check atomic resource quota
    const quotaCheck = await LicenseService.checkResourceQuota(companyId, 'users', 1);
    if (!quotaCheck.allowed) {
      return res.status(403).json({ error: quotaCheck.reason, code: 'PLAN_LIMIT_REACHED' });
    }
    
    const inviteId = randomUUID();
    await db.insert(userInvitations).values({
      id: inviteId,
      companyId,
      email: email.trim().toLowerCase(),
      role: finalRole,
      invitedBy: auth.uid,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    });
    
    logAuditEvent(companyId, auth.uid, 'MEMBER_INVITED', `Convite gerado para ${email} com cargo ${finalRole}`, req);

    return res.json({ success: true, message: 'Convite criado com sucesso.', inviteId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Update Member Role
router.put(['/api/account/members/:id/role', '/api/company/members/:id/role'], requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const auth = (req as any).auth;
    const id = String(req.params.id);
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Cargo é obrigatório.' });
    }

    const allowedRoles = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'STOCK', 'VIEWER'];
    const newRole = role.toUpperCase();
    if (!allowedRoles.includes(newRole)) {
      return res.status(400).json({ error: `Cargo "${newRole}" inválido.` });
    }

    // Role Hierarchy check
    if ((newRole === 'OWNER' || newRole === 'ADMIN') && auth.role !== 'OWNER') {
      return res.status(403).json({ error: 'Somente o proprietário da conta pode atribuir cargos de Administrador ou Proprietário.' });
    }

    // Verify member exists in this company
    const [targetMember] = await db.select({
      id: memberships.id,
      userId: memberships.userId,
      currentRole: memberships.role,
      email: users.email,
      name: users.name
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(and(eq(memberships.id, id), eq(memberships.companyId, companyId)))
    .limit(1);

    if (!targetMember) {
      return res.status(404).json({ error: 'Membro não encontrado nesta empresa.' });
    }

    // Safety: If demoting an OWNER, ensure at least one other OWNER remains
    if (targetMember.currentRole === 'OWNER' && newRole !== 'OWNER') {
      const otherOwners = await db.select()
        .from(memberships)
        .where(and(eq(memberships.companyId, companyId), eq(memberships.role, 'OWNER')));
      if (otherOwners.length <= 1) {
        return res.status(400).json({ error: 'A empresa precisa manter pelo menos um Proprietário (OWNER) ativo.' });
      }
    }

    await db.update(memberships)
      .set({ role: newRole })
      .where(and(eq(memberships.id, id), eq(memberships.companyId, companyId)));

    logAuditEvent(companyId, auth.uid, 'MEMBER_ROLE_UPDATED', `Cargo de ${targetMember.email} alterado de ${targetMember.currentRole} para ${newRole}`, req);

    return res.json({ success: true, message: `Cargo atualizado para ${newRole} com sucesso.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete(['/api/account/members/:id', '/api/company/members/:id'], requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const auth = (req as any).auth;
    const id = String(req.params.id);
    
    const [targetMember] = await db.select({ 
      id: memberships.id,
      role: memberships.role,
      email: users.email 
    }).from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.id, id), eq(memberships.companyId, companyId)))
      .limit(1);
    
    if (!targetMember) {
      return res.status(404).json({ error: 'Membro não encontrado nesta empresa.' });
    }

    // Safety: Cannot remove the last OWNER
    if (targetMember.role === 'OWNER') {
      const ownerCount = await db.select()
        .from(memberships)
        .where(and(eq(memberships.companyId, companyId), eq(memberships.role, 'OWNER')));
      if (ownerCount.length <= 1) {
        return res.status(400).json({ error: 'Não é possível remover o único proprietário da empresa.' });
      }
    }
    
    await db.delete(memberships).where(and(eq(memberships.id, id), eq(memberships.companyId, companyId)));
    
    logAuditEvent(companyId, auth?.uid || 'system', 'MEMBER_REMOVED', `Usuário ${targetMember.email} removido da empresa.`, req);
    
    return res.json({ success: true, message: 'Membro removido com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete(['/api/account/invitations/:id', '/api/company/invitations/:id'], requireApiAuth, requirePermission('manageUsers'), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    const id = String(req.params.id);
    
    await db.delete(userInvitations).where(and(eq(userInvitations.id, id), eq(userInvitations.companyId, companyId)));
    return res.json({ success: true, message: 'Convite revogado com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/api/account/branches', requireApiAuth, async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).auth?.companyId;
    if (!companyId) return res.status(400).json({ error: 'Contexto de empresa não encontrado.' });
    
    const branchesList = await db.select().from(branches).where(eq(branches.companyId, companyId));
    return res.json({ success: true, branches: branchesList });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
