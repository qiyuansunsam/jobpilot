import Database, { Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

const db: DatabaseType = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function migrate() {
  // Create migration tracking table
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, ran_at TEXT DEFAULT (datetime(\'now\')))');

  // tsc does not copy .sql files, so a production build falls back to the source tree
  const candidates = [path.resolve(__dirname, 'migrations'), path.resolve(__dirname, '../../src/db/migrations')];
  const migrationsDir = candidates.find(d => fs.existsSync(d));
  if (!migrationsDir) throw new Error('migrations directory not found');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  let ran = 0;
  for (const file of files) {
    const existing = db.prepare('SELECT name FROM _migrations WHERE name = ?').get(file);
    if (existing) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    ran++;
  }
  console.log(`[db] Migrations: ${ran} new, ${files.length} total`);
}

export default db;
