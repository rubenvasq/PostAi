import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AuthService } from "../src/modules/auth/auth.service.js";
import type { MerchantRecord, UserRecord } from "../src/modules/auth/auth.types.js";
import { createMerchantService } from "../src/modules/merchant/merchant.service.js";
import type {
  BranchRecord,
  MerchantContext,
  MerchantRepository,
  UpdateMerchantInput,
} from "../src/modules/merchant/merchant.types.js";

const ACCESS_TOKEN = "token-de-prueba";

const user: UserRecord = {
  id: randomUUID(),
  email: "owner@example.com",
  passwordHash: "x",
  fullName: "Ana Pérez",
  phone: null,
  status: "ACTIVE",
  createdAt: new Date(),
};

// Solo se usa authenticate; el resto del contrato se cubre en auth.test.ts.
const authServiceStub = {
  async authenticate(token: string): Promise<UserRecord> {
    if (token !== ACCESS_TOKEN) {
      throw new Error("token inválido");
    }
    return user;
  },
} as unknown as AuthService;

class InMemoryMerchantRepository implements MerchantRepository {
  readonly merchant: MerchantRecord = {
    id: randomUUID(),
    name: "Tienda PostAi",
    legalName: null,
    taxId: null,
    currency: "COP",
    timezone: "America/Bogota",
    status: "ACTIVE",
    createdAt: new Date(),
  };

  readonly branches: BranchRecord[] = [
    {
      id: randomUUID(),
      code: "MAIN",
      name: "Principal",
      address: null,
      phone: null,
      isActive: true,
    },
  ];

  membershipStatus: MerchantContext["membershipStatus"] = "ACTIVE";
  hasMembership = true;

  async findMembership(_userId: string, merchantId: string): Promise<MerchantContext | null> {
    if (!this.hasMembership || merchantId !== this.merchant.id) {
      return null;
    }
    return {
      merchantId: this.merchant.id,
      membershipStatus: this.membershipStatus,
    };
  }

  async findMerchantById(merchantId: string): Promise<MerchantRecord | null> {
    return merchantId === this.merchant.id ? this.merchant : null;
  }

  async updateMerchant(_merchantId: string, data: UpdateMerchantInput): Promise<MerchantRecord> {
    if (data.name !== undefined) this.merchant.name = data.name;
    if (data.legalName !== undefined) this.merchant.legalName = data.legalName;
    if (data.taxId !== undefined) this.merchant.taxId = data.taxId;
    if (data.timezone !== undefined) this.merchant.timezone = data.timezone;
    return this.merchant;
  }

  async listBranches(merchantId: string): Promise<BranchRecord[]> {
    return merchantId === this.merchant.id ? this.branches : [];
  }
}

function setup() {
  const repository = new InMemoryMerchantRepository();
  const app = createApp({
    authService: authServiceStub,
    merchantService: createMerchantService(repository),
  });
  return { app, repository };
}

function authed(req: request.Test, merchantId: string) {
  return req.set("Authorization", `Bearer ${ACCESS_TOKEN}`).set("X-Merchant-Id", merchantId);
}

describe("GET /v1/merchant", () => {
  let app: ReturnType<typeof setup>["app"];
  let repository: InMemoryMerchantRepository;

  beforeEach(() => {
    ({ app, repository } = setup());
  });

  it("devuelve el comercio del contexto", async () => {
    const response = await authed(request(app).get("/v1/merchant"), repository.merchant.id);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: repository.merchant.id, name: "Tienda PostAi" });
  });

  it("rechaza sin bearer token", async () => {
    const response = await request(app)
      .get("/v1/merchant")
      .set("X-Merchant-Id", repository.merchant.id);

    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rechaza sin cabecera X-Merchant-Id", async () => {
    const response = await request(app)
      .get("/v1/merchant")
      .set("Authorization", `Bearer ${ACCESS_TOKEN}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({ code: "FORBIDDEN" });
  });

  it("rechaza un comercio sin membresía", async () => {
    repository.hasMembership = false;
    const response = await authed(request(app).get("/v1/merchant"), repository.merchant.id);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("PATCH /v1/merchant", () => {
  let app: ReturnType<typeof setup>["app"];
  let repository: InMemoryMerchantRepository;

  beforeEach(() => {
    ({ app, repository } = setup());
  });

  it("actualiza el comercio con una membresía activa", async () => {
    const response = await authed(request(app).patch("/v1/merchant"), repository.merchant.id).send({
      name: "Nuevo Nombre",
      timezone: "America/Lima",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: "Nuevo Nombre", timezone: "America/Lima" });
  });

  it("rechaza modificar con una membresía suspendida", async () => {
    repository.membershipStatus = "SUSPENDED";
    const response = await authed(request(app).patch("/v1/merchant"), repository.merchant.id).send({
      name: "Intento",
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({ code: "FORBIDDEN" });
  });

  it("rechaza un cuerpo vacío", async () => {
    const response = await authed(request(app).patch("/v1/merchant"), repository.merchant.id).send(
      {},
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("GET /v1/branches", () => {
  it("lista las sucursales del comercio", async () => {
    const { app, repository } = setup();
    const response = await authed(request(app).get("/v1/branches"), repository.merchant.id);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ code: "MAIN", isActive: true });
  });
});
