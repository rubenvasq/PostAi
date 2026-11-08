import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AuthService } from "../src/modules/auth/auth.service.js";
import type { MerchantRecord, UserRecord } from "../src/modules/auth/auth.types.js";
import { createMerchantService } from "../src/modules/merchant/merchant.service.js";
import type {
  MerchantContext,
  MerchantRepository,
} from "../src/modules/merchant/merchant.types.js";
import { createCartService } from "../src/modules/cart/cart.service.js";
import type {
  AddCartItemInput,
  BranchRecord,
  CartItemRecord,
  CartProductRecord,
  CartRecord,
  CartRepository,
  CreateCartInput,
  UpdateCartData,
  CartVariantRecord,
} from "../src/modules/cart/cart.types.js";
import { createSaleService } from "../src/modules/sale/sale.service.js";
import { SaleNotFoundError } from "../src/modules/sale/sale.errors.js";
import type {
  BranchRecord as SaleBranchRecord,
  CreatePaymentInput,
  CreateSaleInput,
  ListSalesParams,
  Paginated,
  PaymentMethodRecord,
  PaymentRecord,
  RefundRecord,
  SaleItemRecord,
  SaleProductRecord,
  SaleRecord,
  SaleRepository,
  SaleVariantRecord,
} from "../src/modules/sale/sale.types.js";

const ACCESS_TOKEN = "token-de-prueba";
const MERCHANT_ID = randomUUID();
const BRANCH_ID = randomUUID();
const CUSTOMER_ID = randomUUID();

const COFFEE_ID = randomUUID();
const TEA_ID = randomUUID();
const INACTIVE_ID = randomUUID();
const FOREIGN_PRODUCT_ID = randomUUID();
const OTHER_MERCHANT_ID = randomUUID();

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

type StoredProduct = CartProductRecord & { merchantId: string };

function seedProducts(): StoredProduct[] {
  return [
    {
      id: COFFEE_ID,
      merchantId: MERCHANT_ID,
      name: "Café",
      sku: "CAF-001",
      priceMinor: 5_000n,
      currency: "COP",
      type: "PRODUCT",
      trackInventory: true,
      isActive: true,
      taxRateBp: 1900,
    },
    {
      id: TEA_ID,
      merchantId: MERCHANT_ID,
      name: "Té",
      sku: "TE-001",
      priceMinor: 8_000n,
      currency: "COP",
      type: "PRODUCT",
      trackInventory: false,
      isActive: true,
      taxRateBp: null,
    },
    {
      id: INACTIVE_ID,
      merchantId: MERCHANT_ID,
      name: "Descontinuado",
      sku: "OLD-001",
      priceMinor: 1_000n,
      currency: "COP",
      type: "PRODUCT",
      trackInventory: false,
      isActive: false,
      taxRateBp: null,
    },
    {
      id: FOREIGN_PRODUCT_ID,
      merchantId: OTHER_MERCHANT_ID,
      name: "Ajeno",
      sku: "AJ-001",
      priceMinor: 9_000n,
      currency: "COP",
      type: "PRODUCT",
      trackInventory: false,
      isActive: true,
      taxRateBp: null,
    },
  ];
}

class InMemoryCartRepository implements CartRepository {
  products: StoredProduct[] = seedProducts();
  customers = new Set<string>([CUSTOMER_ID]);
  carts: CartRecord[] = [];

  async findBranch(merchantId: string): Promise<BranchRecord | null> {
    return merchantId === MERCHANT_ID ? { id: BRANCH_ID } : null;
  }

  async customerExists(_merchantId: string, customerId: string): Promise<boolean> {
    return this.customers.has(customerId);
  }

  async findProduct(merchantId: string, productId: string): Promise<CartProductRecord | null> {
    return this.products.find((p) => p.merchantId === merchantId && p.id === productId) ?? null;
  }

  async findVariant(_productId: string, _variantId: string): Promise<CartVariantRecord | null> {
    return null;
  }

