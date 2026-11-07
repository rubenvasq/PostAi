import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AuthService } from "../src/modules/auth/auth.service.js";
import type { MerchantRecord, UserRecord } from "../src/modules/auth/auth.types.js";
import { InsufficientStockError } from "../src/modules/inventory/inventory.errors.js";
import { createInventoryService } from "../src/modules/inventory/inventory.service.js";
import type {
  AdjustInventoryInput,
  InventoryBranchRecord,
  InventoryItemRecord,
  InventoryMovementRecord,
  InventoryProductRecord,
  InventoryRepository,
  ListInventoryParams,
  ListMovementsParams,
  Paginated,
} from "../src/modules/inventory/inventory.types.js";
import { createMerchantService } from "../src/modules/merchant/merchant.service.js";
import type {
  MerchantContext,
  MerchantRepository,
} from "../src/modules/merchant/merchant.types.js";

const ACCESS_TOKEN = "token-de-prueba";
const MERCHANT_ID = randomUUID();
const BRANCH_ID = randomUUID();
const OTHER_MERCHANT_ID = randomUUID();

const COFFEE_ID = randomUUID();
const BAG_ID = randomUUID();
const DELIVERY_ID = randomUUID();
const FOREIGN_PRODUCT_ID = randomUUID();

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

type StoredProduct = InventoryProductRecord & { merchantId: string; updatedAt: Date };
type StoredItem = {
  branchId: string;
  productId: string;
  quantity: string;
  lowStockThreshold: string | null;
  updatedAt: Date;
};
type StoredMovement = InventoryMovementRecord & { merchantId: string };

class InMemoryInventoryRepository implements InventoryRepository {
  products: StoredProduct[] = [];
  items: StoredItem[] = [];
  movements: StoredMovement[] = [];

  async findBranch(merchantId: string): Promise<InventoryBranchRecord | null> {
    return merchantId === MERCHANT_ID ? { id: BRANCH_ID } : null;
  }

  async listInventory(
    merchantId: string,
    branchId: string,
    params: ListInventoryParams,
  ): Promise<Paginated<InventoryItemRecord>> {
    let products = this.products.filter(
      (product) =>
        product.merchantId === merchantId && product.trackInventory && product.type === "PRODUCT",
    );

    if (params.search) {
      const query = params.search.toLowerCase();
      products = products.filter((product) =>
        [product.name, product.sku].some((value) => value?.toLowerCase().includes(query)),
      );
    }

    const records = products.map((product) => {
      const item = this.items.find(
        (candidate) => candidate.branchId === branchId && candidate.productId === product.id,
      );

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: item?.quantity ?? "0",
        lowStockThreshold: item?.lowStockThreshold ?? null,
        updatedAt: item?.updatedAt ?? product.updatedAt,
      };
    });

    const filtered = params.lowStock
      ? records.filter(
          (record) =>
            record.lowStockThreshold !== null &&
            Number(record.quantity) <= Number(record.lowStockThreshold),
        )
      : records;

    const start = (params.page - 1) * params.pageSize;

