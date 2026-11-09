import { Prisma, type PrismaClient } from "@prisma/client";
import {
  CashSessionAlreadyOpenError,
  CashSessionNotFoundError,
  CashSessionNotOpenError,
} from "./cash.errors.js";
import type {
  CashBranchRecord,
  CashMovementRecord,
  CashMovementTypeValue,
  CashRepository,
  CashSessionRecord,
  CashSessionStatusValue,
  CloseCashSessionInput,
  CreateCashMovementInput,
  CreateExpenseInput,
  ExpenseRecord,
  ListCashSessionsParams,
  ListExpensesParams,
  OpenCashSessionInput,
  Paginated,
} from "./cash.types.js";

const SESSION_SELECT = {
  id: true,
  branchId: true,
  status: true,
  openedByUserId: true,
  openedAt: true,
  openingAmountMinor: true,
  closedByUserId: true,
  closedAt: true,
  closingAmountMinor: true,
  expectedAmountMinor: true,
  differenceMinor: true,
  notes: true,
} as const;

const MOVEMENT_SELECT = {
  id: true,
  sessionId: true,
  type: true,
  direction: true,
  amountMinor: true,
  referenceType: true,
  referenceId: true,
  description: true,
  createdAt: true,
} as const;

const EXPENSE_SELECT = {
  id: true,
  branchId: true,
  sessionId: true,
  category: true,
  amountMinor: true,
  currency: true,
  description: true,
  incurredAt: true,
  createdAt: true,
} as const;

type SessionRow = Prisma.CashSessionGetPayload<{ select: typeof SESSION_SELECT }>;
type MovementRow = Prisma.CashMovementGetPayload<{ select: typeof MOVEMENT_SELECT }>;
type ExpenseRow = Prisma.ExpenseGetPayload<{ select: typeof EXPENSE_SELECT }>;

function toSessionRecord(row: SessionRow): CashSessionRecord {
  return {
    id: row.id,
    branchId: row.branchId,
    status: row.status as CashSessionStatusValue,
    openedByUserId: row.openedByUserId,
    openedAt: row.openedAt,
    openingAmountMinor: row.openingAmountMinor,
    closedByUserId: row.closedByUserId,
    closedAt: row.closedAt,
    closingAmountMinor: row.closingAmountMinor,
    expectedAmountMinor: row.expectedAmountMinor,
    differenceMinor: row.differenceMinor,
    notes: row.notes,
  };
}

function toMovementRecord(row: MovementRow): CashMovementRecord {
  return {
    id: row.id,
    sessionId: row.sessionId,
    type: row.type as CashMovementTypeValue,
    direction: row.direction,
    amountMinor: row.amountMinor,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    description: row.description,
    createdAt: row.createdAt,
  };
}

function toExpenseRecord(row: ExpenseRow): ExpenseRecord {
  return {
    id: row.id,
    branchId: row.branchId,
    sessionId: row.sessionId,
    category: row.category,
    amountMinor: row.amountMinor,
    currency: row.currency,
    description: row.description,
    incurredAt: row.incurredAt,
    createdAt: row.createdAt,
  };
}

function dateRange(from?: Date, to?: Date): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

function isSerializationFailure(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function isOpenSessionConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  // El índice parcial se llama `cash_sessions_branch_open_key`; según la
  // versión de Prisma, `meta.target` puede traer el nombre del índice o la
  // columna. Ninguna otra restricción única usa `branchId`.
  const target = JSON.stringify(error.meta?.target ?? "");
  return target.includes("open") || target.includes("branchId");
}

export class PrismaCashRepository implements CashRepository {
  constructor(private readonly db: PrismaClient) {}

  async findBranch(merchantId: string): Promise<CashBranchRecord | null> {
    const main = await this.db.branch.findFirst({
      where: { merchantId, code: "MAIN" },
      select: { id: true },
    });

    if (main) return main;

    return this.db.branch.findFirst({
      where: { merchantId, isActive: true },
      orderBy: { code: "asc" },
      select: { id: true },
    });
  }

  findOpenSession(merchantId: string, branchId: string): Promise<CashSessionRecord | null> {
    return this.db.cashSession
      .findFirst({
        where: { merchantId, branchId, status: "OPEN" },
        orderBy: { openedAt: "desc" },
        select: SESSION_SELECT,
      })
      .then((row) => (row ? toSessionRecord(row) : null));
  }

  findSession(merchantId: string, sessionId: string): Promise<CashSessionRecord | null> {
    return this.db.cashSession
      .findFirst({ where: { id: sessionId, merchantId }, select: SESSION_SELECT })
      .then((row) => (row ? toSessionRecord(row) : null));
  }

  async listSessions(
    merchantId: string,
    branchId: string,
    params: ListCashSessionsParams,
  ): Promise<Paginated<CashSessionRecord>> {
    const openedAt = dateRange(params.from, params.to);
    const where: Prisma.CashSessionWhereInput = {
      merchantId,
      branchId,
      ...(openedAt ? { openedAt } : {}),
    };

    const [rows, total] = await this.db.$transaction([
      this.db.cashSession.findMany({
        where,
        orderBy: [{ openedAt: "desc" }, { id: "desc" }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: SESSION_SELECT,
      }),
      this.db.cashSession.count({ where }),
    ]);

    return { data: rows.map(toSessionRecord), total };
  }

  async openSession(input: OpenCashSessionInput): Promise<CashSessionRecord> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.db.$transaction(
          async (tx) => {
            const session = await tx.cashSession.create({
              data: {
                merchantId: input.merchantId,
                branchId: input.branchId,
                openedByUserId: input.userId,
                openingAmountMinor: input.openingAmountMinor,
                notes: input.notes,
              },
              select: SESSION_SELECT,
            });

            if (input.openingAmountMinor > 0n) {
              await tx.cashMovement.create({
                data: {
                  merchantId: input.merchantId,
                  branchId: input.branchId,
                  sessionId: session.id,
                  type: "OPENING",
                  direction: "IN",
                  amountMinor: input.openingAmountMinor,
                  createdByUserId: input.userId,
                },
              });
            }

            return toSessionRecord(session);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (isSerializationFailure(error) && attempt < 2) continue;
        if (isOpenSessionConflict(error)) throw new CashSessionAlreadyOpenError();
        throw error;
      }
    }
  }

