import { Prisma, type PrismaClient } from "@prisma/client";
import { DEFAULT_PAYMENT_METHODS } from "../../config/payment-methods.js";
import { InsufficientStockError } from "../inventory/inventory.errors.js";
import {
  PaymentAlreadyExistsError,
  PaymentAmountMismatchError,
  PaymentNotFoundError,
  RefundAmountInvalidError,
  RefundNotAllowedError,
  SaleNotPayableError,
  SaleNotFoundError,
} from "./sale.errors.js";
import type {
  BranchRecord,
  CreatePaymentInput,
  CreateRefundInput,
  CreateSaleInput,
  ListSalesParams,
  Paginated,
  PaymentMethodRecord,
  PaymentMethodTypeValue,
  PaymentRecord,
  PaymentStatusValue,
  ReceiptContext,
  RefundRecord,
  RefundStatusValue,
  SaleItemRecord,
  SaleProductRecord,
  SaleRecord,
  SaleRepository,
  SaleStatusValue,
  SaleVariantRecord,
} from "./sale.types.js";

const PAYMENT_SELECT = {
  id: true,
  saleId: true,
  status: true,
  amountMinor: true,
  currency: true,
  isSimulated: true,
  providerPaymentId: true,
  failureCode: true,
  failureMessage: true,
  notes: true,
  refundedMinor: true,
  approvedAt: true,
  createdAt: true,
  method: { select: { code: true, type: true } },
} as const;

const SALE_SELECT = {
  id: true,
  merchantId: true,
  branchId: true,
  sellerUserId: true,
  customerId: true,
  status: true,
  currency: true,
  subtotalMinor: true,
  discountMinor: true,
  taxMinor: true,
  totalMinor: true,
  refundedMinor: true,
  receiptNumber: true,
  idempotencyKey: true,
  notes: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  items: { orderBy: { createdAt: "asc" } },
  payments: { orderBy: { createdAt: "asc" }, select: PAYMENT_SELECT },
} as const;

const REFUND_SELECT = {
  id: true,
  paymentId: true,
  status: true,
  amountMinor: true,
  currency: true,
  reason: true,
  providerRefundId: true,
  approvedAt: true,
  createdAt: true,
} as const;

type SaleRow = Prisma.SaleGetPayload<{ select: typeof SALE_SELECT }>;
type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof PAYMENT_SELECT }>;
type RefundRow = Prisma.RefundGetPayload<{ select: typeof REFUND_SELECT }>;

function toRefundRecord(row: RefundRow): RefundRecord {
  return {
    id: row.id,
    paymentId: row.paymentId,
    status: row.status as RefundStatusValue,
    amountMinor: row.amountMinor,
    currency: row.currency,
    reason: row.reason,
    providerRefundId: row.providerRefundId,
    approvedAt: row.approvedAt,
    createdAt: row.createdAt,
  };
}

const PAYABLE_STATUSES: SaleStatusValue[] = ["DRAFT", "PENDING_PAYMENT"];

function toPaymentRecord(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    saleId: row.saleId,
    methodCode: row.method.code,
    methodType: row.method.type as PaymentMethodTypeValue,
    status: row.status as PaymentStatusValue,
    amountMinor: row.amountMinor,
    currency: row.currency,
    isSimulated: row.isSimulated,
    providerPaymentId: row.providerPaymentId,
    failureCode: row.failureCode,
    failureMessage: row.failureMessage,
    notes: row.notes,
    refundedMinor: row.refundedMinor,
    approvedAt: row.approvedAt,
    createdAt: row.createdAt,
  };
}

function toSaleItemRecord(row: SaleRow["items"][number]): SaleItemRecord {
  return {
    id: row.id,
    productId: row.productId,
    variantId: row.variantId,
    productName: row.productName,
    sku: row.sku,
    quantity: row.quantity.toString(),
    unitPriceMinor: row.unitPriceMinor,
    discountMinor: row.discountMinor,
    taxRateBp: row.taxRateBp,
    taxMinor: row.taxMinor,
    lineTotalMinor: row.lineTotalMinor,
  };
}

function toSaleRecord(row: SaleRow): SaleRecord {
  return {
    id: row.id,
    merchantId: row.merchantId,
    branchId: row.branchId,
    sellerUserId: row.sellerUserId,
    customerId: row.customerId,
    status: row.status as SaleStatusValue,
    currency: row.currency,
    subtotalMinor: row.subtotalMinor,
    discountMinor: row.discountMinor,
    taxMinor: row.taxMinor,
    totalMinor: row.totalMinor,
    refundedMinor: row.refundedMinor,
    receiptNumber: row.receiptNumber,
    idempotencyKey: row.idempotencyKey,
    notes: row.notes,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
    items: row.items.map(toSaleItemRecord),
    payments: row.payments.map(toPaymentRecord),
  };
}

