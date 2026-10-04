import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  close(): Promise<void>;
  isPostgres(): boolean;
}

class PostgresDatabase implements IDatabase {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 3000
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    await this.pool.query(sql, params);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  isPostgres(): boolean {
    return true;
  }
}

// In-memory / file-persisted relational store for seamless local prototype execution
class LocalRelationalDatabase implements IDatabase {
  private storageFile: string;
  private tables: Record<string, any[]> = {
    species: [],
    scientific_references: [],
    species_datasets: [],
    dataset_versions: [],
    species_models: [],
    model_versions: [],
    tree_observations: [],
    predictions: [],
    prediction_uncertainties: [],
    prediction_evidences: [],
    prediction_explanations: [],
    knowledge_topics: [],
    scientific_sources: [],
    scientific_documents: [],
    document_chunks: [],
    scientific_claims: [],
    model_documentations: [],
    dataset_documentations: [],
    knowledge_ingestion_audit: []
  };

  constructor(filePath: string) {
    this.storageFile = filePath;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf-8');
        const parsed = JSON.parse(raw);
        this.tables = { ...this.tables, ...parsed };
      }
    } catch (e) {
      console.warn('[LocalDatabase] Could not read local database file, using clean state.');
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.storageFile, JSON.stringify(this.tables, null, 2), 'utf-8');
    } catch (e) {
      console.error('[LocalDatabase] Error saving local database:', e);
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const lower = sql.trim().toLowerCase();

    // SELECT handling
    if (lower.startsWith('select')) {
      // Find table name
      const fromMatch = sql.match(/from\s+([a-zA-Z_]+)/i);
      if (!fromMatch) return [] as T[];
      const tableName = fromMatch[1].toLowerCase();
      let records = [...(this.tables[tableName] || [])];

      // WHERE clause filtering
      const whereMatch = sql.match(/where\s+(.+?)(?:\s+order\s+by|\s+limit|$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1];
        // Parse conditions: col = $1 AND col2 = $2 etc
        const conditions = whereClause.split(/\s+and\s+/i);
        for (const cond of conditions) {
          const condMatch = cond.trim().match(/([a-zA-Z_]+)\s*=\s*\$([0-9]+)/);
          if (condMatch) {
            const col = condMatch[1];
            const paramIdx = parseInt(condMatch[2], 10) - 1;
            const val = params[paramIdx];
            records = records.filter(r => {
              if (typeof val === 'boolean') {
                return Boolean(r[col]) === val;
              }
              return r[col] === val;
            });
          }
        }
      }

      // ORDER BY handling
      const orderMatch = sql.match(/order\s+by\s+([a-zA-Z_]+)(?:\s+(asc|desc))?/i);
      if (orderMatch) {
        const col = orderMatch[1];
        const dir = (orderMatch[2] || 'asc').toLowerCase();
        records.sort((a, b) => {
          if (a[col] < b[col]) return dir === 'desc' ? 1 : -1;
          if (a[col] > b[col]) return dir === 'desc' ? -1 : 1;
          return 0;
        });
      }

      // LIMIT handling
      const limitMatch = sql.match(/limit\s+([0-9]+)/i);
      if (limitMatch) {
        const lim = parseInt(limitMatch[1], 10);
        records = records.slice(0, lim);
      }

      return records as T[];
    }

    // INSERT handling
    if (lower.startsWith('insert into')) {
      const match = sql.match(/insert\s+into\s+([a-zA-Z_]+)\s*\((.+?)\)/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const cols = match[2].split(',').map(c => c.trim());
        const record: Record<string, any> = {};
        cols.forEach((col, idx) => {
          record[col] = params[idx];
        });
        if (!this.tables[tableName]) {
          this.tables[tableName] = [];
        }
        // check for duplicate id or update
        const existingIdx = this.tables[tableName].findIndex(r => r.id === record.id);
        if (existingIdx >= 0) {
          this.tables[tableName][existingIdx] = record;
        } else {
          this.tables[tableName].push(record);
        }
        this.save();
        return [record] as T[];
      }
    }

    // DELETE handling
    if (lower.startsWith('delete from')) {
      const match = sql.match(/delete\s+from\s+([a-zA-Z_]+)(?:\s+where\s+(.+?))?$/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        if (this.tables[tableName]) {
          if (!match[2]) {
            this.tables[tableName] = [];
          } else {
            const condMatch = match[2].match(/([a-zA-Z_]+)\s*=\s*\$([0-9]+)/);
            if (condMatch) {
              const col = condMatch[1];
              const paramIdx = parseInt(condMatch[2], 10) - 1;
              const val = params[paramIdx];
              this.tables[tableName] = this.tables[tableName].filter(r => r[col] !== val);
            }
          }
          this.save();
        }
        return [] as T[];
      }
    }

    return [] as T[];
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    await this.query(sql, params);
  }

  async close(): Promise<void> {
    this.save();
  }

  isPostgres(): boolean {
    return false;
  }
}

let dbInstance: IDatabase | null = null;

export async function getDatabase(): Promise<IDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (config.database.driver === 'postgres') {
    const pg = new PostgresDatabase(config.database.url);
    const connected = await pg.testConnection();
    if (!connected) {
      console.warn('[Database] PostgreSQL requested but unreachable. Falling back to local store.');
      dbInstance = new LocalRelationalDatabase(config.database.sqlitePath);
      return dbInstance;
    }
    console.log('[Database] Connected to PostgreSQL successfully.');
    dbInstance = pg;
    return dbInstance;
  }

  if (config.database.driver === 'auto') {
    const pg = new PostgresDatabase(config.database.url);
    const reachable = await pg.testConnection();
    if (reachable) {
      console.log('[Database] PostgreSQL detected and connected.');
      dbInstance = pg;
      return dbInstance;
    } else {
      console.log('[Database] PostgreSQL not accessible with current credentials; using persistent local database store.');
      dbInstance = new LocalRelationalDatabase(config.database.sqlitePath);
      return dbInstance;
    }
  }

  dbInstance = new LocalRelationalDatabase(config.database.sqlitePath);
  return dbInstance;
}