  async closeSession(input: CloseCashSessionInput): Promise<CashSessionRecord> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.db.$transaction(
          async (tx) => {
            const session = await tx.cashSession.findFirst({
              where: { id: input.sessionId, merchantId: input.merchantId },
              select: SESSION_SELECT,
            });

            if (!session) throw new CashSessionNotFoundError();
            if (session.status !== "OPEN") throw new CashSessionNotOpenError();

            const grouped = await tx.cashMovement.groupBy({
              by: ["direction"],
              where: { sessionId: session.id },
              _sum: { amountMinor: true },
            });

            let inMinor = 0n;
            let outMinor = 0n;

            for (const row of grouped) {
              if (row.direction === "IN") inMinor = row._sum.amountMinor ?? 0n;
              if (row.direction === "OUT") outMinor = row._sum.amountMinor ?? 0n;
            }

            const expectedMinor = inMinor - outMinor;
            const differenceMinor = input.closingAmountMinor - expectedMinor;
            const notes = [session.notes, input.notes ? `Cierre: ${input.notes}` : null]
              .filter(Boolean)
              .join("\n");

            const updated = await tx.cashSession.update({
              where: { id: session.id },
              data: {
                status: "CLOSED",
                closedByUserId: input.userId,
                closedAt: new Date(),
                closingAmountMinor: input.closingAmountMinor,
                expectedAmountMinor: expectedMinor,
                differenceMinor,
                ...(notes ? { notes } : {}),
              },
              select: SESSION_SELECT,
            });

            return toSessionRecord(updated);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (isSerializationFailure(error) && attempt < 2) continue;
        throw error;
      }
    }
  }

  async listMovements(merchantId: string, sessionId: string): Promise<CashMovementRecord[]> {
    const rows = await this.db.cashMovement.findMany({
      where: { merchantId, sessionId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: MOVEMENT_SELECT,
    });

    return rows.map(toMovementRecord);
  }

  async createMovement(input: CreateCashMovementInput): Promise<CashMovementRecord> {
    const session = await this.db.cashSession.findFirst({
      where: { id: input.sessionId, merchantId: input.merchantId },
      select: { id: true, branchId: true, status: true },
    });

    if (!session) throw new CashSessionNotFoundError();
    if (session.status !== "OPEN") throw new CashSessionNotOpenError();

    const movement = await this.db.cashMovement.create({
      data: {
        merchantId: input.merchantId,
        branchId: session.branchId,
        sessionId: session.id,
        type: input.type,
        direction: input.direction,
        amountMinor: input.amountMinor,
        description: input.description,
        createdByUserId: input.userId,
      },
      select: MOVEMENT_SELECT,
    });

    return toMovementRecord(movement);
  }

  async listExpenses(
    merchantId: string,
    branchId: string,
    params: ListExpensesParams,
  ): Promise<Paginated<ExpenseRecord>> {
    const incurredAt = dateRange(params.from, params.to);
    const where: Prisma.ExpenseWhereInput = {
      merchantId,
      branchId,
      ...(incurredAt ? { incurredAt } : {}),
    };

    const [rows, total] = await this.db.$transaction([
      this.db.expense.findMany({
        where,
        orderBy: [{ incurredAt: "desc" }, { id: "desc" }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: EXPENSE_SELECT,
      }),
      this.db.expense.count({ where }),
    ]);

    return { data: rows.map(toExpenseRecord), total };
  }

  async createExpense(input: CreateExpenseInput): Promise<ExpenseRecord> {
    return this.db.$transaction(async (tx) => {
      let session: { id: string; branchId: string; status: string } | null = null;

      if (input.sessionId) {
        session = await tx.cashSession.findFirst({
          where: { id: input.sessionId, merchantId: input.merchantId },
          select: { id: true, branchId: true, status: true },
        });

        if (!session) throw new CashSessionNotFoundError();
        if (session.status !== "OPEN") throw new CashSessionNotOpenError();
      }

      const expense = await tx.expense.create({
        data: {
          merchantId: input.merchantId,
          branchId: session?.branchId ?? input.branchId,
          sessionId: session?.id ?? null,
          category: input.category,
          amountMinor: input.amountMinor,
          currency: input.currency,
          description: input.description,
          incurredAt: input.incurredAt,
          createdByUserId: input.userId,
        },
        select: EXPENSE_SELECT,
      });

      if (session) {
        await tx.cashMovement.create({
          data: {
            merchantId: input.merchantId,
            branchId: session.branchId,
            sessionId: session.id,
            type: "EXPENSE",
            direction: "OUT",
            amountMinor: input.amountMinor,
            referenceType: "EXPENSE",
            referenceId: expense.id,
            description: input.description ?? input.category,
            createdByUserId: input.userId,
          },
        });
      }

      return toExpenseRecord(expense);
    });
  }

  async getMerchantCurrency(merchantId: string): Promise<string | null> {
    const merchant = await this.db.merchant.findUnique({
      where: { id: merchantId },
      select: { currency: true },
    });

    return merchant?.currency ?? null;
  }
}
