import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AuthService } from "../src/modules/auth/auth.service.js";
import type { MerchantRecord, UserRecord } from "../src/modules/auth/auth.types.js";
import {
  CashSessionAlreadyOpenError,
  CashSessionNotFoundError,
  CashSessionNotOpenError,
} from "../src/modules/cash/cash.errors.js";
import { createCashService } from "../src/modules/cash/cash.service.js";
import type {
  CashBranchRecord,
  CashMovementRecord,
  CashRepository,
  CashSessionRecord,
  CloseCashSessionInput,
  CreateCashMovementInput,
  CreateExpenseInput,
  ExpenseRecord,
  ListCashSessionsParams,
  ListExpensesParams,
  OpenCashSessionInput,
  Paginated,
} from "../src/modules/cash/cash.types.js";
import { createMerchantService } from "../src/modules/merchant/merchant.service.js";
import type {
  MerchantContext,
  MerchantRepository,
} from "../src/modules/merchant/merchant.types.js";

const ACCESS_TOKEN = "token-de-prueba";
const MERCHANT_ID = randomUUID();
const BRANCH_ID = randomUUID();

const user: UserRecord = {
  id: randomUUID(),
  email: "owner@example.com",
  passwordHash: "x",
  fullName: "Ana Pérez",
  phone: null,
  status: "ACTIVE",
  createdAt: new Date(),
};

const authServiceStub = {
  async authenticate(token: string): Promise<UserRecord> {
    if (token !== ACCESS_TOKEN) throw new Error("token inválido");
    return user;
  },
} as unknown as AuthService;

let currentMembershipStatus: MerchantContext["membershipStatus"] = "ACTIVE";

const merchantRepoStub: MerchantRepository = {
  async findMembership(_userId, merchantId): Promise<MerchantContext | null> {
    if (merchantId !== MERCHANT_ID) return null;
    return { merchantId: MERCHANT_ID, membershipStatus: currentMembershipStatus };
  },
  async findMerchantById(): Promise<MerchantRecord | null> {
    return null;
  },
  async updateMerchant(): Promise<MerchantRecord> {
    throw new Error("no usado");
  },
  async listBranches() {
    return [];
  },
};

type StoredMovement = CashMovementRecord & { merchantId: string };
type StoredExpense = ExpenseRecord & { merchantId: string };

class InMemoryCashRepository implements CashRepository {
  sessions: CashSessionRecord[] = [];
  movements: StoredMovement[] = [];
  expenses: StoredExpense[] = [];

  async findBranch(merchantId: string): Promise<CashBranchRecord | null> {
    return merchantId === MERCHANT_ID ? { id: BRANCH_ID } : null;
  }

  async findOpenSession(merchantId: string, branchId: string): Promise<CashSessionRecord | null> {
    return (
      this.sessions.find(
        (session) =>
          session.branchId === branchId &&
          session.status === "OPEN" &&
          this.sessionMerchant(session.id) === merchantId,
      ) ?? null
    );
  }

  async findSession(merchantId: string, sessionId: string): Promise<CashSessionRecord | null> {
    const session = this.sessions.find((candidate) => candidate.id === sessionId);
    if (!session || this.sessionMerchant(sessionId) !== merchantId) return null;
    return session;
  }

  async listSessions(
    merchantId: string,
    branchId: string,
    params: ListCashSessionsParams,
  ): Promise<Paginated<CashSessionRecord>> {
    let sessions = this.sessions.filter(
      (session) => session.branchId === branchId && this.sessionMerchant(session.id) === merchantId,
    );

    if (params.from) sessions = sessions.filter((session) => session.openedAt >= params.from!);
    if (params.to) sessions = sessions.filter((session) => session.openedAt <= params.to!);

    sessions = sessions.sort((left, right) => right.openedAt.getTime() - left.openedAt.getTime());
    const start = (params.page - 1) * params.pageSize;

    return { data: sessions.slice(start, start + params.pageSize), total: sessions.length };
  }

