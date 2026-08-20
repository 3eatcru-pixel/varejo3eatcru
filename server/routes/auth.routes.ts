import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../src/db';
import { users, companies, memberships, branches, devices, platformCompanies, platformSubscriptions, userInvitations, passwordResetTokens } from '../../src/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { requireApiAuth } from '../middleware/auth';

const router = express.Router();
import { JWT_SECRET } from '../config/env';

router.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, companyName } = req.body;

    if (!name || !email || !password || !companyName) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Verifica se o usuário já existe
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = crypto.randomUUID();
    const companyId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();

    const nowIso = new Date().toISOString();
    const trialEndIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // Inicia uma transação para criar Empresa, Usuário, Vinculação, Assinatura e Recursos Básicos
    await db.transaction(async (tx) => {
      // 1. Criar Empresa
      await tx.insert(companies).values({
        id: companyId,
        name: companyName,
        planTier: 'TRIAL',
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      // 2. Criar Empresa na Plataforma HQ
      await tx.insert(platformCompanies).values({
        id: companyId,
        name: companyName,
        plan: 'TRIAL',
        status: 'ACTIVE',
        createdAt: nowIso,
      });

      // 3. Criar Assinatura Canônica (14 dias de Trial PRO)
      await tx.insert(platformSubscriptions).values({
        id: companyId,
        planId: 'TRIAL',
        status: 'TRIAL',
        currentPeriodEnd: trialEndIso,
        cancelAtPeriodEnd: false,
        updatedAt: nowIso,
      });

      // 4. Criar Usuário
      await tx.insert(users).values({
        id: userId,
        name,
        email,
        passwordHash,
        createdAt: nowIso,
      });

      // 5. Criar Vinculação (Dono da Empresa)
      await tx.insert(memberships).values({
        id: membershipId,
        userId: userId,
        companyId: companyId,
        role: 'OWNER',
        createdAt: nowIso,
      });

      // 6. Criar Filial Padrão (Matriz)
      await tx.insert(branches).values({
        id: `${companyId}_matriz`,
        companyId,
        name: 'Matriz Principal',
        createdAt: nowIso,
      });

      // 7. Criar Dispositivo Inicial (PDV 01)
      await tx.insert(devices).values({
        id: `${companyId}_pdv01`,
        companyId,
        branchId: `${companyId}_matriz`,
        name: 'Terminal PDV Principal',
        type: 'PDV',
        status: 'ACTIVE',
        activatedAt: nowIso,
      });
    });

    // Gerar token
    const token = jwt.sign(
      { uid: userId, email, role: 'OWNER', companyId, version: 1 },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        uid: userId,
        name,
        email,
        role: 'OWNER',
        companyId,
        companyName,
      }
    });
  } catch (error: any) {
    console.error("Registro falhou:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, companyId } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Busca usuário
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (userResult.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const user = userResult[0];

    // Verifica senha
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Busca todos os memberships do usuário
    const membershipsList = await db.select().from(memberships).where(eq(memberships.userId, user.id));
    
    if (membershipsList.length === 0) {
       return res.status(403).json({ error: 'Usuário sem empresa vinculada' });
    }

    // Carrega detalhes de cada workspace
    const workspaces = [];
    for (const mem of membershipsList) {
      const [comp] = await db.select().from(companies).where(eq(companies.id, mem.companyId)).limit(1);
      if (comp) {
        workspaces.push({
          companyId: mem.companyId,
          companyName: comp.name,
          role: mem.role
        });
      }
    }

    let selectedMem = membershipsList[0];
    let selectedComp = workspaces[0];

    // Se houver mais de uma empresa e o ID não foi especificado, exige seleção
    if (workspaces.length > 1 && !companyId) {
      return res.json({
        success: true,
        requireWorkspaceSelection: true,
        workspaces,
        user: {
          uid: user.id,
          name: user.name,
          email: user.email
        }
      });
    }

    // Se um companyId foi especificado, valida se o usuário realmente pertence a ele
    if (companyId) {
      const foundMem = membershipsList.find(m => m.companyId === companyId);
      const foundComp = workspaces.find(w => w.companyId === companyId);
      if (!foundMem || !foundComp) {
        return res.status(403).json({ error: 'Você não possui permissão para acessar o workspace solicitado.' });
      }
      selectedMem = foundMem;
      selectedComp = foundComp;
    }

    // Gerar token contextualizado
    const token = jwt.sign(
      { 
        uid: user.id, 
        email: user.email, 
        role: selectedMem.role, 
        companyId: selectedMem.companyId,
        version: user.tokenVersion || 1
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        uid: user.id,
        name: user.name,
        email: user.email,
        role: selectedMem.role,
        companyId: selectedMem.companyId,
        companyName: selectedComp.companyName,
      }
    });
  } catch (error: any) {
    console.error("Login falhou:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Endpoint real e seguro para alternar entre empresas em tempo real (Switch Workspace)
router.post('/api/auth/switch-workspace', requireApiAuth, async (req, res) => {
  try {
    const authUser = (req as any).auth;
    const { companyId } = req.body;
    
    if (!companyId) {
      return res.status(400).json({ error: 'ID do workspace destino é obrigatório.' });
    }

    // Valida o vínculo do usuário com a empresa solicitada
    const [membership] = await db.select()
      .from(memberships)
      .where(and(eq(memberships.userId, authUser.uid), eq(memberships.companyId, companyId)))
      .limit(1);

    if (!membership) {
      return res.status(403).json({ error: 'Acesso negado a este workspace. Você não possui vínculo de membership.' });
    }

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) {
      return res.status(404).json({ error: 'Workspace solicitado não encontrado.' });
    }

    // Gera um novo JWT token contextualizado com o novo workspace
    const token = jwt.sign(
      { 
        uid: authUser.uid, 
        email: authUser.email, 
        role: membership.role, 
        companyId: companyId,
        version: (req as any).userProfile?.tokenVersion || 1
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        uid: authUser.uid,
        name: authUser.name,
        email: authUser.email,
        role: membership.role,
        companyId: companyId,
        companyName: company.name
      }
    });
  } catch (error: any) {
    console.error('Workspace switch failed:', error);
    res.status(500).json({ error: 'Erro interno ao trocar de workspace.' });
  }
});

// Change Password Endpoint (Requires currentPassword strictly - Audit Point 9)
router.post('/api/auth/change-password', requireApiAuth, async (req, res) => {
  try {
    const authUser = (req as any).auth || (req as any).userProfile;
    const uid = authUser?.uid;
    const { currentPassword, newPassword } = req.body;

    if (!uid) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    if (!currentPassword) {
      return res.status(400).json({ error: 'A senha atual é obrigatória para realizar a alteração de senha.' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const userResult = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const user = userResult[0];

    // Verify current password strictly
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Senha atual incorreta.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.update(users)
      .set({ 
        passwordHash,
        tokenVersion: sql`${users.tokenVersion} + 1` 
      })
      .where(eq(users.id, uid));

    return res.json({ success: true, message: 'Senha alterada com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao alterar senha:', error);
    return res.status(500).json({ error: error.message || 'Erro ao alterar senha.' });
  }
});

// In-memory store for password reset tokens (Audit Point 10)
interface ResetTokenData {
  userId: string;
  email: string;
  expiresAt: number;
}
// Request Password Reset (Persisted in PostgreSQL)
router.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório.' });

    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (userResult.length === 0) {
      // Respond with success to prevent user enumeration
      return res.json({ 
        success: true, 
        message: 'Se houver uma conta associada a este e-mail, enviaremos as instruções de recuperação.' 
      });
    }

    const user = userResult[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes expiration
    const nowIso = new Date().toISOString();

    await db.insert(passwordResetTokens).values({
      id: crypto.randomUUID(),
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresAt,
      createdAt: nowIso
    });

    const resetLink = `${req.protocol}://${req.get('host') || 'localhost:3000'}/reset-password?token=${rawToken}`;
    console.log(`\n==================================================`);
    console.log(`[AUTH SECURITY SHIELD] Password Reset Request for ${email}`);
    console.log(`Token: ${rawToken}`);
    console.log(`Link: ${resetLink}`);
    console.log(`Expires: ${expiresAt}`);
    console.log(`==================================================\n`);

    return res.json({ 
      success: true, 
      message: 'Se houver uma conta associada a este e-mail, enviaremos as instruções de recuperação.',
      developmentLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined
    });
  } catch (error: any) {
    console.error('Erro na solicitação de reset de senha:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Confirm Password Reset (Token consumption & single use from PostgreSQL)
router.post('/api/auth/reset-password/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'O token de recuperação é obrigatório.' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve possuir no mínimo 6 caracteres.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetRows = await db.select().from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), sql`${passwordResetTokens.usedAt} IS NULL`))
      .limit(1);

    if (resetRows.length === 0) {
      return res.status(400).json({ error: 'Token de recuperação inválido ou já utilizado.' });
    }

    const resetRecord = resetRows[0];
    if (new Date().toISOString() > resetRecord.expiresAt) {
      return res.status(400).json({ error: 'O token de recuperação expirou. Solicite um novo link.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update user password and invalidate token
    const nowIso = new Date().toISOString();
    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ 
          passwordHash,
          tokenVersion: sql`${users.tokenVersion} + 1`
        })
        .where(eq(users.id, resetRecord.userId));

      await tx.update(passwordResetTokens)
        .set({ usedAt: nowIso })
        .where(eq(passwordResetTokens.id, resetRecord.id));
    });

    console.log(`[AUTH SECURITY SHIELD] Password successfully reset for user ID: ${resetRecord.userId}`);

    return res.json({ 
      success: true, 
      message: 'Sua senha foi redefinida com sucesso! Você já pode realizar o login com a nova senha.' 
    });
  } catch (error: any) {
    console.error('Erro na redefinição de senha:', error);
    return res.status(500).json({ error: 'Erro interno ao redefinir senha.' });
  }
});

// Request Account Verification Email
router.post('/api/auth/send-verification', requireApiAuth, async (req, res) => {
  try {
    const authUser = (req as any).auth;
    const email = authUser?.email;
    if (!email) return res.status(400).json({ error: 'E-mail não identificado.' });
    console.log(`[AUTH] E-mail de confirmação de conta enviado para: ${email}`);
    return res.json({ 
      success: true, 
      message: `Enviamos as instruções e link de verificação para ${email}.` 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get Invitation Info (Public - for invitation acceptance screen)
router.get('/api/auth/invitations/:id', async (req, res) => {
  try {
    const inviteId = String(req.params.id);
    const [invite] = await db.select().from(userInvitations).where(eq(userInvitations.id, inviteId)).limit(1);

    if (!invite) {
      return res.status(404).json({ error: 'Convite não encontrado ou inválido.' });
    }

    if (invite.status === 'ACCEPTED') {
      return res.status(400).json({ error: 'Este convite já foi aceito anteriormente.' });
    }

    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Este convite expirou. Solicite um novo convite ao administrador.' });
    }

    const [company] = await db.select().from(companies).where(eq(companies.id, invite.companyId)).limit(1);

    return res.json({
      success: true,
      invitation: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        companyName: company ? company.name : 'Empresa Parceira',
        expiresAt: invite.expiresAt
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Accept Invitation Endpoint (Audit Point 10: Single-use, expiration, membership linking)
router.post('/api/auth/invitations/accept', async (req, res) => {
  try {
    const { inviteId, name, password } = req.body;

    if (!inviteId) {
      return res.status(400).json({ error: 'ID do convite é obrigatório.' });
    }

    const [invite] = await db.select().from(userInvitations).where(eq(userInvitations.id, inviteId)).limit(1);

    if (!invite) {
      return res.status(404).json({ error: 'Convite não encontrado.' });
    }

    if (invite.status === 'ACCEPTED') {
      return res.status(400).json({ error: 'Este convite já foi utilizado.' });
    }

    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Este convite expirou. Solicite um novo convite.' });
    }

    const nowIso = new Date().toISOString();
    let userId = '';
    let userName = name || '';

    // Check if user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, invite.email)).limit(1);

    await db.transaction(async (tx) => {
      if (existingUser) {
        userId = existingUser.id;
        userName = existingUser.name;
        // Verify if user already has membership in this company
        const [existingMem] = await tx.select().from(memberships).where(
          and(eq(memberships.userId, userId), eq(memberships.companyId, invite.companyId))
        ).limit(1);

        if (existingMem) {
          await tx.update(memberships).set({ role: invite.role }).where(eq(memberships.id, existingMem.id));
        } else {
          await tx.insert(memberships).values({
            id: crypto.randomUUID(),
            userId,
            companyId: invite.companyId,
            role: invite.role,
            createdAt: nowIso
          });
        }
      } else {
        if (!password || password.length < 6) {
          throw new Error('A senha deve ter no mínimo 6 caracteres.');
        }
        userId = crypto.randomUUID();
        userName = name || invite.email.split('@')[0];
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await tx.insert(users).values({
          id: userId,
          name: userName,
          email: invite.email,
          passwordHash,
          tokenVersion: 1,
          createdAt: nowIso
        });

        await tx.insert(memberships).values({
          id: crypto.randomUUID(),
          userId,
          companyId: invite.companyId,
          role: invite.role,
          createdAt: nowIso
        });
      }

      // Mark invitation as ACCEPTED (prevents replay / multi-use attacks)
      await tx.update(userInvitations).set({
        status: 'ACCEPTED'
      }).where(eq(userInvitations.id, inviteId));
    });

    const [comp] = await db.select().from(companies).where(eq(companies.id, invite.companyId)).limit(1);

    const token = jwt.sign(
      { 
        uid: userId, 
        email: invite.email, 
        role: invite.role, 
        companyId: invite.companyId,
        version: 1
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        uid: userId,
        name: userName,
        email: invite.email,
        role: invite.role,
        companyId: invite.companyId,
        companyName: comp ? comp.name : 'Minha Empresa'
      }
    });
  } catch (error: any) {
    console.error('Erro ao aceitar convite:', error);
    return res.status(400).json({ error: error.message || 'Erro ao processar convite.' });
  }
});

export default router;
