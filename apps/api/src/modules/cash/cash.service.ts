import { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { AuditRecorder } from "../audit/audit.types.js";
import type { MerchantContext } from "../merchant/merchant.types.js";
import {
  CashSessionAlreadyOpenError,
  CashSessionNotFoundError,
  CashSessionNotOpenError,
} from "./cash.errors.js";
import {
  toPublicCashMovement,
  toPublicCashSession,
  toPublicExpense,
  type PublicCashMovement,
  type PublicCashSession,
  type PublicExpense,
} from "./cash.mappers.js";
import type {
  cashCloseSchema,
  cashListQuerySchema,
  cashMovementCreateSchema,
  cashOpenSchema,
  expenseCreateSchema,
  expenseListQuerySchema,
} from "./cash.schemas.js";
import type { CashRepository, PaginationMeta } from "./cash.types.js";

type CashOpenInput = z.infer<typeof cashOpenSchema>;
type CashCloseInput = z.infer<typeof cashCloseSchema>;
type CashMovementCreateInput = z.infer<typeof cashMovementCreateSchema>;
type CashListQuery = z.infer<typeof cashListQuerySchema>;
type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
type ExpenseListQuery = z.infer<typeof expenseListQuerySchema>;

function pagination(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function mapCashError(error: unknown): never {
  if (error instanceof CashSessionAlreadyOpenError) {
    throw new AppError(409, "CONFLICT", error.message);
  }
  if (error instanceof CashSessionNotFoundError) {
    throw new AppError(404, "NOT_FOUND", error.message);
  }
  if (error instanceof CashSessionNotOpenError) {
    throw new AppError(409, "CONFLICT", error.message);
  }
  throw error;
}

export interface CashService {
  getCurrentSession(context: MerchantContext): Promise<PublicCashSession>;
  listSessions(
    context: MerchantContext,
    query: CashListQuery,
  ): Promise<{ data: PublicCashSession[]; meta: PaginationMeta }>;
  openSession(
    context: MerchantContext,
    userId: string,
    input: CashOpenInput,
  ): Promise<PublicCashSession>;
  closeSession(
    context: MerchantContext,
    sessionId: string,
    userId: string,
    input: CashCloseInput,
  ): Promise<PublicCashSession>;
  listMovements(context: MerchantContext, sessionId: string): Promise<PublicCashMovement[]>;
  createMovement(
    context: MerchantContext,
    sessionId: string,
    userId: string,
    input: CashMovementCreateInput,
  ): Promise<PublicCashMovement>;
  listExpenses(
    context: MerchantContext,
    query: ExpenseListQuery,
  ): Promise<{ data: PublicExpense[]; meta: PaginationMeta }>;
  createExpense(
    context: MerchantContext,
    userId: string,
    input: ExpenseCreateInput,
  ): Promise<PublicExpense>;
}

export function createCashService(
  repository: CashRepository,
  recordAudit: AuditRecorder = async () => {},
): CashService {
  async function resolveBranch(merchantId: string): Promise<string> {
    const branch = await repository.findBranch(merchantId);

    if (!branch) {
      throw new AppError(
        422,
        "UNPROCESSABLE_ENTITY",
        "El comercio no tiene una sucursal configurada",
      );
    }

    return branch.id;
  }

  async function loadSession(context: MerchantContext, sessionId: string) {
    const session = await repository.findSession(context.merchantId, sessionId);

    if (!session) {
      throw new AppError(404, "NOT_FOUND", "Sesión de caja no encontrada");
    }

    return session;
  }

  return {
    async getCurrentSession(context) {
      const branchId = await resolveBranch(context.merchantId);
      const session = await repository.findOpenSession(context.merchantId, branchId);

      if (!session) {
        throw new AppError(404, "NOT_FOUND", "No hay una caja abierta");
      }

      return toPublicCashSession(session);
    },

    async listSessions(context, query) {
      const branchId = await resolveBranch(context.merchantId);
      const { data, total } = await repository.listSessions(context.merchantId, branchId, {
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        page: query.page,
        pageSize: query.pageSize,
      });

      return {
        data: data.map(toPublicCashSession),
        meta: pagination(query.page, query.pageSize, total),
      };
    },

    async openSession(context, userId, input) {
      const branchId = await resolveBranch(context.merchantId);
      const existing = await repository.findOpenSession(context.merchantId, branchId);

      if (existing) {
        throw new AppError(409, "CONFLICT", "Ya hay una caja abierta para la sucursal");
      }

      try {
        const session = await repository.openSession({
          merchantId: context.merchantId,
          branchId,
          userId,
          openingAmountMinor: BigInt(input.openingAmount),
          notes: input.notes ?? null,
        });

        await recordAudit({
          merchantId: context.merchantId,
          actorUserId: userId,
          action: "cash.session_opened",
          entityType: "CashSession",
          entityId: session.id,
          metadata: { openingAmount: session.openingAmountMinor.toString() },
        });

        return toPublicCashSession(session);
      } catch (error) {
        mapCashError(error);
      }
    },

    async closeSession(context, sessionId, userId, input) {
      const session = await loadSession(context, sessionId);

      if (session.status !== "OPEN") {
        throw new AppError(409, "CONFLICT", "La sesión de caja ya está cerrada");
      }

      try {
        const closed = await repository.closeSession({
          merchantId: context.merchantId,
          sessionId,
          userId,
          closingAmountMinor: BigInt(input.closingAmount),
          notes: input.notes ?? null,
        });

        await recordAudit({
          merchantId: context.merchantId,
          actorUserId: userId,
          action: "cash.session_closed",
          entityType: "CashSession",
          entityId: closed.id,
          metadata: {
            expectedAmount: closed.expectedAmountMinor?.toString() ?? null,
            closingAmount: closed.closingAmountMinor?.toString() ?? null,
            difference: closed.differenceMinor?.toString() ?? null,
          },
        });

        return toPublicCashSession(closed);
      } catch (error) {
        mapCashError(error);
      }
    },

    async listMovements(context, sessionId) {
      await loadSession(context, sessionId);
      const movements = await repository.listMovements(context.merchantId, sessionId);
      return movements.map(toPublicCashMovement);
    },

    async createMovement(context, sessionId, userId, input) {
      const session = await loadSession(context, sessionId);

      if (session.status !== "OPEN") {
        throw new AppError(409, "CONFLICT", "La sesión de caja ya está cerrada");
      }

      try {
        const movement = await repository.createMovement({
          merchantId: context.merchantId,
          sessionId,
          userId,
          type: input.type,
          direction: input.direction,
          amountMinor: BigInt(input.amount),
          description: input.description ?? null,
        });

        await recordAudit({
          merchantId: context.merchantId,
          actorUserId: userId,
          action: "cash.movement_created",
          entityType: "CashMovement",
          entityId: movement.id,
          metadata: {
            sessionId,
            type: movement.type,
            direction: movement.direction,
            amount: movement.amountMinor.toString(),
          },
        });

        return toPublicCashMovement(movement);
      } catch (error) {
        mapCashError(error);
      }
    },

    async listExpenses(context, query) {
      const branchId = await resolveBranch(context.merchantId);
      const { data, total } = await repository.listExpenses(context.merchantId, branchId, {
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        page: query.page,
        pageSize: query.pageSize,
      });

      return {
        data: data.map(toPublicExpense),
        meta: pagination(query.page, query.pageSize, total),
      };
    },

    async createExpense(context, userId, input) {
      const branchId = await resolveBranch(context.merchantId);
      const currency = (await repository.getMerchantCurrency(context.merchantId)) ?? "COP";

      try {
        const expense = await repository.createExpense({
          merchantId: context.merchantId,
          branchId,
          sessionId: input.sessionId ?? null,
          userId,
          category: input.category,
          amountMinor: BigInt(input.amount),
          currency,
          description: input.description ?? null,
          incurredAt: input.incurredAt ? new Date(input.incurredAt) : new Date(),
        });

        await recordAudit({
          merchantId: context.merchantId,
          actorUserId: userId,
          action: "expense.created",
          entityType: "Expense",
          entityId: expense.id,
          metadata: {
            amount: expense.amountMinor.toString(),
            category: expense.category,
            sessionId: expense.sessionId,
          },
        });

        return toPublicExpense(expense);
      } catch (error) {
        mapCashError(error);
      }
    },
  };
}
