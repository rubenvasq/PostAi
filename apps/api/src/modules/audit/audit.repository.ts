import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  AuditEvent,
  AuditLogRecord,
  AuditRepository,
  ListAuditParams,
  Paginated,
} from "./audit.types.js";

const AUDIT_SELECT = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  actorUserId: true,
  metadata: true,
  createdAt: true,
} as const;

function toRecord(row: Prisma.AuditLogGetPayload<{ select: typeof AUDIT_SELECT }>): AuditLogRecord {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actorUserId: row.actorUserId,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
  };
}

export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(event: AuditEvent): Promise<void> {
    await this.db.auditLog.create({
      data: {
        merchantId: event.merchantId,
        actorUserId: event.actorUserId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: (event.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async list(merchantId: string, params: ListAuditParams): Promise<Paginated<AuditLogRecord>> {
    const createdAt =
      params.from || params.to
        ? {
            ...(params.from ? { gte: params.from } : {}),
            ...(params.to ? { lte: params.to } : {}),
          }
        : undefined;

    const where: Prisma.AuditLogWhereInput = {
      merchantId,
      ...(params.action ? { action: params.action } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [data, total] = await this.db.$transaction([
      this.db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: AUDIT_SELECT,
      }),
      this.db.auditLog.count({ where }),
    ]);

    return { data: data.map(toRecord), total };
  }
}
