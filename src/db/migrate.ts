import { seedInitialData } from '../../server/scripts/seed-users.ts';

export async function runMigrations() {
  try {
    console.log("Ensuring initial relational database seed...");
    await seedInitialData();
    console.log("Database initialized successfully.");
  } catch (e) {
    console.error("Database initialization notice:", e);
  }
}
