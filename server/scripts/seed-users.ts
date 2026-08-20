import bcrypt from 'bcryptjs';
import { db } from '../../src/db/index.ts';
import { 
  users, companies, memberships, branches, devices, 
  platformAdmins, platformCompanies, platformSubscriptions 
} from '../../src/db/schema.ts';
import { eq } from 'drizzle-orm';

export async function seedInitialData() {
  try {
    const adminEmail = '3eatcru@gmail.com';
    const defaultPass = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPass, salt);
    const nowIso = new Date().toISOString();
    const futureIso = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

    const companyId = 'empresa_principal';
    const branchId = 'empresa_principal_matriz';
    const deviceId = 'empresa_principal_pdv01';
    const adminUserId = 'usr_admin_master';

    // 1. Ensure default company
    const [existingComp] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!existingComp) {
      await db.insert(companies).values({
        id: companyId,
        name: 'VarejoPro Matriz',
        document: '00.000.000/0001-00',
        planTier: 'PRO',
        createdAt: nowIso,
        updatedAt: nowIso,
      }).onConflictDoNothing();
    }

    // 2. Ensure default platform company & subscription
    await db.insert(platformCompanies).values({
      id: companyId,
      name: 'VarejoPro Matriz',
      plan: 'PRO',
      status: 'ACTIVE',
      createdAt: nowIso,
    }).onConflictDoNothing();

    await db.insert(platformSubscriptions).values({
      id: companyId,
      planId: 'PRO',
      status: 'ACTIVE',
      currentPeriodEnd: futureIso,
      cancelAtPeriodEnd: false,
      updatedAt: nowIso,
    }).onConflictDoNothing();

    // 3. Ensure branch & device
    await db.insert(branches).values({
      id: branchId,
      companyId,
      name: 'Loja Principal',
      createdAt: nowIso,
    }).onConflictDoNothing();

    await db.insert(devices).values({
      id: deviceId,
      companyId,
      branchId,
      name: 'Caixa Principal (PDV 01)',
      type: 'PDV',
      status: 'ACTIVE',
      activatedAt: nowIso,
    }).onConflictDoNothing();

    // 4. Ensure master user
    const [existingUser] = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    let masterUid = existingUser ? existingUser.id : adminUserId;

    if (!existingUser) {
      await db.insert(users).values({
        id: masterUid,
        name: 'Administrador VarejoPro',
        email: adminEmail,
        passwordHash,
        createdAt: nowIso,
      }).onConflictDoNothing();
    }

    // 5. Ensure membership
    const [existingMem] = await db.select().from(memberships).where(eq(memberships.userId, masterUid)).limit(1);
    if (!existingMem) {
      await db.insert(memberships).values({
        id: 'mem_admin_master',
        userId: masterUid,
        companyId,
        role: 'OWNER',
        createdAt: nowIso,
      }).onConflictDoNothing();
    }

    // 6. Ensure platform admin entry
    await db.insert(platformAdmins).values({
      id: masterUid,
      grantedAt: nowIso,
    }).onConflictDoNothing();

    console.log('[SEED] Initial database tables and default admin verified successfully in PostgreSQL.');
  } catch (err) {
    console.error('[SEED] Warning during seedInitialData:', err);
  }
}

// Standalone execution support
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('seed-users')) {
  seedInitialData().then(() => process.exit(0)).catch(() => process.exit(1));
}