  async createCart(input: CreateCartInput): Promise<CartRecord> {
    const now = new Date();
    const cart: CartRecord = {
      id: randomUUID(),
      merchantId: input.merchantId,
      branchId: input.branchId,
      createdByUserId: input.createdByUserId,
      customerId: input.customerId,
      status: "OPEN",
      currency: "COP",
      discountType: null,
      discountPercentBp: null,
      discountAmountMinor: null,
      notes: input.notes,
      checkoutSaleId: null,
      createdAt: now,
      updatedAt: now,
      items: [],
    };
    this.carts.push(cart);
    return cart;
  }

  async findCart(merchantId: string, cartId: string): Promise<CartRecord | null> {
    return this.carts.find((c) => c.merchantId === merchantId && c.id === cartId) ?? null;
  }

  async updateCart(
    merchantId: string,
    cartId: string,
    data: UpdateCartData,
  ): Promise<CartRecord | null> {
    const cart = await this.findCart(merchantId, cartId);
    if (!cart) return null;
    if (data.customerId !== undefined) cart.customerId = data.customerId;
    if (data.notes !== undefined) cart.notes = data.notes;
    if (data.discountType !== undefined) cart.discountType = data.discountType;
    if (data.discountPercentBp !== undefined) cart.discountPercentBp = data.discountPercentBp;
    if (data.discountAmountMinor !== undefined) cart.discountAmountMinor = data.discountAmountMinor;
    cart.updatedAt = new Date();
    return cart;
  }

  async deleteCart(merchantId: string, cartId: string): Promise<boolean> {
    const index = this.carts.findIndex((c) => c.merchantId === merchantId && c.id === cartId);
    if (index === -1) return false;
    this.carts.splice(index, 1);
    return true;
  }

  async findCartItem(
    cartId: string,
    productId: string,
    variantId: string | null,
  ): Promise<CartItemRecord | null> {
    const cart = this.carts.find((c) => c.id === cartId);
    return cart?.items.find((i) => i.productId === productId && i.variantId === variantId) ?? null;
  }

  async addItem(cartId: string, input: AddCartItemInput): Promise<CartRecord> {
    const cart = this.carts.find((c) => c.id === cartId)!;
    cart.items.push({
      id: randomUUID(),
      productId: input.productId,
      variantId: input.variantId,
      quantity: input.quantity,
      notes: input.notes,
      createdAt: new Date(),
    });
    cart.updatedAt = new Date();
    return cart;
  }

  async updateItem(
    cartId: string,
    itemId: string,
    data: { quantity?: string; notes?: string | null },
  ): Promise<CartRecord | null> {
    const cart = this.carts.find((c) => c.id === cartId);
    const item = cart?.items.find((i) => i.id === itemId);
    if (!cart || !item) return null;
    if (data.quantity !== undefined) item.quantity = data.quantity;
    if (data.notes !== undefined) item.notes = data.notes;
    cart.updatedAt = new Date();
    return cart;
  }

  async removeItem(cartId: string, itemId: string): Promise<CartRecord | null> {
    const cart = this.carts.find((c) => c.id === cartId);
    if (!cart) return null;
    const index = cart.items.findIndex((i) => i.id === itemId);
    if (index === -1) return null;
    cart.items.splice(index, 1);
    cart.updatedAt = new Date();
    return cart;
  }

  async markCheckedOut(
    merchantId: string,
    cartId: string,
    saleId: string,
  ): Promise<CartRecord | null> {
    const cart = await this.findCart(merchantId, cartId);
    if (!cart) return null;
    if (cart.status === "OPEN") {
      cart.status = "CHECKED_OUT";
      cart.checkoutSaleId = saleId;
      cart.updatedAt = new Date();
    }
    return cart;
  }
}

// Repositorio de ventas en memoria reducido para ejercitar el checkout real.
class InMemorySaleRepository implements SaleRepository {
  products: StoredProduct[];
  sales: SaleRecord[] = [];
  methods: PaymentMethodRecord[] = [];

  constructor(products: StoredProduct[]) {
    this.products = products;
  }

