import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AuthService } from "../src/modules/auth/auth.service.js";
import type { MerchantRecord, UserRecord } from "../src/modules/auth/auth.types.js";
import { createCatalogService } from "../src/modules/catalog/catalog.service.js";
import { UniqueConstraintError } from "../src/modules/catalog/catalog.errors.js";
import type {
  CatalogRepository,
  CategoryRecord,
  CreateCategoryInput,
  CreateProductInput,
  CreateTaxRateInput,
  ListProductsParams,
  Paginated,
  ProductRecord,
  TaxRateRecord,
  UpdateCategoryInput,
  UpdateProductInput,
} from "../src/modules/catalog/catalog.types.js";
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

class InMemoryCatalogRepository implements CatalogRepository {
  categories: CategoryRecord[] = [];
  taxRates: TaxRateRecord[] = [];
  products: ProductRecord[] = [];

  async listCategories(_m: string, active?: boolean): Promise<CategoryRecord[]> {
    return this.categories.filter((c) => active === undefined || c.isActive === active);
  }
  async createCategory(_m: string, data: CreateCategoryInput): Promise<CategoryRecord> {
    if (this.categories.some((c) => c.name === data.name)) {
      throw new UniqueConstraintError("name");
    }
    const record: CategoryRecord = {
      id: randomUUID(),
      name: data.name,
      color: data.color ?? null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    };
    this.categories.push(record);
    return record;
  }
  async updateCategory(
    _m: string,
    id: string,
    data: UpdateCategoryInput,
  ): Promise<CategoryRecord | null> {
    const record = this.categories.find((c) => c.id === id);
    if (!record) return null;
    Object.assign(record, data);
    return record;
  }
  async deactivateCategory(_m: string, id: string): Promise<boolean> {
    const record = this.categories.find((c) => c.id === id);
    if (!record) return false;
    record.isActive = false;
    return true;
  }

  async listTaxRates(): Promise<TaxRateRecord[]> {
    return this.taxRates;
  }
  async createTaxRate(_m: string, data: CreateTaxRateInput): Promise<TaxRateRecord> {
    if (data.isDefault) this.taxRates.forEach((t) => (t.isDefault = false));
    const record: TaxRateRecord = {
      id: randomUUID(),
      name: data.name,
      rateBp: data.rateBp,
      isDefault: data.isDefault ?? false,
      isActive: data.isActive ?? true,
    };
    this.taxRates.push(record);
    return record;
  }

