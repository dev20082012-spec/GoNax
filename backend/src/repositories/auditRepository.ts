import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';

export interface GovernanceAuditRecord {
  id: string;
  action: string;
  actor_id?: string | null;
  actor_role: string;
  entity_type: string;
  entity_id: string;
  details_json: string;
  ip_address?: string | null;
  created_at: string;
}

export class GovernanceAuditRepository {
  async logAction(
    action: string,
    actorId: string | null | undefined,
    actorRole: string,
    entityType: string,
    entityId: string,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<GovernanceAuditRecord> {
    const db = await getDatabase();
    const record: GovernanceAuditRecord = {
      id: uuidv4(),
      action,
      actor_id: actorId || null,
      actor_role: actorRole,
      entity_type: entityType,
      entity_id: entityId,
      details_json: JSON.stringify(details),
      ip_address: ipAddress || null,
      created_at: new Date().toISOString()
    };

    await db.execute(
      `INSERT INTO governance_audit_logs (id, action, actor_id, actor_role, entity_type, entity_id, details_json, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        record.id,
        record.action,
        record.actor_id,
        record.actor_role,
        record.entity_type,
        record.entity_id,
        record.details_json,
        record.ip_address,
        record.created_at
      ]
    );

    return record;
  }

  async getRecentLogs(limit: number = 50): Promise<GovernanceAuditRecord[]> {
    const db = await getDatabase();
    const rows = await db.query<GovernanceAuditRecord>(
      'SELECT * FROM governance_audit_logs ORDER BY created_at DESC'
    );
    return rows.slice(0, limit);
  }
}