    return { data: filtered.slice(start, start + params.pageSize), total: filtered.length };
  }

  async findProduct(merchantId: string, productId: string): Promise<InventoryProductRecord | null> {
    const product = this.products.find(
      (candidate) => candidate.merchantId === merchantId && candidate.id === productId,
    );

    if (!product) return null;

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      type: product.type,
      trackInventory: product.trackInventory,
    };
  }

  async adjustInventory(
    merchantId: string,
    branchId: string,
    productId: string,
    input: AdjustInventoryInput,
  ): Promise<InventoryMovementRecord> {
    const delta = Number(input.quantityDelta);
    let item = this.items.find(
      (candidate) => candidate.branchId === branchId && candidate.productId === productId,
    );

    if (!item) {
      if (delta < 0) throw new InsufficientStockError();

      item = {
        branchId,
        productId,
        quantity: "0",
        lowStockThreshold: null,
        updatedAt: new Date(),
      };
      this.items.push(item);
    }

    const previous = Number(item.quantity);
    const next = previous + delta;

    if (next < 0) throw new InsufficientStockError();

    item.quantity = String(next);
    item.updatedAt = new Date();

    const movement: StoredMovement = {
      id: randomUUID(),
      merchantId,
      productId,
      type: "ADJUSTMENT",
      quantityDelta: input.quantityDelta,
      previousQuantity: String(previous),
      newQuantity: String(next),
      referenceType: null,
      referenceId: null,
      reason: input.reason,
      createdByUserId: input.createdByUserId,
      createdAt: new Date(),
    };

    this.movements.push(movement);
    return movement;
  }

  async listMovements(
    merchantId: string,
    params: ListMovementsParams,
  ): Promise<Paginated<InventoryMovementRecord>> {
    let movements = this.movements.filter((movement) => movement.merchantId === merchantId);

    if (params.productId) {
      movements = movements.filter((movement) => movement.productId === params.productId);
    }

    if (params.from) {
      movements = movements.filter((movement) => movement.createdAt >= params.from!);
    }

    if (params.to) {
      movements = movements.filter((movement) => movement.createdAt <= params.to!);
    }

    movements.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    const start = (params.page - 1) * params.pageSize;

    return { data: movements.slice(start, start + params.pageSize), total: movements.length };
  }
}

function seedProducts(repository: InMemoryInventoryRepository) {
  repository.products.push(
    {
      id: COFFEE_ID,
      merchantId: MERCHANT_ID,
      name: "Café",
      sku: "CAF-001",
      type: "PRODUCT",
      trackInventory: true,
      updatedAt: new Date(),
    },
    {
      id: BAG_ID,
      merchantId: MERCHANT_ID,
      name: "Bolsa",
      sku: "BOL-001",
      type: "PRODUCT",
      trackInventory: false,
      updatedAt: new Date(),
    },
    {
      id: DELIVERY_ID,
      merchantId: MERCHANT_ID,
      name: "Domicilio",
      sku: null,
      type: "SERVICE",
      trackInventory: true,
      updatedAt: new Date(),
    },
    {
      id: FOREIGN_PRODUCT_ID,
      merchantId: OTHER_MERCHANT_ID,
      name: "Ajeno",
      sku: "AJ-001",
      type: "PRODUCT",
      trackInventory: true,
      updatedAt: new Date(),
    },
  );
}

function setup() {
  currentMembershipStatus = "ACTIVE";
  const repository = new InMemoryInventoryRepository();
  seedProducts(repository);
  const app = createApp({
    authService: authServiceStub,
    merchantService: createMerchantService(merchantRepoStub),
    inventoryService: createInventoryService(repository),
  });

  return { app, repository };
}

function authed(req: request.Test) {
  return req.set("Authorization", `Bearer ${ACCESS_TOKEN}`).set("X-Merchant-Id", MERCHANT_ID);
}

