import type { AuditLogRecord } from "./audit.types.js";

export interface PublicAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function toPublicAuditLog(record: AuditLogRecord): PublicAuditLog {
  return {
    id: record.id,
    action: record.action,
    entityType: record.entityType,
    entityId: record.entityId,
    actorUserId: record.actorUserId,
    metadata: record.metadata,
    createdAt: record.createdAt.toISOString(),
  };
}
