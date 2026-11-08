import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { AuthService } from "../src/modules/auth/auth.service.js";
import type { MerchantRecord, UserRecord } from "../src/modules/auth/auth.types.js";
import { InsufficientStockError } from "../src/modules/inventory/inventory.errors.js";
import { createMerchantService } from "../src/modules/merchant/merchant.service.js";
import type {
  MerchantContext,
  MerchantRepository,
} from "../src/modules/merchant/merchant.types.js";
import {
  PaymentAlreadyExistsError,
  PaymentAmountMismatchError,
  PaymentNotFoundError,
  RefundAmountInvalidError,
  RefundNotAllowedError,
  SaleNotPayableError,
  SaleNotFoundError,
} from "../src/modules/sale/sale.errors.js";
import { createSaleService } from "../src/modules/sale/sale.service.js";
import type {
  BranchRecord,
  CreatePaymentInput,
  CreateRefundInput,
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
const OTHER_MERCHANT_ID = randomUUID();
const BRANCH_ID = randomUUID();
const CUSTOMER_ID = randomUUID();

const COFFEE_ID = randomUUID();
const TEA_ID = randomUUID();
const DELIVERY_ID = randomUUID();
const INACTIVE_ID = randomUUID();
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

type StoredProduct = SaleProductRecord & { merchantId: string };
type StoredInventory = { branchId: string; productId: string; quantity: number };
type StoredMovement = {
  merchantId: string;
  branchId: string;
  productId: string;
  type: string;
  quantityDelta: string;
  referenceType: string | null;
  referenceId: string | null;
};

function defaultMethods(): PaymentMethodRecord[] {
  return [
    {
      id: randomUUID(),
      code: "CASH",
      name: "Efectivo",
      type: "CASH",
      isSimulated: false,
      requiresProvider: false,
      isActive: true,
      sortOrder: 1,
    },
    {
      id: randomUUID(),
      code: "TRANSFER",
      name: "Transferencia",
      type: "TRANSFER",
      isSimulated: false,
      requiresProvider: false,
      isActive: true,
      sortOrder: 2,
    },
    {
      id: randomUUID(),
      code: "CARD_SIMULATED",
      name: "Tarjeta (simulada)",
      type: "CARD_SIMULATED",
      isSimulated: true,
      requiresProvider: false,
      isActive: true,
      sortOrder: 3,
    },
    {
      id: randomUUID(),
      code: "CARD_SOFTPOS",
      name: "Tarjeta (SoftPOS)",
      type: "CARD_SOFTPOS",
      isSimulated: false,
      requiresProvider: true,
      isActive: false,
      sortOrder: 4,
    },
  ];
}

class InMemorySaleRepository implements SaleRepository {
  products: StoredProduct[] = [];
  variants: SaleVariantRecord[] = [];
  customers = new Set<string>();
  methods: PaymentMethodRecord[] = [];
  sales: SaleRecord[] = [];
  inventory: StoredInventory[] = [];
  movements: StoredMovement[] = [];
  paymentKeys = new Map<string, string>();
  refunds: RefundRecord[] = [];
  refundKeys = new Map<string, string>();

  async findBranch(merchantId: string): Promise<BranchRecord | null> {
    return merchantId === MERCHANT_ID ? { id: BRANCH_ID } : null;
  }

  async ensurePaymentMethods(merchantId: string): Promise<void> {
    void merchantId;
    if (this.methods.length > 0) return;
    this.methods.push(...defaultMethods());
  }

  async listPaymentMethods(
    merchantId: string,
    activeOnly: boolean,
  ): Promise<PaymentMethodRecord[]> {
    void merchantId;
    return this.methods
      .filter((method) => !activeOnly || method.isActive)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async findPaymentMethodByCode(
    _merchantId: string,
    code: string,
  ): Promise<PaymentMethodRecord | null> {
    return this.methods.find((method) => method.code === code) ?? null;
  }

  async customerExists(_merchantId: string, customerId: string): Promise<boolean> {
    return this.customers.has(customerId);
  }

  async findProduct(merchantId: string, productId: string): Promise<SaleProductRecord | null> {
    const product = this.products.find(
      (candidate) => candidate.merchantId === merchantId && candidate.id === productId,
    );
    return product ?? null;
  }

  async findVariant(_productId: string, variantId: string): Promise<SaleVariantRecord | null> {
    return this.variants.find((variant) => variant.id === variantId) ?? null;
  }

  async findSaleByIdempotencyKey(merchantId: string, key: string): Promise<SaleRecord | null> {
    return (
      this.sales.find((sale) => sale.merchantId === merchantId && sale.idempotencyKey === key) ??
      null
    );
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

  async listSales(merchantId: string, params: ListSalesParams): Promise<Paginated<SaleRecord>> {
    let sales = this.sales.filter((sale) => sale.merchantId === merchantId);

    if (params.status) sales = sales.filter((sale) => sale.status === params.status);
    if (params.customerId) {
      sales = sales.filter((sale) => sale.customerId === params.customerId);
    }
    if (params.from) sales = sales.filter((sale) => sale.createdAt >= params.from!);
    if (params.to) sales = sales.filter((sale) => sale.createdAt <= params.to!);

    sales.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    const start = (params.page - 1) * params.pageSize;
    return { data: sales.slice(start, start + params.pageSize), total: sales.length };
  }

  async findSale(merchantId: string, saleId: string): Promise<SaleRecord | null> {
    return this.sales.find((sale) => sale.merchantId === merchantId && sale.id === saleId) ?? null;
  }

  async findReceiptContext(merchantId: string, saleId: string) {
    const sale = await this.findSale(merchantId, saleId);
    if (!sale) return null;
    return {
      merchant: { name: "Tienda PostAi", legalName: null, taxId: null },
      branch: { name: "Principal", address: null },
    };
  }

  async cancelSale(
    merchantId: string,
    saleId: string,
    reason: string | null,
  ): Promise<SaleRecord | null> {
    const sale = await this.findSale(merchantId, saleId);
    if (!sale) return null;
    if (sale.status !== "DRAFT" && sale.status !== "PENDING_PAYMENT") return null;
    if (sale.payments.some((payment) => payment.status === "APPROVED")) return null;

    sale.status = "CANCELLED";
    sale.cancelledAt = new Date();
    if (reason) sale.notes = [sale.notes, `Cancelada: ${reason}`].filter(Boolean).join("\n");
    return sale;
  }

  async findPaymentByIdempotencyKey(
    merchantId: string,
    key: string,
  ): Promise<PaymentRecord | null> {
    const paymentId = this.paymentKeys.get(`${merchantId}:${key}`);
    if (!paymentId) return null;
    return this.findPayment(merchantId, paymentId);
  }

  async findPayment(merchantId: string, paymentId: string): Promise<PaymentRecord | null> {
    const sale = this.sales.find(
      (candidate) =>
        candidate.merchantId === merchantId &&
        candidate.payments.some((payment) => payment.id === paymentId),
    );
    return sale?.payments.find((payment) => payment.id === paymentId) ?? null;
  }

  async listSalePayments(merchantId: string, saleId: string): Promise<PaymentRecord[]> {
    const sale = await this.findSale(merchantId, saleId);
    return sale?.payments ?? [];
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentRecord> {
    const existing = await this.findPaymentByIdempotencyKey(input.merchantId, input.idempotencyKey);
    if (existing) return existing;

    const sale = await this.findSale(input.merchantId, input.saleId);
    if (!sale) throw new SaleNotFoundError();
    if (sale.status !== "DRAFT" && sale.status !== "PENDING_PAYMENT") {
      throw new SaleNotPayableError();
    }
    if (sale.payments.length > 0) throw new PaymentAlreadyExistsError();
    if (sale.totalMinor !== input.amountMinor) throw new PaymentAmountMismatchError();

    for (const item of sale.items) {
      const product = this.products.find((candidate) => candidate.id === item.productId);
      if (!product || !product.trackInventory || product.type !== "PRODUCT") continue;

      const stock = this.inventory.find(
        (candidate) =>
          candidate.branchId === sale.branchId && candidate.productId === item.productId,
      );
      const quantity = Number(item.quantity);

      if (!stock || stock.quantity < quantity) throw new InsufficientStockError();

      stock.quantity -= quantity;
      this.movements.push({
        merchantId: input.merchantId,
        branchId: sale.branchId,
        productId: item.productId,
        type: "SALE",
        quantityDelta: String(-quantity),
        referenceType: "SALE",
        referenceId: sale.id,
      });
    }

    const now = new Date();
    const payment: PaymentRecord = {
      id: randomUUID(),
      saleId: sale.id,
      methodCode: input.method.code,
      methodType: input.method.type,
      status: "APPROVED",
      amountMinor: input.amountMinor,
      currency: sale.currency,
      isSimulated: input.method.isSimulated,
      providerPaymentId: null,
      failureCode: null,
      failureMessage: null,
      notes: input.notes,
      refundedMinor: 0n,
      approvedAt: now,
      createdAt: now,
    };

    sale.payments.push(payment);
    sale.status = "PAID";
    sale.completedAt = now;
    const issued = this.sales.filter(
      (other) => other.merchantId === input.merchantId && other.receiptNumber !== null,
    ).length;
    sale.receiptNumber = `R-${String(issued + 1).padStart(6, "0")}`;
    this.paymentKeys.set(`${input.merchantId}:${input.idempotencyKey}`, payment.id);

    return payment;
  }

  async findRefundByIdempotencyKey(merchantId: string, key: string): Promise<RefundRecord | null> {
    const refundId = this.refundKeys.get(`${merchantId}:${key}`);
    if (!refundId) return null;
    return this.refunds.find((refund) => refund.id === refundId) ?? null;
  }

  async listRefundsByPayment(merchantId: string, paymentId: string): Promise<RefundRecord[]> {
    const sale = this.sales.find(
      (candidate) =>
        candidate.merchantId === merchantId &&
        candidate.payments.some((payment) => payment.id === paymentId),
    );
    if (!sale) return [];
    return this.refunds.filter((refund) => refund.paymentId === paymentId);
  }

  async createRefund(input: CreateRefundInput): Promise<RefundRecord> {
    const existing = await this.findRefundByIdempotencyKey(input.merchantId, input.idempotencyKey);
    if (existing) return existing;

    const sale = this.sales.find(
      (candidate) =>
        candidate.merchantId === input.merchantId &&
        candidate.payments.some((payment) => payment.id === input.paymentId),
    );
    const payment = sale?.payments.find((candidate) => candidate.id === input.paymentId);
    if (!sale || !payment) throw new PaymentNotFoundError();
    if (payment.methodType === "CARD_SOFTPOS") throw new RefundNotAllowedError();
    if (payment.status !== "APPROVED") throw new RefundNotAllowedError();

    const remaining = payment.amountMinor - payment.refundedMinor;
    if (remaining <= 0n) throw new RefundNotAllowedError("El pago ya fue reembolsado por completo");
    if (input.amountMinor !== remaining) throw new RefundAmountInvalidError();

    const now = new Date();
    const refund: RefundRecord = {
      id: randomUUID(),
      paymentId: payment.id,
      status: "APPROVED",
      amountMinor: input.amountMinor,
      currency: payment.currency,
      reason: input.reason,
      providerRefundId: null,
      approvedAt: now,
      createdAt: now,
    };

    payment.refundedMinor += input.amountMinor;
    payment.status = "REFUNDED";

    sale.refundedMinor += input.amountMinor;
    sale.status = sale.refundedMinor >= sale.totalMinor ? "REFUNDED" : "PARTIALLY_REFUNDED";

    for (const item of sale.items) {
      const product = this.products.find((candidate) => candidate.id === item.productId);
      if (!product || !product.trackInventory || product.type !== "PRODUCT") continue;

      const stock = this.inventory.find(
        (candidate) =>
          candidate.branchId === sale.branchId && candidate.productId === item.productId,
      );
      if (!stock) continue;

      const quantity = Number(item.quantity);
      stock.quantity += quantity;
      this.movements.push({
        merchantId: input.merchantId,
        branchId: sale.branchId,
        productId: item.productId,
        type: "RETURN",
        quantityDelta: String(quantity),
        referenceType: "REFUND",
        referenceId: refund.id,
      });
    }

    this.refunds.push(refund);
    this.refundKeys.set(`${input.merchantId}:${input.idempotencyKey}`, refund.id);
    return refund;
  }
}

function seed(repository: InMemorySaleRepository) {
  repository.products.push(
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
      id: DELIVERY_ID,
      merchantId: MERCHANT_ID,
      name: "Domicilio",
      sku: null,
      priceMinor: 3_000n,
      currency: "COP",
      type: "SERVICE",
      trackInventory: true,
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
  );

  repository.inventory.push(
    { branchId: BRANCH_ID, productId: COFFEE_ID, quantity: 10 },
    { branchId: BRANCH_ID, productId: DELIVERY_ID, quantity: 5 },
  );

  repository.customers.add(CUSTOMER_ID);
  repository.methods.push(...defaultMethods());

  repository.sales.push({
    id: randomUUID(),
    merchantId: OTHER_MERCHANT_ID,
    branchId: randomUUID(),
    sellerUserId: randomUUID(),
    customerId: null,
    status: "PAID",
    currency: "COP",
    subtotalMinor: 1_000n,
    discountMinor: 0n,
    taxMinor: 0n,
    totalMinor: 1_000n,
    refundedMinor: 0n,
    receiptNumber: "R-AJENA",
    idempotencyKey: randomUUID(),
    notes: null,
    completedAt: new Date(),
    cancelledAt: null,
    createdAt: new Date(),
    items: [],
    payments: [],
  });
}

function setup() {
  currentMembershipStatus = "ACTIVE";
  const repository = new InMemorySaleRepository();
  seed(repository);
  const app = createApp({
    authService: authServiceStub,
    merchantService: createMerchantService(merchantRepoStub),
    saleService: createSaleService(repository),
  });

  return { app, repository };
}

function authed(req: request.Test) {
  return req.set("Authorization", `Bearer ${ACCESS_TOKEN}`).set("X-Merchant-Id", MERCHANT_ID);
}

function saleBody(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      { productId: COFFEE_ID, quantity: 2 },
      { productId: TEA_ID, quantity: 1 },
    ],
    ...overrides,
  };
}

describe("Ventas y pagos", () => {
  let app: ReturnType<typeof setup>["app"];
  let repository: InMemorySaleRepository;

  beforeEach(() => {
    ({ app, repository } = setup());
  });

  it("calcula totales en el servidor y guarda snapshot de los productos", async () => {
    const response = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send(saleBody({ customerId: CUSTOMER_ID, notes: "Mesa 4" }));

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      status: "DRAFT",
      currency: "COP",
      subtotal: "18000",
      discount: "0",
      tax: "1900",
      total: "19900",
      branchId: BRANCH_ID,
      sellerUserId: user.id,
      customerId: CUSTOMER_ID,
      notes: "Mesa 4",
    });
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0]).toMatchObject({
      productId: COFFEE_ID,
      productName: "Café",
      sku: "CAF-001",
      quantity: 2,
      unitPrice: "5000",
      taxRateBp: 1900,
      tax: "1900",
      lineTotal: "11900",
    });
    expect(response.body.items[1]).toMatchObject({
      productId: TEA_ID,
      unitPrice: "8000",
      tax: "0",
      lineTotal: "8000",
    });
  });

  it("aplica descuentos porcentuales y por importe", async () => {
    const percent = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send(saleBody({ discount: { type: "PERCENT", percentBp: 1000 } }));

    expect(percent.status).toBe(201);
    expect(percent.body).toMatchObject({ discount: "1800", total: "18100" });

    const amount = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send(saleBody({ discount: { type: "AMOUNT", amount: "1000" } }));

    expect(amount.status).toBe(201);
    expect(amount.body).toMatchObject({ discount: "1000", total: "18900" });
  });

  it("rechaza descuentos que dejarían el total negativo", async () => {
    const response = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send(saleBody({ discount: { type: "AMOUNT", amount: "50000" } }));

    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({ code: "UNPROCESSABLE_ENTITY" });
    expect(repository.sales).toHaveLength(1);
  });

  it("reutiliza la venta cuando se repite la clave de idempotencia", async () => {
    const key = randomUUID();
    const first = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", key)
      .send(saleBody());
    const second = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", key)
      .send(saleBody());

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
    expect(repository.sales.filter((sale) => sale.merchantId === MERCHANT_ID)).toHaveLength(1);
  });

  it("exige Idempotency-Key válida", async () => {
    const missing = await authed(request(app).post("/v1/sales")).send(saleBody());
    expect(missing.status).toBe(400);

    const invalid = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", "no-es-uuid")
      .send(saleBody());
    expect(invalid.status).toBe(400);
  });

  it("rechaza productos inexistentes, de otro comercio o inactivos", async () => {
    const missing = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: randomUUID(), quantity: 1 }] });
    expect(missing.status).toBe(404);

    const foreign = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: FOREIGN_PRODUCT_ID, quantity: 1 }] });
    expect(foreign.status).toBe(404);

    const inactive = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: INACTIVE_ID, quantity: 1 }] });
    expect(inactive.status).toBe(422);
  });

  it("valida cantidades e ítems obligatorios", async () => {
    const empty = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [] });
    expect(empty.status).toBe(400);

    const zero = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: COFFEE_ID, quantity: 0 }] });
    expect(zero.status).toBe(400);

    const precise = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: COFFEE_ID, quantity: 1.2345 }] });
    expect(precise.status).toBe(400);
  });

  it("lista y consulta ventas aislando por comercio", async () => {
    const first = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send(saleBody());
    const second = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: DELIVERY_ID, quantity: 1 }] });

    const list = await authed(request(app).get("/v1/sales"));
    expect(list.status).toBe(200);
    expect(list.body.meta).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
    expect(list.body.data.map((sale: { id: string }) => sale.id).sort()).toEqual(
      [first.body.id, second.body.id].sort(),
    );

    const filtered = await authed(request(app).get(`/v1/sales?customerId=${CUSTOMER_ID}`));
    expect(filtered.body.meta.total).toBe(0);

    const page = await authed(request(app).get("/v1/sales?pageSize=1&page=2"));
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta).toMatchObject({ page: 2, pageSize: 1, total: 2 });

    const detail = await authed(request(app).get(`/v1/sales/${first.body.id}`));
    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(first.body.id);

    const foreign = await authed(request(app).get(`/v1/sales/${randomUUID()}`));
    expect(foreign.status).toBe(404);
  });

  it("anula ventas sin pago y bloquea el resto de transiciones", async () => {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send(saleBody());

    const cancelled = await authed(request(app).post(`/v1/sales/${sale.body.id}/cancel`)).send({
      reason: "Cliente desistió",
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("CANCELLED");
    expect(cancelled.body.notes).toContain("Cliente desistió");

    const again = await authed(request(app).post(`/v1/sales/${sale.body.id}/cancel`));
    expect(again.status).toBe(409);

    const paid = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: DELIVERY_ID, quantity: 1 }] });
    await authed(request(app).post(`/v1/sales/${paid.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CASH", amount: paid.body.total });

    const paidCancel = await authed(request(app).post(`/v1/sales/${paid.body.id}/cancel`));
    expect(paidCancel.status).toBe(409);
  });

  it("lista solo métodos de pago activos", async () => {
    const response = await authed(request(app).get("/v1/payment-methods"));

    expect(response.status).toBe(200);
    expect(response.body.data.map((method: { code: string }) => method.code)).toEqual([
      "CASH",
      "TRANSFER",
      "CARD_SIMULATED",
    ]);
    expect(response.body.data[2]).toMatchObject({ isSimulated: true, requiresProvider: false });
  });

  it("aprueba un pago en efectivo, marca la venta y descuenta inventario", async () => {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send(saleBody());

    const response = await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CASH", amount: sale.body.total, notes: "Caja 1" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      saleId: sale.body.id,
      methodCode: "CASH",
      status: "APPROVED",
      amount: "19900",
      currency: "COP",
      isSimulated: false,
      refunded: "0",
    });

    const detail = await authed(request(app).get(`/v1/sales/${sale.body.id}`));
    expect(detail.body.status).toBe("PAID");
    expect(detail.body.receiptNumber).toBeTruthy();
    expect(detail.body.payments).toHaveLength(1);

    const coffee = repository.inventory.find((item) => item.productId === COFFEE_ID);
    expect(coffee?.quantity).toBe(8);
    expect(repository.movements).toHaveLength(1);
    expect(repository.movements[0]).toMatchObject({
      type: "SALE",
      quantityDelta: "-2",
      referenceType: "SALE",
      referenceId: sale.body.id,
    });
  });

  it("aprueba la tarjeta simulada marcándola como simulada", async () => {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: DELIVERY_ID, quantity: 1 }] });

    const response = await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CARD_SIMULATED", amount: sale.body.total });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ isSimulated: true, status: "APPROVED" });

    const payments = await authed(request(app).get(`/v1/sales/${sale.body.id}/payments`));
    expect(payments.body.data).toHaveLength(1);
    expect(payments.body.data[0].isSimulated).toBe(true);

    const payment = await authed(request(app).get(`/v1/payments/${response.body.id}`));
    expect(payment.status).toBe(200);
    expect(payment.body.id).toBe(response.body.id);
  });

  it("responde 501 para SoftPOS real sin registrar pago", async () => {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: DELIVERY_ID, quantity: 1 }] });

    const response = await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CARD_SOFTPOS", amount: sale.body.total });

    expect(response.status).toBe(501);
    expect(response.body.error).toMatchObject({ code: "NOT_IMPLEMENTED" });

    const detail = await authed(request(app).get(`/v1/sales/${sale.body.id}`));
    expect(detail.body.status).toBe("DRAFT");
    expect(detail.body.payments).toHaveLength(0);
  });

  it("rechaza importes distintos al total y métodos inactivos", async () => {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: DELIVERY_ID, quantity: 1 }] });

    const mismatch = await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CASH", amount: "1000" });
    expect(mismatch.status).toBe(422);

    const unknown = await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "OTHER", amount: sale.body.total });
    expect(unknown.status).toBe(400);
  });

  it("no vuelve a descontar inventario al repetir la idempotencia del pago", async () => {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send(saleBody());
    const key = randomUUID();

    const first = await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", key)
      .send({ methodCode: "CASH", amount: sale.body.total });
    const second = await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", key)
      .send({ methodCode: "CASH", amount: sale.body.total });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);

    const coffee = repository.inventory.find((item) => item.productId === COFFEE_ID);
    expect(coffee?.quantity).toBe(8);
    expect(repository.movements).toHaveLength(1);
  });

  it("bloquea un segundo pago para la misma venta", async () => {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: DELIVERY_ID, quantity: 1 }] });

    await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CASH", amount: sale.body.total });

    const second = await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "TRANSFER", amount: sale.body.total });

    expect(second.status).toBe(409);
  });

  it("revierte el pago si no hay stock suficiente", async () => {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: COFFEE_ID, quantity: 20 }] });

    const response = await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CASH", amount: sale.body.total });

    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({ code: "UNPROCESSABLE_ENTITY" });

    const detail = await authed(request(app).get(`/v1/sales/${sale.body.id}`));
    expect(detail.body.status).toBe("DRAFT");
    expect(detail.body.payments).toHaveLength(0);

    const coffee = repository.inventory.find((item) => item.productId === COFFEE_ID);
    expect(coffee?.quantity).toBe(10);
  });

  it("exige clave de idempotencia y venta pagable al registrar pagos", async () => {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: DELIVERY_ID, quantity: 1 }] });

    const missing = await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`)).send({
      methodCode: "CASH",
      amount: sale.body.total,
    });
    expect(missing.status).toBe(400);

    await authed(request(app).post(`/v1/sales/${sale.body.id}/cancel`));
    const cancelled = await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CASH", amount: sale.body.total });
    expect(cancelled.status).toBe(409);

    const missingSale = await authed(request(app).post(`/v1/sales/${randomUUID()}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CASH", amount: "1000" });
    expect(missingSale.status).toBe(404);
  });

  it("rechaza ventas y pagos si la membresía no está activa", async () => {
    currentMembershipStatus = "SUSPENDED";

    const list = await authed(request(app).get("/v1/sales"));
    expect(list.status).toBe(403);

    const create = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send(saleBody());
    expect(create.status).toBe(403);
  });

  it("genera el comprobante de una venta pagada con número legible", async () => {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send(saleBody());
    await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CASH", amount: sale.body.total });

    const receipt = await authed(request(app).get(`/v1/sales/${sale.body.id}/receipt`));

    expect(receipt.status).toBe(200);
    expect(receipt.body).toMatchObject({
      saleId: sale.body.id,
      simulated: false,
      merchant: { name: "Tienda PostAi" },
      branch: { name: "Principal" },
    });
    expect(receipt.body.receiptNumber).toMatch(/^R-\d{6}$/);
    expect(receipt.body.totals.total).toBe(sale.body.total);
    expect(receipt.body.items.length).toBeGreaterThan(0);
    expect(receipt.body.payments).toEqual([
      { methodCode: "CASH", amount: sale.body.total, isSimulated: false },
    ]);
    expect(receipt.body.issuedAt).toBeTruthy();
  });

  it("marca el comprobante como simulado cuando el pago lo es", async () => {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: DELIVERY_ID, quantity: 1 }] });
    await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CARD_SIMULATED", amount: sale.body.total });

    const receipt = await authed(request(app).get(`/v1/sales/${sale.body.id}/receipt`));

    expect(receipt.status).toBe(200);
    expect(receipt.body.simulated).toBe(true);
    expect(receipt.body.payments[0]).toMatchObject({
      methodCode: "CARD_SIMULATED",
      isSimulated: true,
    });
  });

  it("responde 409 para una venta sin pago aprobado", async () => {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send(saleBody());

    const receipt = await authed(request(app).get(`/v1/sales/${sale.body.id}/receipt`));

    expect(receipt.status).toBe(409);
    expect(receipt.body.error).toMatchObject({ code: "CONFLICT" });
  });

  it("responde 404 para una venta inexistente", async () => {
    const receipt = await authed(request(app).get(`/v1/sales/${randomUUID()}/receipt`));
    expect(receipt.status).toBe(404);
  });

  it("asigna números de comprobante secuenciales por comercio", async () => {
    const first = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: DELIVERY_ID, quantity: 1 }] });
    await authed(request(app).post(`/v1/sales/${first.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CASH", amount: first.body.total });

    const second = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items: [{ productId: DELIVERY_ID, quantity: 1 }] });
    await authed(request(app).post(`/v1/sales/${second.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CASH", amount: second.body.total });

    const firstReceipt = await authed(request(app).get(`/v1/sales/${first.body.id}/receipt`));
    const secondReceipt = await authed(request(app).get(`/v1/sales/${second.body.id}/receipt`));

    expect(firstReceipt.body.receiptNumber).toBe("R-000001");
    expect(secondReceipt.body.receiptNumber).toBe("R-000002");
  });
});

describe("Reembolsos", () => {
  let app: ReturnType<typeof setup>["app"];
  let repository: InMemorySaleRepository;

  beforeEach(() => {
    ({ app, repository } = setup());
  });

  async function paidSale(items: Array<{ productId: string; quantity: number }>) {
    const sale = await authed(request(app).post("/v1/sales"))
      .set("Idempotency-Key", randomUUID())
      .send({ items });

    const payment = await authed(request(app).post(`/v1/sales/${sale.body.id}/payments`))
      .set("Idempotency-Key", randomUUID())
      .send({ methodCode: "CASH", amount: sale.body.total });

    return { sale: sale.body, payment: payment.body };
  }

  it("reembolsa el total, repone inventario y marca venta y pago", async () => {
    const stockBefore =
      repository.inventory.find((entry) => entry.productId === COFFEE_ID)?.quantity ?? 0;
    const { sale, payment } = await paidSale([{ productId: COFFEE_ID, quantity: 2 }]);

    const response = await authed(request(app).post(`/v1/payments/${payment.id}/refunds`))
      .set("Idempotency-Key", randomUUID())
      .send({ amount: payment.amount, reason: "Cliente devolvió el producto" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      paymentId: payment.id,
      status: "APPROVED",
      amount: payment.amount,
      reason: "Cliente devolvió el producto",
    });

    const stockAfter =
      repository.inventory.find((entry) => entry.productId === COFFEE_ID)?.quantity ?? 0;
    expect(stockAfter).toBe(stockBefore);

    const detail = await authed(request(app).get(`/v1/sales/${sale.id}`));
    expect(detail.body.status).toBe("REFUNDED");
    expect(detail.body.refunded).toBe(payment.amount);
    expect(detail.body.payments[0]).toMatchObject({
      status: "REFUNDED",
      refunded: payment.amount,
    });
  });

  it("lista los reembolsos del pago", async () => {
    const { payment } = await paidSale([{ productId: DELIVERY_ID, quantity: 1 }]);

    await authed(request(app).post(`/v1/payments/${payment.id}/refunds`))
      .set("Idempotency-Key", randomUUID())
      .send({ amount: payment.amount });

    const list = await authed(request(app).get(`/v1/payments/${payment.id}/refunds`));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ paymentId: payment.id, status: "APPROVED" });
  });

  it("es idempotente por clave", async () => {
    const { payment } = await paidSale([{ productId: DELIVERY_ID, quantity: 1 }]);
    const key = randomUUID();

    const first = await authed(request(app).post(`/v1/payments/${payment.id}/refunds`))
      .set("Idempotency-Key", key)
      .send({ amount: payment.amount });
    const second = await authed(request(app).post(`/v1/payments/${payment.id}/refunds`))
      .set("Idempotency-Key", key)
      .send({ amount: payment.amount });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
    expect(repository.refunds).toHaveLength(1);
  });

  it("rechaza un segundo reembolso del mismo pago con 409", async () => {
    const { payment } = await paidSale([{ productId: DELIVERY_ID, quantity: 1 }]);

    await authed(request(app).post(`/v1/payments/${payment.id}/refunds`))
      .set("Idempotency-Key", randomUUID())
      .send({ amount: payment.amount });

    const again = await authed(request(app).post(`/v1/payments/${payment.id}/refunds`))
      .set("Idempotency-Key", randomUUID())
      .send({ amount: payment.amount });

    expect(again.status).toBe(409);
  });

  it("rechaza importes parciales con 422", async () => {
    const { payment } = await paidSale([{ productId: DELIVERY_ID, quantity: 1 }]);

    const response = await authed(request(app).post(`/v1/payments/${payment.id}/refunds`))
      .set("Idempotency-Key", randomUUID())
      .send({ amount: "1000" });

    expect(response.status).toBe(422);
    expect(response.body.error).toMatchObject({ code: "UNPROCESSABLE_ENTITY" });
  });

  it("responde 404 para un pago inexistente", async () => {
    const response = await authed(request(app).post(`/v1/payments/${randomUUID()}/refunds`))
      .set("Idempotency-Key", randomUUID())
      .send({ amount: "1000" });

    expect(response.status).toBe(404);
  });

  it("aísla por comercio: no reembolsa pagos de otro comercio", async () => {
    const foreignPaymentId = randomUUID();
    repository.sales.push({
      id: randomUUID(),
      merchantId: OTHER_MERCHANT_ID,
      branchId: randomUUID(),
      sellerUserId: randomUUID(),
      customerId: null,
      status: "PAID",
      currency: "COP",
      subtotalMinor: 1_000n,
      discountMinor: 0n,
      taxMinor: 0n,
      totalMinor: 1_000n,
      refundedMinor: 0n,
      receiptNumber: "R-X",
      idempotencyKey: randomUUID(),
      notes: null,
      completedAt: new Date(),
      cancelledAt: null,
      createdAt: new Date(),
      items: [],
      payments: [
        {
          id: foreignPaymentId,
          saleId: randomUUID(),
          methodCode: "CASH",
          methodType: "CASH",
          status: "APPROVED",
          amountMinor: 1_000n,
          currency: "COP",
          isSimulated: false,
          providerPaymentId: null,
          failureCode: null,
          failureMessage: null,
          notes: null,
          refundedMinor: 0n,
          approvedAt: new Date(),
          createdAt: new Date(),
        },
      ],
    });

    const response = await authed(request(app).post(`/v1/payments/${foreignPaymentId}/refunds`))
      .set("Idempotency-Key", randomUUID())
      .send({ amount: "1000" });

    expect(response.status).toBe(404);
  });
});