  async listProducts(_m: string, params: ListProductsParams): Promise<Paginated<ProductRecord>> {
    let items = this.products;
    if (params.active !== undefined) items = items.filter((p) => p.isActive === params.active);
    if (params.categoryId) items = items.filter((p) => p.categoryId === params.categoryId);
    if (params.search) items = items.filter((p) => p.name.includes(params.search!));
    const start = (params.page - 1) * params.pageSize;
    return { data: items.slice(start, start + params.pageSize), total: items.length };
  }
  async findProduct(_m: string, id: string): Promise<ProductRecord | null> {
    return this.products.find((p) => p.id === id) ?? null;
  }
  async createProduct(_m: string, data: CreateProductInput): Promise<ProductRecord> {
    if (data.sku && this.products.some((p) => p.sku === data.sku)) {
      throw new UniqueConstraintError("sku");
    }
    const now = new Date();
    const record: ProductRecord = {
      id: randomUUID(),
      type: data.type ?? "PRODUCT",
      name: data.name,
      sku: data.sku ?? null,
      barcode: data.barcode ?? null,
      description: data.description ?? null,
      categoryId: data.categoryId ?? null,
      taxRateId: data.taxRateId ?? null,
      priceMinor: data.priceMinor,
      currency: "COP",
      trackInventory: data.trackInventory ?? true,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.products.push(record);
    return record;
  }
  async updateProduct(
    _m: string,
    id: string,
    data: UpdateProductInput,
  ): Promise<ProductRecord | null> {
    const record = this.products.find((p) => p.id === id);
    if (!record) return null;
    Object.assign(record, data);
    return record;
  }
  async deactivateProduct(_m: string, id: string): Promise<boolean> {
    const record = this.products.find((p) => p.id === id);
    if (!record) return false;
    record.isActive = false;
    return true;
  }

  async categoryExists(_m: string, id: string): Promise<boolean> {
    return this.categories.some((c) => c.id === id);
  }
  async taxRateExists(_m: string, id: string): Promise<boolean> {
    return this.taxRates.some((t) => t.id === id);
  }
}

function setup() {
  currentMembershipStatus = "ACTIVE";
  const repository = new InMemoryCatalogRepository();
  const app = createApp({
    authService: authServiceStub,
    merchantService: createMerchantService(merchantRepoStub),
    catalogService: createCatalogService(repository),
  });
  return { app, repository };
}

function authed(req: request.Test) {
  return req.set("Authorization", `Bearer ${ACCESS_TOKEN}`).set("X-Merchant-Id", MERCHANT_ID);
}

describe("Categorías", () => {
  let app: ReturnType<typeof setup>["app"];

  beforeEach(() => {
    ({ app } = setup());
  });

  it("crea y lista categorías", async () => {
    const created = await authed(request(app).post("/v1/categories")).send({ name: "Bebidas" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Bebidas", isActive: true });

    const list = await authed(request(app).get("/v1/categories"));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
  });

  it("rechaza nombre duplicado con 409", async () => {
    await authed(request(app).post("/v1/categories")).send({ name: "Bebidas" });
    const dup = await authed(request(app).post("/v1/categories")).send({ name: "Bebidas" });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatchObject({ code: "CONFLICT" });
  });

  it("rechaza escritura si la membresía no está activa", async () => {
    currentMembershipStatus = "SUSPENDED";
    const res = await authed(request(app).post("/v1/categories")).send({ name: "X" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatchObject({ code: "FORBIDDEN" });
  });

  it("devuelve 404 al desactivar una categoría inexistente", async () => {
    const res = await authed(request(app).delete(`/v1/categories/${randomUUID()}`));
    expect(res.status).toBe(404);
  });
});

describe("Productos", () => {
  let app: ReturnType<typeof setup>["app"];

  beforeEach(() => {
    ({ app } = setup());
  });

  it("crea un producto con precio en pesos enteros", async () => {
    const res = await authed(request(app).post("/v1/products")).send({
      name: "Café",
      price: "10000",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Café", price: "10000", currency: "COP" });
  });

  it("crea servicios sin control de inventario", async () => {
    const res = await authed(request(app).post("/v1/products")).send({
      type: "SERVICE",
      name: "Domicilio",
      price: "5000",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: "SERVICE", trackInventory: false });
  });

  it("rechaza precio con decimales", async () => {
    const res = await authed(request(app).post("/v1/products")).send({
      name: "Café",
      price: "100.50",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rechaza categoría inexistente con 422", async () => {
    const res = await authed(request(app).post("/v1/products")).send({
      name: "Café",
      price: "10000",
      categoryId: randomUUID(),
    });
    expect(res.status).toBe(422);
  });

  it("lista con paginación", async () => {
    await authed(request(app).post("/v1/products")).send({ name: "Café", price: "1000" });
    await authed(request(app).post("/v1/products")).send({ name: "Té", price: "2000" });

    const res = await authed(request(app).get("/v1/products?pageSize=1&page=1"));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
  });

  it("obtiene y devuelve 404 para productos inexistentes", async () => {
    const res = await authed(request(app).get(`/v1/products/${randomUUID()}`));
    expect(res.status).toBe(404);
  });
});

describe("Impuestos", () => {
  it("crea un impuesto y lo marca por defecto", async () => {
    const { app } = setup();
    const res = await authed(request(app).post("/v1/tax-rates")).send({
      name: "IVA 19%",
      rateBp: 1900,
      isDefault: true,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "IVA 19%", rateBp: 1900, isDefault: true });
  });
});