  async findBranch(merchantId: string): Promise<SaleBranchRecord | null> {
    return merchantId === MERCHANT_ID ? { id: BRANCH_ID } : null;
  }
  async ensurePaymentMethods(): Promise<void> {}
  async listPaymentMethods(): Promise<PaymentMethodRecord[]> {
    return this.methods;
  }
  async findPaymentMethodByCode(): Promise<PaymentMethodRecord | null> {
    return null;
  }
  async customerExists(_m: string, customerId: string): Promise<boolean> {
    return customerId === CUSTOMER_ID;
  }
  async findProduct(merchantId: string, productId: string): Promise<SaleProductRecord | null> {
    return this.products.find((p) => p.merchantId === merchantId && p.id === productId) ?? null;
  }
  async findVariant(): Promise<SaleVariantRecord | null> {
    return null;
  }
  async findSaleByIdempotencyKey(merchantId: string, key: string): Promise<SaleRecord | null> {
    return this.sales.find((s) => s.merchantId === merchantId && s.idempotencyKey === key) ?? null;
  }
  async createSale(input: CreateSaleInput): Promise<SaleRecord> {
    const existing = await this.findSaleByIdempotencyKey(input.merchantId, input.idempotencyKey);
    if (existing) return existing;
    const items: SaleItemRecord[] = input.items.map((item) => ({
      id: randomUUID(),
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      discountMinor: 0n,
      taxRateBp: item.taxRateBp,
      taxMinor: item.taxMinor,
      lineTotalMinor: item.lineTotalMinor,
    }));
    const sale: SaleRecord = {
      id: randomUUID(),
      merchantId: input.merchantId,
      branchId: input.branchId,
      sellerUserId: input.sellerUserId,
      customerId: input.customerId,
      status: "DRAFT",
      currency: input.currency,
      subtotalMinor: input.subtotalMinor,
      discountMinor: input.discountMinor,
      taxMinor: input.taxMinor,
      totalMinor: input.totalMinor,
      refundedMinor: 0n,
      receiptNumber: null,
      idempotencyKey: input.idempotencyKey,
      notes: input.notes,
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date(),
      items,
      payments: [],
    };
    this.sales.push(sale);
    return sale;
  }
  async listSales(_m: string, _p: ListSalesParams): Promise<Paginated<SaleRecord>> {
    return { data: [], total: 0 };
  }
  async findSale(merchantId: string, saleId: string): Promise<SaleRecord | null> {
    return this.sales.find((s) => s.merchantId === merchantId && s.id === saleId) ?? null;
  }
  async findReceiptContext() {
    return null;
  }
  async cancelSale(): Promise<SaleRecord | null> {
    return null;
  }
  async findPaymentByIdempotencyKey(): Promise<PaymentRecord | null> {
    return null;
  }
  async findPayment(): Promise<PaymentRecord | null> {
    return null;
  }
  async listSalePayments(): Promise<PaymentRecord[]> {
    return [];
  }
  async createPayment(_input: CreatePaymentInput): Promise<PaymentRecord> {
    throw new SaleNotFoundError();
  }
  async findRefundByIdempotencyKey(): Promise<RefundRecord | null> {
    return null;
  }
  async listRefundsByPayment(): Promise<RefundRecord[]> {
    return [];
  }
  async createRefund(): Promise<RefundRecord> {
    throw new SaleNotFoundError();
  }
}

function setup() {
  currentMembershipStatus = "ACTIVE";
  const cartRepository = new InMemoryCartRepository();
  const saleRepository = new InMemorySaleRepository(cartRepository.products);
  const saleService = createSaleService(saleRepository);
  const app = createApp({
    authService: authServiceStub,
    merchantService: createMerchantService(merchantRepoStub),
    saleService,
    cartService: createCartService(cartRepository, saleService),
  });

  return { app, cartRepository, saleRepository };
}

function authed(req: request.Test) {
  return req.set("Authorization", `Bearer ${ACCESS_TOKEN}`).set("X-Merchant-Id", MERCHANT_ID);
}

async function createCart(
  app: ReturnType<typeof setup>["app"],
  body: Record<string, unknown> = {},
) {
  const response = await authed(request(app).post("/v1/carts")).send(body);
  return response;
}

async function addItem(
  app: ReturnType<typeof setup>["app"],
  cartId: string,
  body: Record<string, unknown>,
) {
  return authed(request(app).post(`/v1/carts/${cartId}/items`)).send(body);
}

