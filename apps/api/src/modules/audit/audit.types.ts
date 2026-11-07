export interface AuditEvent {
  merchantId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface ListAuditParams {
  from?: Date;
  to?: Date;
  action?: string;
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface AuditRepository {
  create(event: AuditEvent): Promise<void>;
  list(merchantId: string, params: ListAuditParams): Promise<Paginated<AuditLogRecord>>;
}

/** Función que otros módulos usan para registrar eventos sin acoplarse al repositorio. */
export type AuditRecorder = (event: AuditEvent) => Promise<void>;
