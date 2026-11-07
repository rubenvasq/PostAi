import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AuthService } from "../src/modules/auth/auth.service.js";
import type { MerchantRecord, UserRecord } from "../src/modules/auth/auth.types.js";
import { createCustomerService } from "../src/modules/customer/customer.service.js";
import type {
  CreateCustomerInput,
  CustomerRecord,
  CustomerRepository,
  ListCustomersParams,
  Paginated,
  UpdateCustomerInput,
} from "../src/modules/customer/customer.types.js";
import { createMerchantService } from "../src/modules/merchant/merchant.service.js";
import type {
  MerchantContext,
  MerchantRepository,
} from "../src/modules/merchant/merchant.types.js";

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

type StoredCustomer = CustomerRecord & { merchantId: string };

class InMemoryCustomerRepository implements CustomerRepository {
  customers: StoredCustomer[] = [];

  async listCustomers(
    merchantId: string,
    params: ListCustomersParams,
  ): Promise<Paginated<CustomerRecord>> {
    let items = this.customers.filter((customer) => customer.merchantId === merchantId);

    if (params.search) {
      const query = params.search.toLowerCase();
      items = items.filter((customer) =>
        [customer.name, customer.email, customer.phone, customer.taxId].some((value) =>
          value?.toLowerCase().includes(query),
        ),
      );
    }

    const start = (params.page - 1) * params.pageSize;
    return { data: items.slice(start, start + params.pageSize), total: items.length };
  }

  async findCustomer(merchantId: string, customerId: string): Promise<CustomerRecord | null> {
    return (
      this.customers.find(
        (customer) => customer.id === customerId && customer.merchantId === merchantId,
      ) ?? null
    );
  }

  async createCustomer(merchantId: string, data: CreateCustomerInput): Promise<CustomerRecord> {
    const record: StoredCustomer = { id: randomUUID(), ...data, merchantId, createdAt: new Date() };
    this.customers.push(record);
    return record;
  }

  async updateCustomer(
    merchantId: string,
    customerId: string,
    data: UpdateCustomerInput,
  ): Promise<CustomerRecord | null> {
    const record = this.customers.find(
      (customer) => customer.id === customerId && customer.merchantId === merchantId,
    );

    if (!record) return null;

    if (data.name !== undefined) record.name = data.name;
    if (data.email !== undefined) record.email = data.email;
    if (data.phone !== undefined) record.phone = data.phone;
    if (data.taxId !== undefined) record.taxId = data.taxId;
    if (data.notes !== undefined) record.notes = data.notes;

    return record;
  }
}

function setup() {
  currentMembershipStatus = "ACTIVE";
  const repository = new InMemoryCustomerRepository();
  const app = createApp({
    authService: authServiceStub,
    merchantService: createMerchantService(merchantRepoStub),
    customerService: createCustomerService(repository),
  });

  return { app, repository };
}

function authed(req: request.Test) {
  return req.set("Authorization", `Bearer ${ACCESS_TOKEN}`).set("X-Merchant-Id", MERCHANT_ID);
}

describe("Clientes", () => {
  let app: ReturnType<typeof setup>["app"];
  let repository: InMemoryCustomerRepository;

  beforeEach(() => {
    ({ app, repository } = setup());
  });

  it("crea un cliente con nombre obligatorio y normaliza el correo", async () => {
    const response = await authed(request(app).post("/v1/customers")).send({
      name: "Cliente Uno",
      email: "Cliente@Example.com",
      phone: "3001234567",
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Cliente Uno",
      email: "cliente@example.com",
      phone: "3001234567",
      taxId: null,
      notes: null,
    });
    expect(response.body.createdAt).toBeTruthy();
    expect(response.body.id).toBeTruthy();
  });

  it("exige el nombre y rechaza correos inválidos", async () => {
    const withoutName = await authed(request(app).post("/v1/customers")).send({ email: "a@b.co" });
    expect(withoutName.status).toBe(400);
    expect(withoutName.body.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const badEmail = await authed(request(app).post("/v1/customers")).send({
      name: "Cliente",
      email: "no-es-correo",
    });
    expect(badEmail.status).toBe(400);
    expect(badEmail.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("lista con búsqueda y paginación", async () => {
    await authed(request(app).post("/v1/customers")).send({
      name: "Ana",
      phone: "3001111111",
    });
    await authed(request(app).post("/v1/customers")).send({
      name: "Beto",
      email: "beto@example.com",
    });

    const search = await authed(request(app).get("/v1/customers?search=beto"));
    expect(search.status).toBe(200);
    expect(search.body.data).toHaveLength(1);
    expect(search.body.data[0]).toMatchObject({ name: "Beto" });

    const page = await authed(request(app).get("/v1/customers?pageSize=1&page=2"));
    expect(page.status).toBe(200);
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta).toMatchObject({ page: 2, pageSize: 1, total: 2, totalPages: 2 });
  });

  it("obtiene un cliente y devuelve 404 si no existe", async () => {
    const created = await authed(request(app).post("/v1/customers")).send({ name: "Ana" });
    const found = await authed(request(app).get(`/v1/customers/${created.body.id}`));

    expect(found.status).toBe(200);
    expect(found.body).toMatchObject({ id: created.body.id, name: "Ana" });

    const missing = await authed(request(app).get(`/v1/customers/${randomUUID()}`));
    expect(missing.status).toBe(404);
    expect(missing.body.error).toMatchObject({ code: "NOT_FOUND" });
  });

  it("actualiza campos parciales y limpia opcionales con null", async () => {
    const created = await authed(request(app).post("/v1/customers")).send({
      name: "Ana",
      phone: "3001111111",
      notes: "Cliente frecuente",
    });

    const updated = await authed(request(app).patch(`/v1/customers/${created.body.id}`)).send({
      name: "Ana María",
      phone: null,
      notes: "VIP",
    });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ name: "Ana María", phone: null, notes: "VIP" });
  });

  it("rechaza escritura si la membresía no está activa", async () => {
    currentMembershipStatus = "SUSPENDED";
    const forbidden = await authed(request(app).post("/v1/customers")).send({ name: "Bloqueado" });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error).toMatchObject({ code: "FORBIDDEN" });

    const list = await authed(request(app).get("/v1/customers"));
    expect(list.status).toBe(403);
  });

  it("no expone clientes de otro comercio", async () => {
    repository.customers.push({
      id: randomUUID(),
      merchantId: randomUUID(),
      name: "Ajeno",
      email: null,
      phone: null,
      taxId: null,
      notes: null,
      createdAt: new Date(),
    });

    const response = await authed(request(app).get("/v1/customers"));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
  });
});