describe("Carrito y checkout", () => {
  let app: ReturnType<typeof setup>["app"];
  let cartRepository: InMemoryCartRepository;
  let saleRepository: InMemorySaleRepository;

  beforeEach(() => {
    ({ app, cartRepository, saleRepository } = setup());
  });

  it("crea un carrito vacío con totales en cero", async () => {
    const response = await createCart(app, { notes: "Mesa 4" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      status: "OPEN",
      currency: "COP",
      notes: "Mesa 4",
      subtotal: "0",
      discount: "0",
      tax: "0",
      total: "0",
    });
    expect(response.body.items).toHaveLength(0);
  });

  it("agrega productos y calcula totales vivos con impuesto", async () => {
    const cart = await createCart(app);
    const response = await addItem(app, cart.body.id, { productId: COFFEE_ID, quantity: 2 });

    expect(response.status).toBe(201);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      productId: COFFEE_ID,
      productName: "Café",
      quantity: 2,
      available: true,
      unitPrice: "5000",
      taxRateBp: 1900,
      tax: "1900",
      lineTotal: "11900",
    });
    expect(response.body).toMatchObject({ subtotal: "10000", tax: "1900", total: "11900" });
  });

  it("fusiona la cantidad al agregar el mismo producto dos veces", async () => {
    const cart = await createCart(app);
    await addItem(app, cart.body.id, { productId: COFFEE_ID, quantity: 2 });
    const second = await addItem(app, cart.body.id, { productId: COFFEE_ID, quantity: 1 });

    expect(second.body.items).toHaveLength(1);
    expect(second.body.items[0].quantity).toBe(3);
    expect(second.body.subtotal).toBe("15000");
  });

  it("rechaza productos inexistentes, de otro comercio o inactivos", async () => {
    const cart = await createCart(app);

    const missing = await addItem(app, cart.body.id, { productId: randomUUID(), quantity: 1 });
    expect(missing.status).toBe(404);

    const foreign = await addItem(app, cart.body.id, {
      productId: FOREIGN_PRODUCT_ID,
      quantity: 1,
    });
    expect(foreign.status).toBe(404);

    const inactive = await addItem(app, cart.body.id, { productId: INACTIVE_ID, quantity: 1 });
    expect(inactive.status).toBe(422);
  });

  it("actualiza y elimina ítems recalculando totales", async () => {
    const cart = await createCart(app);
    const added = await addItem(app, cart.body.id, { productId: COFFEE_ID, quantity: 2 });
    const itemId = added.body.items[0].id;

    const updated = await authed(
      request(app).patch(`/v1/carts/${cart.body.id}/items/${itemId}`),
    ).send({ quantity: 4 });
    expect(updated.status).toBe(200);
    expect(updated.body.items[0].quantity).toBe(4);
    expect(updated.body.subtotal).toBe("20000");

    const removed = await authed(request(app).delete(`/v1/carts/${cart.body.id}/items/${itemId}`));
    expect(removed.status).toBe(200);
    expect(removed.body.items).toHaveLength(0);
    expect(removed.body.total).toBe("0");
  });

  it("aplica descuento porcentual y lo limpia con null", async () => {
    const cart = await createCart(app);
    await addItem(app, cart.body.id, { productId: TEA_ID, quantity: 1 });

    const discounted = await authed(request(app).patch(`/v1/carts/${cart.body.id}`)).send({
      discount: { type: "PERCENT", percentBp: 1000 },
    });
    expect(discounted.status).toBe(200);
    expect(discounted.body).toMatchObject({
      discountType: "PERCENT",
      discountPercentBp: 1000,
      subtotal: "8000",
      discount: "800",
      total: "7200",
    });

    const cleared = await authed(request(app).patch(`/v1/carts/${cart.body.id}`)).send({
      discount: null,
    });
    expect(cleared.body).toMatchObject({ discountType: null, discount: "0", total: "8000" });
  });

  it("valida el cliente al asignarlo al carrito", async () => {
    const cart = await createCart(app);

    const missing = await authed(request(app).patch(`/v1/carts/${cart.body.id}`)).send({
      customerId: randomUUID(),
    });
    expect(missing.status).toBe(404);

    const ok = await authed(request(app).patch(`/v1/carts/${cart.body.id}`)).send({
      customerId: CUSTOMER_ID,
    });
    expect(ok.status).toBe(200);
    expect(ok.body.customerId).toBe(CUSTOMER_ID);
  });

  it("marca como no disponible un ítem cuyo producto se desactiva y no lo suma", async () => {
    const cart = await createCart(app);
    await addItem(app, cart.body.id, { productId: COFFEE_ID, quantity: 1 });
    await addItem(app, cart.body.id, { productId: TEA_ID, quantity: 1 });

    const tea = cartRepository.products.find((p) => p.id === TEA_ID)!;
    tea.isActive = false;

    const detail = await authed(request(app).get(`/v1/carts/${cart.body.id}`));
    expect(detail.status).toBe(200);
    const teaItem = detail.body.items.find((i: { productId: string }) => i.productId === TEA_ID);
    expect(teaItem.available).toBe(false);
    expect(teaItem.lineTotal).toBe("0");
    // Solo el café activo suma: 5000 + 950 de impuesto.
    expect(detail.body).toMatchObject({ subtotal: "5000", tax: "950", total: "5950" });
  });

  it("confirma el carrito creando una venta DRAFT y queda idempotente", async () => {
    const cart = await createCart(app, { customerId: CUSTOMER_ID });
    await addItem(app, cart.body.id, { productId: COFFEE_ID, quantity: 2 });
    await addItem(app, cart.body.id, { productId: TEA_ID, quantity: 1 });

    const checkout = await authed(request(app).post(`/v1/carts/${cart.body.id}/checkout`));
    expect(checkout.status).toBe(201);
    expect(checkout.body).toMatchObject({
      status: "DRAFT",
      subtotal: "18000",
      tax: "1900",
      total: "19900",
      customerId: CUSTOMER_ID,
    });
    expect(saleRepository.sales).toHaveLength(1);

    // Segundo checkout: misma venta, sin duplicar.
    const again = await authed(request(app).post(`/v1/carts/${cart.body.id}/checkout`));
    expect(again.status).toBe(201);
    expect(again.body.id).toBe(checkout.body.id);
    expect(saleRepository.sales).toHaveLength(1);

    const detail = await authed(request(app).get(`/v1/carts/${cart.body.id}`));
    expect(detail.body.status).toBe("CHECKED_OUT");
    expect(detail.body.checkoutSaleId).toBe(checkout.body.id);
  });

  it("bloquea modificar o confirmar un carrito ya confirmado", async () => {
    const cart = await createCart(app);
    await addItem(app, cart.body.id, { productId: TEA_ID, quantity: 1 });
    await authed(request(app).post(`/v1/carts/${cart.body.id}/checkout`));

    const add = await addItem(app, cart.body.id, { productId: COFFEE_ID, quantity: 1 });
    expect(add.status).toBe(409);

    const del = await authed(request(app).delete(`/v1/carts/${cart.body.id}`));
    expect(del.status).toBe(409);
  });

  it("rechaza confirmar un carrito vacío", async () => {
    const cart = await createCart(app);
    const checkout = await authed(request(app).post(`/v1/carts/${cart.body.id}/checkout`));
    expect(checkout.status).toBe(422);
  });

  it("elimina un carrito abierto", async () => {
    const cart = await createCart(app);
    const del = await authed(request(app).delete(`/v1/carts/${cart.body.id}`));
    expect(del.status).toBe(204);

    const detail = await authed(request(app).get(`/v1/carts/${cart.body.id}`));
    expect(detail.status).toBe(404);
  });

  it("aísla los carritos por comercio y responde 404 a desconocidos", async () => {
    const unknown = await authed(request(app).get(`/v1/carts/${randomUUID()}`));
    expect(unknown.status).toBe(404);
  });

  it("rechaza operaciones si la membresía no está activa", async () => {
    currentMembershipStatus = "SUSPENDED";
    const response = await createCart(app);
    expect(response.status).toBe(403);
  });
});
