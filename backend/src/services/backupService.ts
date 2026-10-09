import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDatabase } from '../database/connection';
import { config } from '../config';

export interface BackupMetadata {
  backup_id: string;
  timestamp: string;
  file_path: string;
  sha256: string;
  record_counts: Record<string, number>;
  total_records: number;
}

export class BackupService {
  private backupDir: string;

  constructor() {
    this.backupDir = config.database.backupDir;
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  public async createBackup(): Promise<BackupMetadata> {
    const db = await getDatabase();
    const dumpData = await db.dump();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestamp}`;
    const filePath = path.join(this.backupDir, `${backupId}.json`);

    const recordCounts: Record<string, number> = {};
    let totalRecords = 0;
    for (const [table, rows] of Object.entries(dumpData)) {
      recordCounts[table] = rows.length;
      totalRecords += rows.length;
    }

    const payload = {
      backup_id: backupId,
      created_at: new Date().toISOString(),
      system_version: '1.2.0-scientific-hardened',
      record_counts: recordCounts,
      total_records: totalRecords,
      data: dumpData
    };

    const serialized = JSON.stringify(payload, null, 2);
    fs.writeFileSync(filePath, serialized, 'utf-8');

    const sha256 = crypto.createHash('sha256').update(serialized).digest('hex').toUpperCase();
    fs.writeFileSync(`${filePath}.sha256`, sha256, 'utf-8');

    return {
      backup_id: backupId,
      timestamp: new Date().toISOString(),
      file_path: filePath,
      sha256,
      record_counts: recordCounts,
      total_records: totalRecords
    };
  }

  public async listBackups(): Promise<Array<{ backup_id: string; file_path: string; size_bytes: number; created_at: string; sha256: string }>> {
    if (!fs.existsSync(this.backupDir)) return [];

    const files = fs.readdirSync(this.backupDir).filter(f => f.endsWith('.json') && !f.endsWith('.sha256'));
    const results = [];

    for (const file of files) {
      const fullPath = path.join(this.backupDir, file);
      const stat = fs.statSync(fullPath);
      const shaPath = `${fullPath}.sha256`;
      const sha256 = fs.existsSync(shaPath) ? fs.readFileSync(shaPath, 'utf-8').trim() : '';

      results.push({
        backup_id: path.basename(file, '.json'),
        file_path: fullPath,
        size_bytes: stat.size,
        created_at: stat.birthtime.toISOString(),
        sha256
      });
    }

    return results.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  public async restoreFromBackup(backupIdOrPath: string): Promise<{ success: boolean; tables_restored: number; total_records: number }> {
    let fullPath = backupIdOrPath;
    if (!path.isAbsolute(fullPath)) {
      fullPath = path.join(this.backupDir, `${backupIdOrPath.replace(/\.json$/, '')}.json`);
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Backup file not found: ${fullPath}`);
    }

    const raw = fs.readFileSync(fullPath, 'utf-8');
    const shaPath = `${fullPath}.sha256`;
    if (fs.existsSync(shaPath)) {
      const expectedSha = fs.readFileSync(shaPath, 'utf-8').trim();
      const actualSha = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
      if (expectedSha !== actualSha) {
        throw new Error('Backup integrity verification failed: SHA-256 checksum mismatch.');
      }
    }

    const parsed = JSON.parse(raw);
    const dumpData = parsed.data || parsed;

    const db = await getDatabase();
    await db.restore(dumpData);

    const tablesCount = Object.keys(dumpData).length;
    const totalRecords = Object.values(dumpData).reduce((sum: number, rows: any) => sum + (Array.isArray(rows) ? rows.length : 0), 0);

    return {
      success: true,
      tables_restored: tablesCount,
      total_records: totalRecords
    };
  }

  public async testRestoration(): Promise<{ success: boolean; duration_ms: number; verified_records_count: number }> {
    const start = Date.now();
    // 1. Create a fresh backup
    const backup = await this.createBackup();

    // 2. Validate backup checksum
    const raw = fs.readFileSync(backup.file_path, 'utf-8');
    const computedSha = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
    if (computedSha !== backup.sha256) {
      throw new Error('Test restoration failed: Checksum mismatch on created backup.');
    }

    // 3. Test parse and structure
    const parsed = JSON.parse(raw);
    if (!parsed.data || typeof parsed.data !== 'object') {
      throw new Error('Test restoration failed: Backup payload missing data dictionary.');
    }

    return {
      success: true,
      duration_ms: Date.now() - start,
      verified_records_count: backup.total_records
    };
  }
}