  async openSession(input: OpenCashSessionInput): Promise<CashSessionRecord> {
    const existing = await this.findOpenSession(input.merchantId, input.branchId);
    if (existing) throw new CashSessionAlreadyOpenError();

    const session: CashSessionRecord = {
      id: randomUUID(),
      branchId: input.branchId,
      status: "OPEN",
      openedByUserId: input.userId,
      openedAt: new Date(),
      openingAmountMinor: input.openingAmountMinor,
      closedByUserId: null,
      closedAt: null,
      closingAmountMinor: null,
      expectedAmountMinor: null,
      differenceMinor: null,
      notes: input.notes,
    };

    this.sessions.push(session);

    if (input.openingAmountMinor > 0n) {
      this.movements.push({
        id: randomUUID(),
        merchantId: input.merchantId,
        sessionId: session.id,
        type: "OPENING",
        direction: "IN",
        amountMinor: input.openingAmountMinor,
        referenceType: null,
        referenceId: null,
        description: null,
        createdAt: new Date(),
      });
    }

    return session;
  }

  async closeSession(input: CloseCashSessionInput): Promise<CashSessionRecord> {
    const session = this.sessions.find((candidate) => candidate.id === input.sessionId);
    if (!session) throw new CashSessionNotFoundError();
    if (session.status !== "OPEN") throw new CashSessionNotOpenError();

    const totals = this.movements
      .filter((movement) => movement.sessionId === session.id)
      .reduce(
        (accumulator, movement) => {
          if (movement.direction === "IN") accumulator.inMinor += movement.amountMinor;
          else accumulator.outMinor += movement.amountMinor;
          return accumulator;
        },
        { inMinor: 0n, outMinor: 0n },
      );

    const expected = totals.inMinor - totals.outMinor;

    session.status = "CLOSED";
    session.closedByUserId = input.userId;
    session.closedAt = new Date();
    session.closingAmountMinor = input.closingAmountMinor;
    session.expectedAmountMinor = expected;
    session.differenceMinor = input.closingAmountMinor - expected;
    session.notes = [session.notes, input.notes ? `Cierre: ${input.notes}` : null]
      .filter(Boolean)
      .join("\n");

    return session;
  }

