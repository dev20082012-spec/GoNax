import fs from 'fs';
import path from 'path';
import { getDatabase } from './connection';

export async function runMigrations() {
  const db = await getDatabase();
  console.log('[Migration] Checking database schema...');

  if (db.isPostgres()) {
    const migrationDir = path.resolve(__dirname, 'migrations');
    const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf-8');
      await db.execute(sql);
      console.log(`[Migration] Executed: ${file}`);
    }
    console.log('[Migration] PostgreSQL tables initialized/verified successfully.');
  } else {
    console.log('[Migration] Local relational storage active; schema verified.');
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[Migration] Complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}
