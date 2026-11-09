import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AuthService } from "../src/modules/auth/auth.service.js";
import type { MerchantRecord, UserRecord } from "../src/modules/auth/auth.types.js";
import type {
  MerchantContext,
  MerchantRepository,
} from "../src/modules/merchant/merchant.types.js";
import { createMerchantService } from "../src/modules/merchant/merchant.service.js";
import { createReportService } from "../src/modules/report/report.service.js";
import type {
  ApprovedPaymentRow,
  OpenCashSessionRow,
  PaidSaleRow,
  ReportRepository,
} from "../src/modules/report/report.types.js";

const ACCESS_TOKEN = "token-de-prueba";
const MERCHANT_ID = randomUUID();

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

const merchantRepoStub: MerchantRepository = {
  async findMembership(_userId, merchantId): Promise<MerchantContext | null> {
    if (merchantId !== MERCHANT_ID) return null;
    return { merchantId: MERCHANT_ID, membershipStatus: "ACTIVE" };
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

class InMemoryReportRepository implements ReportRepository {
  sales: PaidSaleRow[] = [];
  payments: ApprovedPaymentRow[] = [];
  lowStock = 0;
  openCashSession: OpenCashSessionRow | null = null;

  async getMerchantCurrency(): Promise<string | null> {
    return "COP";
  }
  async listPaidSales(_m: string, from: Date, to: Date): Promise<PaidSaleRow[]> {
    return this.sales.filter((s) => s.occurredAt >= from && s.occurredAt <= to);
  }
  async listApprovedPayments(_m: string, from: Date, to: Date): Promise<ApprovedPaymentRow[]> {
    return this.payments.filter((p) => p.occurredAt >= from && p.occurredAt <= to);
  }
  async countLowStock(): Promise<number> {
    return this.lowStock;
  }
  async findOpenCashSession(): Promise<OpenCashSessionRow | null> {
    return this.openCashSession;
  }
}

function setup(seed?: (repo: InMemoryReportRepository) => void) {
  const repository = new InMemoryReportRepository();
  seed?.(repository);
  const app = createApp({
    authService: authServiceStub,
    merchantService: createMerchantService(merchantRepoStub),
    reportService: createReportService(repository),
  });
  return { app, repository };
}

function authed(req: request.Test) {
  return req.set("Authorization", `Bearer ${ACCESS_TOKEN}`).set("X-Merchant-Id", MERCHANT_ID);
}

const day = (iso: string) => new Date(iso);

describe("GET /v1/dashboard/summary", () => {
  it("agrega ventas, ticket promedio, métodos y stock bajo", async () => {
    const { app } = setup((repo) => {
      repo.sales = [
        { totalMinor: 10000n, refundedMinor: 0n, occurredAt: day("2026-11-05T15:00:00Z") },
        { totalMinor: 20000n, refundedMinor: 0n, occurredAt: day("2026-11-05T16:00:00Z") },
      ];
      repo.payments = [
        { methodCode: "CASH", amountMinor: 10000n, occurredAt: day("2026-11-05T15:00:00Z") },
        { methodCode: "TRANSFER", amountMinor: 20000n, occurredAt: day("2026-11-05T16:00:00Z") },
      ];
      repo.lowStock = 3;
    });

    const res = await authed(
      request(app).get("/v1/dashboard/summary?from=2026-11-01T00:00:00Z&to=2026-11-30T23:59:59Z"),
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      currency: "COP",
      salesCount: 2,
      grossSales: "30000",
      refunds: "0",
      netSales: "30000",
      averageTicket: "15000",
      lowStockCount: 3,
      openCashSession: null,
    });
    expect(res.body.byMethod).toEqual([
      { methodCode: "CASH", count: 1, amount: "10000" },
      { methodCode: "TRANSFER", count: 1, amount: "20000" },
    ]);
  });

  it("devuelve ceros sin ventas", async () => {
    const { app } = setup();
    const res = await authed(request(app).get("/v1/dashboard/summary"));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ salesCount: 0, grossSales: "0", averageTicket: "0" });
  });

  it("incluye la caja abierta cuando existe", async () => {
    const openedAt = day("2026-11-05T13:00:00Z");
    const { app } = setup((repo) => {
      repo.openCashSession = { id: randomUUID(), openedAt, openingAmountMinor: 50000n };
    });

    const res = await authed(request(app).get("/v1/dashboard/summary"));

    expect(res.status).toBe(200);
    expect(res.body.openCashSession).toEqual({
      id: expect.any(String),
      openedAt: openedAt.toISOString(),
      openingAmount: "50000",
    });
  });

  it("rechaza un rango invertido con 400", async () => {
    const { app } = setup();
    const res = await authed(
      request(app).get("/v1/dashboard/summary?from=2026-11-30T00:00:00Z&to=2026-11-01T00:00:00Z"),
    );
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("exige contexto de comercio", async () => {
    const { app } = setup();
    const res = await request(app)
      .get("/v1/dashboard/summary")
      .set("Authorization", `Bearer ${ACCESS_TOKEN}`);
    expect(res.status).toBe(403);
  });
});

describe("GET /v1/reports/sales", () => {
  it("agrupa por día en zona America/Bogota", async () => {
    const { app } = setup((repo) => {
      repo.sales = [
        // 2026-11-05 03:00 UTC = 2026-11-04 22:00 Bogota
        { totalMinor: 5000n, refundedMinor: 0n, occurredAt: day("2026-11-05T03:00:00Z") },
        // 2026-11-05 15:00 UTC = 2026-11-05 10:00 Bogota
        { totalMinor: 7000n, refundedMinor: 0n, occurredAt: day("2026-11-05T15:00:00Z") },
      ];
    });

    const res = await authed(
      request(app).get("/v1/reports/sales?from=2026-11-01T00:00:00Z&to=2026-11-30T23:59:59Z"),
    );

    expect(res.status).toBe(200);
    expect(res.body.groupBy).toBe("day");
    expect(res.body.rows).toEqual([
      { key: "2026-11-04", salesCount: 1, grossSales: "5000", refunds: "0", netSales: "5000" },
      { key: "2026-11-05", salesCount: 1, grossSales: "7000", refunds: "0", netSales: "7000" },
    ]);
  });

  it("agrupa por método de pago", async () => {
    const { app } = setup((repo) => {
      repo.payments = [
        { methodCode: "CASH", amountMinor: 5000n, occurredAt: day("2026-11-05T15:00:00Z") },
        { methodCode: "CASH", amountMinor: 3000n, occurredAt: day("2026-11-05T16:00:00Z") },
        {
          methodCode: "CARD_SIMULATED",
          amountMinor: 9000n,
          occurredAt: day("2026-11-05T17:00:00Z"),
        },
      ];
    });

    const res = await authed(
      request(app).get(
        "/v1/reports/sales?groupBy=payment_method&from=2026-11-01T00:00:00Z&to=2026-11-30T23:59:59Z",
      ),
    );

    expect(res.status).toBe(200);
    expect(res.body.groupBy).toBe("payment_method");
    expect(res.body.rows).toEqual([
      { key: "CARD_SIMULATED", salesCount: 1, grossSales: "9000", refunds: "0", netSales: "9000" },
      { key: "CASH", salesCount: 2, grossSales: "8000", refunds: "0", netSales: "8000" },
    ]);
  });

  it("rechaza un groupBy inválido con 400", async () => {
    const { app } = setup();
    const res = await authed(request(app).get("/v1/reports/sales?groupBy=employee"));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