  async listMovements(merchantId: string, sessionId: string): Promise<CashMovementRecord[]> {
    return this.movements
      .filter((movement) => movement.sessionId === sessionId && movement.merchantId === merchantId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }

  async createMovement(input: CreateCashMovementInput): Promise<CashMovementRecord> {
    const session = this.sessions.find((candidate) => candidate.id === input.sessionId);
    if (!session) throw new CashSessionNotFoundError();
    if (session.status !== "OPEN") throw new CashSessionNotOpenError();

    const movement: StoredMovement = {
      id: randomUUID(),
      merchantId: input.merchantId,
      sessionId: session.id,
      type: input.type,
      direction: input.direction,
      amountMinor: input.amountMinor,
      referenceType: null,
      referenceId: null,
      description: input.description,
      createdAt: new Date(),
    };

    this.movements.push(movement);
    return movement;
  }

  async listExpenses(
    merchantId: string,
    branchId: string,
    params: ListExpensesParams,
  ): Promise<Paginated<ExpenseRecord>> {
    let expenses = this.expenses.filter(
      (expense) => expense.merchantId === merchantId && expense.branchId === branchId,
    );

    if (params.from) expenses = expenses.filter((expense) => expense.incurredAt >= params.from!);
    if (params.to) expenses = expenses.filter((expense) => expense.incurredAt <= params.to!);

    expenses = expenses.sort(
      (left, right) => right.incurredAt.getTime() - left.incurredAt.getTime(),
    );
    const start = (params.page - 1) * params.pageSize;

    return { data: expenses.slice(start, start + params.pageSize), total: expenses.length };
  }

  async createExpense(input: CreateExpenseInput): Promise<ExpenseRecord> {
    let session: CashSessionRecord | null = null;

    if (input.sessionId) {
      session = this.sessions.find((candidate) => candidate.id === input.sessionId) ?? null;
      if (!session) throw new CashSessionNotFoundError();
      if (session.status !== "OPEN") throw new CashSessionNotOpenError();
    }

    const expense: StoredExpense = {
      id: randomUUID(),
      merchantId: input.merchantId,
      branchId: session?.branchId ?? input.branchId,
      sessionId: session?.id ?? null,
      category: input.category,
      amountMinor: input.amountMinor,
      currency: input.currency,
      description: input.description,
      incurredAt: input.incurredAt,
      createdAt: new Date(),
    };

    this.expenses.push(expense);

    if (session) {
      this.movements.push({
        id: randomUUID(),
        merchantId: input.merchantId,
        sessionId: session.id,
        type: "EXPENSE",
        direction: "OUT",
        amountMinor: input.amountMinor,
        referenceType: "EXPENSE",
        referenceId: expense.id,
        description: input.description ?? input.category,
        createdAt: new Date(),
      });
    }

    return expense;
  }

  async getMerchantCurrency(): Promise<string | null> {
    return "COP";
  }

  private sessionMerchant(sessionId: string): string | null {
    const movement = this.movements.find((candidate) => candidate.sessionId === sessionId);
    if (movement) return movement.merchantId;
    if (sessionId === this.sessions[0]?.id) return MERCHANT_ID;
    return MERCHANT_ID;
  }
}

function setup() {
  currentMembershipStatus = "ACTIVE";
  const repository = new InMemoryCashRepository();
  const app = createApp({
    authService: authServiceStub,
    merchantService: createMerchantService(merchantRepoStub),
    cashService: createCashService(repository),
  });

  return { app, repository };
}

function authed(req: request.Test) {
  return req.set("Authorization", `Bearer ${ACCESS_TOKEN}`).set("X-Merchant-Id", MERCHANT_ID);
}

async function openCash(app: ReturnType<typeof setup>["app"], openingAmount = "50000") {
  return authed(request(app).post("/v1/cash/sessions")).send({ openingAmount });
}

describe("Caja", () => {
  let app: ReturnType<typeof setup>["app"];

  beforeEach(() => {
    ({ app } = setup());
  });

  it("abre la caja y registra el movimiento de apertura", async () => {
    const current = await authed(request(app).get("/v1/cash/sessions/current"));
    expect(current.status).toBe(404);

    const opened = await openCash(app);

    expect(opened.status).toBe(201);
    expect(opened.body).toMatchObject({
      branchId: BRANCH_ID,
      status: "OPEN",
      openedByUserId: user.id,
      openingAmount: "50000",
      notes: null,
    });

    const again = await authed(request(app).get("/v1/cash/sessions/current"));
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(opened.body.id);

    const movements = await authed(
      request(app).get(`/v1/cash/sessions/${opened.body.id}/movements`),
    );
    expect(movements.status).toBe(200);
    expect(movements.body.data).toHaveLength(1);
    expect(movements.body.data[0]).toMatchObject({
      type: "OPENING",
      direction: "IN",
      amount: "50000",
    });
  });

  it("rechaza abrir una segunda caja abierta para la sucursal", async () => {
    await openCash(app);
    const duplicate = await openCash(app);

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toMatchObject({ code: "CONFLICT" });
  });

  it("valida el monto de apertura y de cierre", async () => {
    const negative = await openCash(app, "-100");
    expect(negative.status).toBe(400);

    const decimal = await openCash(app, "10.50");
    expect(decimal.status).toBe(400);

    const missing = await authed(request(app).post("/v1/cash/sessions")).send({ notes: "x" });
    expect(missing.status).toBe(400);

    const opened = await openCash(app);
    const badClose = await authed(
      request(app).post(`/v1/cash/sessions/${opened.body.id}/close`),
    ).send({ closingAmount: "10.5" });
    expect(badClose.status).toBe(400);
  });

  it("cierra la caja calculando el esperado y la diferencia", async () => {
    const opened = await openCash(app);

    await authed(request(app).post(`/v1/cash/sessions/${opened.body.id}/movements`)).send({
      type: "DEPOSIT",
      direction: "IN",
      amount: "20000",
      description: "Fondo adicional",
    });
    await authed(request(app).post(`/v1/cash/sessions/${opened.body.id}/movements`)).send({
      type: "WITHDRAWAL",
      direction: "OUT",
      amount: "5000",
      description: "Retiro",
    });

    const closed = await authed(
      request(app).post(`/v1/cash/sessions/${opened.body.id}/close`),
    ).send({ closingAmount: "60000", notes: "Faltó efectivo" });

    expect(closed.status).toBe(200);
    expect(closed.body).toMatchObject({
      status: "CLOSED",
      closingAmount: "60000",
      expectedAmount: "65000",
      difference: "-5000",
      closedByUserId: user.id,
    });
    expect(closed.body.closedAt).toBeTruthy();
    expect(closed.body.notes).toContain("Cierre: Faltó efectivo");

    const duplicateClose = await authed(
      request(app).post(`/v1/cash/sessions/${opened.body.id}/close`),
    ).send({ closingAmount: "65000" });
    expect(duplicateClose.status).toBe(409);

    const movement = await authed(
      request(app).post(`/v1/cash/sessions/${opened.body.id}/movements`),
    ).send({ type: "DEPOSIT", direction: "IN", amount: "1000" });
    expect(movement.status).toBe(409);
  });

  it("rechaza movimientos inválidos y de sesiones inexistentes", async () => {
    const opened = await openCash(app);

    const zero = await authed(
      request(app).post(`/v1/cash/sessions/${opened.body.id}/movements`),
    ).send({ type: "DEPOSIT", direction: "IN", amount: "0" });
    expect(zero.status).toBe(400);

    const unknownType = await authed(
      request(app).post(`/v1/cash/sessions/${opened.body.id}/movements`),
    ).send({ type: "SALE", direction: "IN", amount: "1000" });
    expect(unknownType.status).toBe(400);

    const missing = await authed(
      request(app).post(`/v1/cash/sessions/${randomUUID()}/movements`),
    ).send({ type: "DEPOSIT", direction: "IN", amount: "1000" });
    expect(missing.status).toBe(404);

    const unknownSession = await authed(
      request(app).get(`/v1/cash/sessions/${randomUUID()}/movements`),
    );
    expect(unknownSession.status).toBe(404);
  });

  it("registra gastos con y sin sesión abierta", async () => {
    const withoutSession = await authed(request(app).post("/v1/expenses")).send({
      category: "Transporte",
      amount: "12000",
      description: "Domicilio",
    });

    expect(withoutSession.status).toBe(201);
    expect(withoutSession.body).toMatchObject({
      branchId: BRANCH_ID,
      sessionId: null,
      category: "Transporte",
      amount: "12000",
      currency: "COP",
    });

    const opened = await openCash(app);
    const withSession = await authed(request(app).post("/v1/expenses")).send({
      category: "Insumos",
      amount: "8000",
      sessionId: opened.body.id,
    });

    expect(withSession.status).toBe(201);
    expect(withSession.body.sessionId).toBe(opened.body.id);

    const movements = await authed(
      request(app).get(`/v1/cash/sessions/${opened.body.id}/movements`),
    );
    expect(movements.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "EXPENSE",
          direction: "OUT",
          amount: "8000",
          referenceType: "EXPENSE",
          referenceId: withSession.body.id,
        }),
      ]),
    );

