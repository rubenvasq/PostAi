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
import { createAuditService } from "../src/modules/audit/audit.service.js";
import type {
  AuditEvent,
  AuditLogRecord,
  AuditRepository,
  ListAuditParams,
  Paginated,
} from "../src/modules/audit/audit.types.js";

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

class InMemoryAuditRepository implements AuditRepository {
  records: (AuditLogRecord & { merchantId: string })[] = [];
  failOnCreate = false;

  async create(event: AuditEvent): Promise<void> {
    if (this.failOnCreate) throw new Error("fallo simulado de escritura");
    this.records.push({
      id: randomUUID(),
      merchantId: event.merchantId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      actorUserId: event.actorUserId,
      metadata: event.metadata ?? null,
      createdAt: new Date(),
    });
  }

  async list(merchantId: string, params: ListAuditParams): Promise<Paginated<AuditLogRecord>> {
    let items = this.records.filter((record) => record.merchantId === merchantId);
    if (params.action) items = items.filter((record) => record.action === params.action);
    const total = items.length;
    const start = (params.page - 1) * params.pageSize;
    return { data: items.slice(start, start + params.pageSize), total };
  }
}

function setup() {
  const repository = new InMemoryAuditRepository();
  const auditService = createAuditService(repository);
  const app = createApp({
    authService: authServiceStub,
    merchantService: createMerchantService(merchantRepoStub),
    auditService,
  });
  return { app, repository, auditService };
}

function authed(req: request.Test) {
  return req.set("Authorization", `Bearer ${ACCESS_TOKEN}`).set("X-Merchant-Id", MERCHANT_ID);
}

async function seed(auditService: ReturnType<typeof setup>["auditService"]) {
  await auditService.record({
    merchantId: MERCHANT_ID,
    actorUserId: user.id,
    action: "sale.created",
    entityType: "Sale",
    entityId: randomUUID(),
    metadata: { total: "19900" },
  });
  await auditService.record({
    merchantId: MERCHANT_ID,
    actorUserId: user.id,
    action: "payment.approved",
    entityType: "Payment",
    entityId: randomUUID(),
    metadata: { methodCode: "CASH" },
  });
}

describe("GET /v1/audit-logs", () => {
  it("lista los eventos registrados del comercio", async () => {
    const { app, auditService } = setup();
    await seed(auditService);

    const res = await authed(request(app).get("/v1/audit-logs"));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 20, total: 2 });
    expect(res.body.data[0]).toMatchObject({
      entityType: expect.any(String),
      action: expect.any(String),
    });
  });

  it("filtra por acción", async () => {
    const { app, auditService } = setup();
    await seed(auditService);

    const res = await authed(request(app).get("/v1/audit-logs?action=payment.approved"));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      action: "payment.approved",
      metadata: { methodCode: "CASH" },
    });
  });

  it("no filtra eventos de otro comercio", async () => {
    const { app, repository } = setup();
    repository.records.push({
      id: randomUUID(),
      merchantId: randomUUID(),
      action: "sale.created",
      entityType: "Sale",
      entityId: randomUUID(),
      actorUserId: null,
      metadata: null,
      createdAt: new Date(),
    });

    const res = await authed(request(app).get("/v1/audit-logs"));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("exige autenticación y contexto de comercio", async () => {
    const { app } = setup();

    const noAuth = await request(app).get("/v1/audit-logs").set("X-Merchant-Id", MERCHANT_ID);
    expect(noAuth.status).toBe(401);

    const noMerchant = await request(app)
      .get("/v1/audit-logs")
      .set("Authorization", `Bearer ${ACCESS_TOKEN}`);
    expect(noMerchant.status).toBe(403);
  });

  it("el registro es best-effort y no propaga errores de escritura", async () => {
    const { auditService, repository } = setup();
    repository.failOnCreate = true;

    await expect(
      auditService.record({
        merchantId: MERCHANT_ID,
        actorUserId: user.id,
        action: "sale.created",
        entityType: "Sale",
        entityId: randomUUID(),
      }),
    ).resolves.toBeUndefined();
  });
});
