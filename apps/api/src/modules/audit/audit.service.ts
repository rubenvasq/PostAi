import { z } from "zod";
import type { MerchantContext } from "../merchant/merchant.types.js";
import { toPublicAuditLog, type PublicAuditLog } from "./audit.mappers.js";
import type { auditListQuerySchema } from "./audit.schemas.js";
import type { AuditEvent, AuditRepository } from "./audit.types.js";

type AuditListQuery = z.infer<typeof auditListQuerySchema>;

function pagination(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export interface AuditService {
  /** Registro best-effort: nunca lanza para no interrumpir la operación principal. */
  record(event: AuditEvent): Promise<void>;
  list(
    context: MerchantContext,
    query: AuditListQuery,
  ): Promise<{ data: PublicAuditLog[]; meta: ReturnType<typeof pagination> }>;
}

export function createAuditService(repository: AuditRepository): AuditService {
  return {
    async record(event) {
      try {
        await repository.create(event);
      } catch (error) {
        console.error("[audit] No se pudo registrar el evento:", event.action, error);
      }
    },

    async list(context, query) {
      const { data, total } = await repository.list(context.merchantId, {
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        action: query.action,
        page: query.page,
        pageSize: query.pageSize,
      });

      return {
        data: data.map(toPublicAuditLog),
        meta: pagination(query.page, query.pageSize, total),
      };
    },
  };
}
