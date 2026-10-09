import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  transaction<T>(fn: (db: IDatabase) => Promise<T>): Promise<T>;
  dump(): Promise<Record<string, any[]>>;
  restore(tables: Record<string, any[]>): Promise<void>;
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

  async transaction<T>(fn: (db: IDatabase) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const transactionalDb: IDatabase = {
        query: async (sql, params) => {
          const res = await client.query(sql, params);
          return res.rows as any;
        },
        execute: async (sql, params) => {
          await client.query(sql, params);
        },
        transaction: async (nestedFn) => nestedFn(transactionalDb),
        dump: async () => this.dump(),
        restore: async (tables) => this.restore(tables),
        close: async () => {},
        isPostgres: () => true
      };
      const result = await fn(transactionalDb);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async dump(): Promise<Record<string, any[]>> {
    const tableNames = [
      'species',
      'scientific_references',
      'species_datasets',
      'dataset_versions',
      'species_models',
      'model_versions',
      'tree_observations',
      'predictions',
      'prediction_uncertainties',
      'prediction_evidences',
      'prediction_explanations',
      'users',
      'governance_audit_logs'
    ];
    const dumpData: Record<string, any[]> = {};
    for (const t of tableNames) {
      try {
        const rows = await this.query(`SELECT * FROM ${t}`);
        dumpData[t] = rows;
      } catch {
        dumpData[t] = [];
      }
    }
    return dumpData;
  }

  async restore(tables: Record<string, any[]>): Promise<void> {
    for (const [tableName, rows] of Object.entries(tables)) {
      if (rows && rows.length > 0) {
        for (const row of rows) {
          const keys = Object.keys(row);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const values = keys.map(k => row[k]);
          await this.execute(
            `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
            values
          );
        }
      }
    }
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
    knowledge_ingestion_audit: [],
    users: [],
    governance_audit_logs: []
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
    } catch {
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

  async transaction<T>(fn: (db: IDatabase) => Promise<T>): Promise<T> {
    // Snapshot state before transaction for atomic rollback if needed
    const snapshot = JSON.parse(JSON.stringify(this.tables));
    try {
      const result = await fn(this);
      this.save();
      return result;
    } catch (err) {
      this.tables = snapshot;
      this.save();
      throw err;
    }
  }

  async dump(): Promise<Record<string, any[]>> {
    return JSON.parse(JSON.stringify(this.tables));
  }

  async restore(tables: Record<string, any[]>): Promise<void> {
    this.tables = { ...this.tables, ...JSON.parse(JSON.stringify(tables)) };
    this.save();
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const lower = sql.trim().toLowerCase();

    // SELECT handling
    if (lower.startsWith('select')) {
      const fromMatch = sql.match(/from\s+([a-zA-Z_]+)/i);
      if (!fromMatch) {
        return [{ live: 1, '?column?': 1, '1': 1 }] as T[];
      }
      const tableName = fromMatch[1].toLowerCase();
      let records = [...(this.tables[tableName] || [])];

      // WHERE clause filtering
      const whereMatch = sql.match(/where\s+(.+?)(?:\s+order\s+by|\s+limit|$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1];
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

    // UPDATE handling
    if (lower.startsWith('update')) {
      const match = sql.match(/update\s+([a-zA-Z_]+)\s+set\s+(.+?)(?:\s+where\s+(.+?))?$/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const whereClause = match[3];
        if (this.tables[tableName] && whereClause) {
          const condMatch = whereClause.match(/([a-zA-Z_]+)\s*=\s*\$([0-9]+)/);
          if (condMatch) {
            const whereCol = condMatch[1];
            const paramIdx = parseInt(condMatch[2], 10) - 1;
            const targetVal = params[paramIdx];

            // Parse SET expressions
            const setAssignments = match[2].split(',').map(s => s.trim());
            this.tables[tableName] = this.tables[tableName].map(row => {
              if (row[whereCol] === targetVal) {
                const updated = { ...row };
                for (const assign of setAssignments) {
                  const setMatch = assign.match(/([a-zA-Z_]+)\s*=\s*\$([0-9]+)/);
                  if (setMatch) {
                    const col = setMatch[1];
                    const pIdx = parseInt(setMatch[2], 10) - 1;
                    updated[col] = params[pIdx];
                  }
                }
                return updated;
              }
              return row;
            });
            this.save();
          }
        }
        return [] as T[];
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