describe("Inventario", () => {
  let app: ReturnType<typeof setup>["app"];
  let repository: InMemoryInventoryRepository;

  beforeEach(() => {
    ({ app, repository } = setup());
  });

  it("lista solo productos que controlan inventario, con cantidad cero inicial", async () => {
    const response = await authed(request(app).get("/v1/inventory"));

    expect(response.status).toBe(200);
    expect(response.body.meta).toMatchObject({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      productId: COFFEE_ID,
      productName: "Café",
      sku: "CAF-001",
      quantity: 0,
      lowStockThreshold: null,
    });
  });

  it("busca por nombre o SKU y pagina el resultado", async () => {
    const search = await authed(request(app).get("/v1/inventory?search=CAF-001"));
    expect(search.status).toBe(200);
    expect(search.body.data).toHaveLength(1);
    expect(search.body.data[0].productId).toBe(COFFEE_ID);

    const empty = await authed(request(app).get("/v1/inventory?search=inexistente"));
    expect(empty.status).toBe(200);
    expect(empty.body.data).toHaveLength(0);

    const page = await authed(request(app).get("/v1/inventory?pageSize=1&page=2"));
    expect(page.body.meta).toMatchObject({ page: 2, pageSize: 1, total: 1 });
    expect(page.body.data).toHaveLength(0);
  });

  it("filtra productos con stock bajo cuando existe umbral", async () => {
    repository.items.push({
      branchId: BRANCH_ID,
      productId: COFFEE_ID,
      quantity: "2",
      lowStockThreshold: "5",
      updatedAt: new Date(),
    });

    const low = await authed(request(app).get("/v1/inventory?lowStock=true"));
    expect(low.status).toBe(200);
    expect(low.body.data).toHaveLength(1);

    const seeded = repository.items[0];
    if (!seeded) throw new Error("El stock de prueba no se creó");
    seeded.quantity = "8";
    const notLow = await authed(request(app).get("/v1/inventory?lowStock=true"));
    expect(notLow.body.data).toHaveLength(0);

    const all = await authed(request(app).get("/v1/inventory"));
    expect(all.body.data).toHaveLength(1);
  });

  it("registra un ajuste positivo y crea el movimiento", async () => {
    const response = await authed(request(app).post(`/v1/inventory/${COFFEE_ID}/adjustments`)).send(
      { quantityDelta: 5, reason: "Conteo inicial" },
    );

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      productId: COFFEE_ID,
      type: "ADJUSTMENT",
      quantityDelta: 5,
      previousQuantity: 0,
      newQuantity: 5,
      reason: "Conteo inicial",
      createdByUserId: user.id,
    });
    expect(response.body.createdAt).toBeTruthy();

    const inventory = await authed(request(app).get("/v1/inventory"));
    expect(inventory.body.data[0].quantity).toBe(5);
  });

  it("permite ajustes negativos sin dejar stock negativo", async () => {
    await authed(request(app).post(`/v1/inventory/${COFFEE_ID}/adjustments`)).send({
      quantityDelta: 5,
      reason: "Entrada",
    });

    const decrease = await authed(request(app).post(`/v1/inventory/${COFFEE_ID}/adjustments`)).send(
      { quantityDelta: -2.5, reason: "Merma" },
    );

    expect(decrease.status).toBe(201);
    expect(decrease.body).toMatchObject({
      quantityDelta: -2.5,
      previousQuantity: 5,
      newQuantity: 2.5,
    });

    const tooMuch = await authed(request(app).post(`/v1/inventory/${COFFEE_ID}/adjustments`)).send({
      quantityDelta: -10,
      reason: "Merma",
    });

    expect(tooMuch.status).toBe(422);
    expect(tooMuch.body.error).toMatchObject({ code: "UNPROCESSABLE_ENTITY" });
  });

  it("rechaza productos inexistentes, de otro comercio o sin control de inventario", async () => {
    const missing = await authed(
      request(app).post(`/v1/inventory/${randomUUID()}/adjustments`),
    ).send({ quantityDelta: 1, reason: "Conteo" });
    expect(missing.status).toBe(404);

    const foreign = await authed(
      request(app).post(`/v1/inventory/${FOREIGN_PRODUCT_ID}/adjustments`),
    ).send({ quantityDelta: 1, reason: "Conteo" });
    expect(foreign.status).toBe(404);

    const bag = await authed(request(app).post(`/v1/inventory/${BAG_ID}/adjustments`)).send({
      quantityDelta: 1,
      reason: "Conteo",
    });
    expect(bag.status).toBe(422);
    expect(bag.body.error).toMatchObject({ code: "UNPROCESSABLE_ENTITY" });

    const service = await authed(
      request(app).post(`/v1/inventory/${DELIVERY_ID}/adjustments`),
    ).send({ quantityDelta: 1, reason: "Conteo" });
    expect(service.status).toBe(422);
  });

  it("valida cantidad distinta de cero, máximo 3 decimales y motivo obligatorio", async () => {
    const zero = await authed(request(app).post(`/v1/inventory/${COFFEE_ID}/adjustments`)).send({
      quantityDelta: 0,
      reason: "Conteo",
    });
    expect(zero.status).toBe(400);

    const tooPrecise = await authed(
      request(app).post(`/v1/inventory/${COFFEE_ID}/adjustments`),
    ).send({ quantityDelta: 1.2345, reason: "Conteo" });
    expect(tooPrecise.status).toBe(400);

    const noReason = await authed(request(app).post(`/v1/inventory/${COFFEE_ID}/adjustments`)).send(
      { quantityDelta: 1 },
    );
    expect(noReason.status).toBe(400);
  });

  it("rechaza ajustes si la membresía no está activa", async () => {
    currentMembershipStatus = "SUSPENDED";

    const read = await authed(request(app).get("/v1/inventory"));
    expect(read.status).toBe(403);

    const write = await authed(request(app).post(`/v1/inventory/${COFFEE_ID}/adjustments`)).send({
      quantityDelta: 1,
      reason: "Conteo",
    });
    expect(write.status).toBe(403);
    expect(write.body.error).toMatchObject({ code: "FORBIDDEN" });
  });

  it("lista movimientos con filtros por producto, fecha y paginación", async () => {
    await authed(request(app).post(`/v1/inventory/${COFFEE_ID}/adjustments`)).send({
      quantityDelta: 5,
      reason: "Entrada",
    });
    await authed(request(app).post(`/v1/inventory/${COFFEE_ID}/adjustments`)).send({
      quantityDelta: -1,
      reason: "Merma",
    });

    const list = await authed(request(app).get(`/v1/inventory/movements?productId=${COFFEE_ID}`));
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(2);
    expect(list.body.data[0]).toMatchObject({ quantityDelta: -1, reason: "Merma" });
    expect(list.body.data[1]).toMatchObject({ quantityDelta: 5, reason: "Entrada" });

    const firstPage = await authed(
      request(app).get(`/v1/inventory/movements?productId=${COFFEE_ID}&pageSize=1`),
    );
    expect(firstPage.body.data).toHaveLength(1);
    expect(firstPage.body.meta).toMatchObject({ page: 1, pageSize: 1, total: 2, totalPages: 2 });

    const future = encodeURIComponent(new Date(Date.now() + 60_000).toISOString());
    const after = await authed(
      request(app).get(`/v1/inventory/movements?productId=${COFFEE_ID}&from=${future}`),
    );
    expect(after.body.meta.total).toBe(0);

    const past = encodeURIComponent(new Date(Date.now() - 60_000).toISOString());
    const before = await authed(
      request(app).get(`/v1/inventory/movements?productId=${COFFEE_ID}&to=${past}`),
    );
    expect(before.body.meta.total).toBe(0);
  });

  it("no expone inventario ni movimientos de otro comercio", async () => {
    repository.movements.push({
      id: randomUUID(),
      merchantId: OTHER_MERCHANT_ID,
      productId: FOREIGN_PRODUCT_ID,
      type: "ADJUSTMENT",
      quantityDelta: "3",
      previousQuantity: "0",
      newQuantity: "3",
      referenceType: null,
      referenceId: null,
      reason: "Ajeno",
      createdByUserId: null,
      createdAt: new Date(),
    });

    const inventory = await authed(request(app).get("/v1/inventory"));
    expect(inventory.body.data.map((item: { productId: string }) => item.productId)).toEqual([
      COFFEE_ID,
    ]);

    const movements = await authed(request(app).get("/v1/inventory/movements"));
    expect(movements.body.meta.total).toBe(0);
  });
});