    const closed = await authed(
      request(app).post(`/v1/cash/sessions/${opened.body.id}/close`),
    ).send({ closingAmount: "42000" });
    expect(closed.body.expectedAmount).toBe("42000");
  });

  it("lista gastos con filtros y paginación", async () => {
    await authed(request(app).post("/v1/expenses")).send({
      category: "A",
      amount: "1000",
      incurredAt: "2026-11-05T15:00:00Z",
    });
    await authed(request(app).post("/v1/expenses")).send({
      category: "B",
      amount: "2000",
      incurredAt: "2026-11-06T15:00:00Z",
    });

    const list = await authed(request(app).get("/v1/expenses?pageSize=1"));
    expect(list.status).toBe(200);
    expect(list.body.meta).toMatchObject({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].category).toBe("B");

    const filtered = await authed(
      request(app).get("/v1/expenses?from=2026-11-05T00:00:00Z&to=2026-11-05T23:59:59Z"),
    );
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].category).toBe("A");
  });

  it("lista el historial de cajas con paginación", async () => {
    const first = await openCash(app);
    await authed(request(app).post(`/v1/cash/sessions/${first.body.id}/close`)).send({
      closingAmount: "50000",
    });

    await openCash(app, "10000");

    const list = await authed(request(app).get("/v1/cash/sessions?pageSize=1"));
    expect(list.status).toBe(200);
    expect(list.body.meta).toMatchObject({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
    expect(list.body.data[0].status).toBe("OPEN");
  });

  it("exige contexto de comercio y membresía activa", async () => {
    const noMerchant = await request(app)
      .get("/v1/cash/sessions/current")
      .set("Authorization", `Bearer ${ACCESS_TOKEN}`);
    expect(noMerchant.status).toBe(403);

    currentMembershipStatus = "SUSPENDED";
    const suspended = await authed(request(app).get("/v1/cash/sessions/current"));
    expect(suspended.status).toBe(403);
    expect(suspended.body.error).toMatchObject({ code: "FORBIDDEN" });
  });
});