function isSerializationFailure(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function isIdempotencyConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta?.target ?? "").includes("idempotencyKey")
  );
}

export class PrismaSaleRepository implements SaleRepository {
  constructor(private readonly db: PrismaClient) {}

  async findBranch(merchantId: string): Promise<BranchRecord | null> {
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

  async ensurePaymentMethods(merchantId: string): Promise<void> {
    const existing = await this.db.paymentMethod.count({ where: { merchantId } });

    if (existing > 0) return;

    await this.db.paymentMethod.createMany({
      data: DEFAULT_PAYMENT_METHODS.map((method) => ({
        merchantId,
        code: method.code,
        name: method.name,
        type: method.type,
        isSimulated: method.isSimulated,
        requiresProvider: method.requiresProvider,
        isActive: method.isActive,
        sortOrder: method.sortOrder,
      })),
      skipDuplicates: true,
    });
  }

  listPaymentMethods(merchantId: string, activeOnly: boolean): Promise<PaymentMethodRecord[]> {
    return this.db.paymentMethod.findMany({
      where: { merchantId, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        isSimulated: true,
        requiresProvider: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  findPaymentMethodByCode(merchantId: string, code: string): Promise<PaymentMethodRecord | null> {
    return this.db.paymentMethod.findUnique({
      where: { merchantId_code: { merchantId, code } },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        isSimulated: true,
        requiresProvider: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  async customerExists(merchantId: string, customerId: string): Promise<boolean> {
    const count = await this.db.customer.count({ where: { id: customerId, merchantId } });
    return count > 0;
  }

  async findProduct(merchantId: string, productId: string): Promise<SaleProductRecord | null> {
    const product = await this.db.product.findFirst({
      where: { id: productId, merchantId },
      select: {
        id: true,
        name: true,
        sku: true,
        priceMinor: true,
        currency: true,
        type: true,
        trackInventory: true,
        isActive: true,
        taxRate: { select: { rateBp: true, isActive: true } },
      },
    });

    if (!product) return null;

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      priceMinor: product.priceMinor,
      currency: product.currency,
      type: product.type,
      trackInventory: product.trackInventory,
      isActive: product.isActive,
      taxRateBp: product.taxRate?.isActive ? product.taxRate.rateBp : null,
    };
  }

  findVariant(productId: string, variantId: string): Promise<SaleVariantRecord | null> {
    return this.db.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true, productId: true, sku: true, priceMinor: true, isActive: true },
    });
  }

  findSaleByIdempotencyKey(merchantId: string, key: string): Promise<SaleRecord | null> {
    return this.db.sale
      .findUnique({
        where: { merchantId_idempotencyKey: { merchantId, idempotencyKey: key } },
        select: SALE_SELECT,
      })
      .then((row) => (row ? toSaleRecord(row) : null));
  }

  async createSale(input: CreateSaleInput): Promise<SaleRecord> {
    try {
      const sale = await this.db.sale.create({
        data: {
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
          notes: input.notes,
          idempotencyKey: input.idempotencyKey,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productName: item.productName,
              sku: item.sku,
              quantity: new Prisma.Decimal(item.quantity),
              unitPriceMinor: item.unitPriceMinor,
              taxRateBp: item.taxRateBp,
              taxMinor: item.taxMinor,
              lineTotalMinor: item.lineTotalMinor,
            })),
          },
          ...(input.discount
            ? {
                discounts: {
                  create: {
                    merchantId: input.merchantId,
                    type: input.discount.type,
                    percentBp: input.discount.percentBp,
                    amountMinor: input.discount.amountMinor,
                    createdByUserId: input.sellerUserId,
                  },
                },
              }
            : {}),
        },
        select: SALE_SELECT,
      });

      return toSaleRecord(sale);
    } catch (error) {
      if (isIdempotencyConflict(error)) {
        const existing = await this.findSaleByIdempotencyKey(
          input.merchantId,
          input.idempotencyKey,
        );
        if (existing) return existing;
      }
      throw error;
    }
  }

  async listSales(merchantId: string, params: ListSalesParams): Promise<Paginated<SaleRecord>> {
    const createdAt =
      params.from || params.to
        ? {
            ...(params.from ? { gte: params.from } : {}),
            ...(params.to ? { lte: params.to } : {}),
          }
        : undefined;

    const where: Prisma.SaleWhereInput = {
      merchantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [data, total] = await this.db.$transaction([
      this.db.sale.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: SALE_SELECT,
      }),
      this.db.sale.count({ where }),
    ]);

    return { data: data.map(toSaleRecord), total };
  }

  async findSale(merchantId: string, saleId: string): Promise<SaleRecord | null> {
    const sale = await this.db.sale.findFirst({
      where: { id: saleId, merchantId },
      select: SALE_SELECT,
    });

    return sale ? toSaleRecord(sale) : null;
  }

  async findReceiptContext(merchantId: string, saleId: string): Promise<ReceiptContext | null> {
    const sale = await this.db.sale.findFirst({
      where: { id: saleId, merchantId },
      select: {
        merchant: { select: { name: true, legalName: true, taxId: true } },
        branch: { select: { name: true, address: true } },
      },
    });

    return sale ? { merchant: sale.merchant, branch: sale.branch } : null;
  }

  async cancelSale(
    merchantId: string,
    saleId: string,
    reason: string | null,
  ): Promise<SaleRecord | null> {
    return this.db.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, merchantId },
        select: { id: true, notes: true },
      });

      if (!sale) return null;

      const notes = reason
        ? [sale.notes, `Cancelada: ${reason}`].filter(Boolean).join("\n")
        : undefined;

      const result = await tx.sale.updateMany({
        where: {
          id: saleId,
          merchantId,
          status: { in: PAYABLE_STATUSES },
          payments: { none: { status: "APPROVED" } },
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          ...(notes ? { notes } : {}),
        },
      });

      if (result.count === 0) return null;

      const updated = await tx.sale.findUnique({ where: { id: saleId }, select: SALE_SELECT });
      return updated ? toSaleRecord(updated) : null;
    });
  }

  findPaymentByIdempotencyKey(merchantId: string, key: string): Promise<PaymentRecord | null> {
    return this.db.payment
      .findUnique({
        where: { merchantId_idempotencyKey: { merchantId, idempotencyKey: key } },
        select: PAYMENT_SELECT,
      })
      .then((row) => (row ? toPaymentRecord(row) : null));
  }

  findPayment(merchantId: string, paymentId: string): Promise<PaymentRecord | null> {
    return this.db.payment
      .findFirst({ where: { id: paymentId, merchantId }, select: PAYMENT_SELECT })
      .then((row) => (row ? toPaymentRecord(row) : null));
  }

  async listSalePayments(merchantId: string, saleId: string): Promise<PaymentRecord[]> {
    const rows = await this.db.payment.findMany({
      where: { merchantId, saleId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: PAYMENT_SELECT,
    });

    return rows.map(toPaymentRecord);
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentRecord> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.db.$transaction(
          async (tx) => {
            const sale = await tx.sale.findFirst({
              where: { id: input.saleId, merchantId: input.merchantId },
              select: {
                id: true,
                branchId: true,
                status: true,
                currency: true,
                totalMinor: true,
                items: true,
                payments: { select: { id: true } },
              },
            });

            if (!sale) throw new SaleNotFoundError();
            if (!PAYABLE_STATUSES.includes(sale.status as SaleStatusValue)) {
              throw new SaleNotPayableError();
            }
            if (sale.payments.length > 0) throw new PaymentAlreadyExistsError();
            if (sale.totalMinor !== input.amountMinor) throw new PaymentAmountMismatchError();

            const now = new Date();

            for (const item of sale.items) {
              const product = await tx.product.findUnique({
                where: { id: item.productId },
                select: { type: true, trackInventory: true },
              });

              if (!product?.trackInventory || product.type !== "PRODUCT") continue;

              const quantity = item.quantity;
              const current = await tx.inventoryItem.findUnique({
                where: {
                  branchId_productId: {
                    branchId: sale.branchId,
                    productId: item.productId,
                  },
                },
              });

              if (!current || current.quantity.lessThan(quantity)) {
                throw new InsufficientStockError();
              }

              const updated = await tx.inventoryItem.update({
                where: { id: current.id },
                data: { quantity: { decrement: quantity } },
              });

              await tx.inventoryMovement.create({
                data: {
                  merchantId: input.merchantId,
                  branchId: sale.branchId,
                  inventoryItemId: current.id,
                  type: "SALE",
                  quantityDelta: quantity.negated(),
                  previousQuantity: current.quantity,
                  newQuantity: updated.quantity,
                  referenceType: "SALE",
                  referenceId: sale.id,
                  createdByUserId: input.createdByUserId,
                },
              });
            }

            const payment = await tx.payment.create({
              data: {
                merchantId: input.merchantId,
                saleId: sale.id,
                methodId: input.method.id,
                status: "APPROVED",
                amountMinor: input.amountMinor,
                currency: sale.currency,
                isSimulated: input.method.isSimulated,
                idempotencyKey: input.idempotencyKey,
                notes: input.notes,
                approvedAt: now,
              },
              select: PAYMENT_SELECT,
            });

            // Número de comprobante legible y secuencial por comercio. La
            // transacción Serializable evita que dos pagos obtengan el mismo
            // número de forma concurrente.
            const issued = await tx.sale.count({
              where: { merchantId: input.merchantId, receiptNumber: { not: null } },
            });
            const receiptNumber = `R-${String(issued + 1).padStart(6, "0")}`;

            await tx.sale.update({
              where: { id: sale.id },
              data: {
                status: "PAID",
                completedAt: now,
                receiptNumber,
              },
            });

            return toPaymentRecord(payment);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (isSerializationFailure(error) && attempt < 2) {
          continue;
        }

        if (isIdempotencyConflict(error)) {
          const existing = await this.findPaymentByIdempotencyKey(
            input.merchantId,
            input.idempotencyKey,
          );
          if (existing) return existing;
        }

        throw error;
      }
    }
  }

  findRefundByIdempotencyKey(merchantId: string, key: string): Promise<RefundRecord | null> {
    return this.db.refund
      .findUnique({
        where: { merchantId_idempotencyKey: { merchantId, idempotencyKey: key } },
        select: REFUND_SELECT,
      })
      .then((row) => (row ? toRefundRecord(row) : null));
  }

  async listRefundsByPayment(merchantId: string, paymentId: string): Promise<RefundRecord[]> {
    const rows = await this.db.refund.findMany({
      where: { merchantId, paymentId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: REFUND_SELECT,
    });

    return rows.map(toRefundRecord);
  }

  async createRefund(input: CreateRefundInput): Promise<RefundRecord> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.db.$transaction(
          async (tx) => {
            const payment = await tx.payment.findFirst({
              where: { id: input.paymentId, merchantId: input.merchantId },
              select: {
                id: true,
                saleId: true,
                status: true,
                amountMinor: true,
                refundedMinor: true,
                method: { select: { requiresProvider: true } },
              },
            });

            if (!payment) throw new PaymentNotFoundError();
            if (payment.method.requiresProvider) throw new RefundNotAllowedError();
            if (payment.status !== "APPROVED") throw new RefundNotAllowedError();

            const remaining = payment.amountMinor - payment.refundedMinor;
            if (remaining <= 0n) {
              throw new RefundNotAllowedError("El pago ya fue reembolsado por completo");
            }
            // MVP: solo reembolsos totales del saldo pendiente.
            if (input.amountMinor !== remaining) throw new RefundAmountInvalidError();

            const now = new Date();

            const refund = await tx.refund.create({
              data: {
                merchantId: input.merchantId,
                paymentId: payment.id,
                status: "APPROVED",
                amountMinor: input.amountMinor,
                reason: input.reason,
                idempotencyKey: input.idempotencyKey,
                createdByUserId: input.createdByUserId,
                approvedAt: now,
              },
              select: REFUND_SELECT,
            });

            await tx.payment.update({
              where: { id: payment.id },
              data: {
                refundedMinor: { increment: input.amountMinor },
                status: "REFUNDED",
              },
            });

            const sale = await tx.sale.findUnique({
              where: { id: payment.saleId },
              select: {
                id: true,
                branchId: true,
                totalMinor: true,
                refundedMinor: true,
                items: { select: { productId: true, quantity: true } },
              },
            });

            if (sale) {
              const nextRefunded = sale.refundedMinor + input.amountMinor;
              await tx.sale.update({
                where: { id: sale.id },
                data: {
                  refundedMinor: { increment: input.amountMinor },
                  status: nextRefunded >= sale.totalMinor ? "REFUNDED" : "PARTIALLY_REFUNDED",
                },
              });

              // Reponer inventario descontado al vender productos controlados.
              for (const item of sale.items) {
                const product = await tx.product.findUnique({
                  where: { id: item.productId },
                  select: { type: true, trackInventory: true },
                });

                if (!product?.trackInventory || product.type !== "PRODUCT") continue;

                const current = await tx.inventoryItem.findUnique({
                  where: {
                    branchId_productId: { branchId: sale.branchId, productId: item.productId },
                  },
                });

                if (!current) continue;

                const updated = await tx.inventoryItem.update({
                  where: { id: current.id },
                  data: { quantity: { increment: item.quantity } },
                });

                await tx.inventoryMovement.create({
                  data: {
                    merchantId: input.merchantId,
                    branchId: sale.branchId,
                    inventoryItemId: current.id,
                    type: "RETURN",
                    quantityDelta: item.quantity,
                    previousQuantity: current.quantity,
                    newQuantity: updated.quantity,
                    referenceType: "REFUND",
                    referenceId: refund.id,
                    createdByUserId: input.createdByUserId,
                  },
                });
              }
            }

            return toRefundRecord(refund);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (isSerializationFailure(error) && attempt < 2) {
          continue;
        }

        if (isIdempotencyConflict(error)) {
          const existing = await this.findRefundByIdempotencyKey(
            input.merchantId,
            input.idempotencyKey,
          );
          if (existing) return existing;
        }

        throw error;
      }
    }
  }
}
