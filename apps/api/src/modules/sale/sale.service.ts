import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { AuditRecorder } from "../audit/audit.types.js";
import { InsufficientStockError } from "../inventory/inventory.errors.js";
import type { MerchantContext } from "../merchant/merchant.types.js";
import {
  PaymentAlreadyExistsError,
  PaymentAmountMismatchError,
  SaleNotPayableError,
  SaleNotFoundError,
} from "./sale.errors.js";
import {
  toPublicPayment,
  toPublicPaymentMethod,
  toPublicSale,
  toReceipt,
  type PublicPayment,
  type PublicPaymentMethod,
  type PublicSale,
  type Receipt,
} from "./sale.mappers.js";
import type {
  paymentCreateSchema,
  saleCancelSchema,
  saleCreateSchema,
  saleListQuerySchema,
} from "./sale.schemas.js";
import type {
  ComputedSaleItem,
  SaleProductRecord,
  SaleRepository,
  SaleRecord,
  SaleStatusValue,
} from "./sale.types.js";

type SaleCreate = z.infer<typeof saleCreateSchema>;
type SaleListQuery = z.infer<typeof saleListQuerySchema>;
type PaymentCreate = z.infer<typeof paymentCreateSchema>;
type SaleCancel = z.infer<typeof saleCancelSchema>;

const PAYABLE_STATUSES: SaleStatusValue[] = ["DRAFT", "PENDING_PAYMENT"];
const BASE_SCALE = new Prisma.Decimal(10_000);

function roundMinor(value: Prisma.Decimal): bigint {
  return BigInt(value.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toFixed(0));
}

function pagination(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

interface ComputedTotals {
  items: ComputedSaleItem[];
  subtotalMinor: bigint;
  discountMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
  discount: { type: "PERCENT" | "AMOUNT"; percentBp: number | null; amountMinor: bigint } | null;
  currency: string;
}

export interface SaleService {
  listPaymentMethods(context: MerchantContext): Promise<PublicPaymentMethod[]>;
  listSales(
    context: MerchantContext,
    query: SaleListQuery,
  ): Promise<{ data: PublicSale[]; meta: ReturnType<typeof pagination> }>;
  createSale(
    context: MerchantContext,
    userId: string,
    input: SaleCreate,
    idempotencyKey: string,
  ): Promise<PublicSale>;
  getSale(context: MerchantContext, saleId: string): Promise<PublicSale>;
  getReceipt(context: MerchantContext, saleId: string): Promise<Receipt>;
  cancelSale(
    context: MerchantContext,
    saleId: string,
    userId: string,
    input: SaleCancel,
  ): Promise<PublicSale>;
  listSalePayments(context: MerchantContext, saleId: string): Promise<PublicPayment[]>;
  createPayment(
    context: MerchantContext,
    saleId: string,
    userId: string,
    input: PaymentCreate,
    idempotencyKey: string,
  ): Promise<PublicPayment>;
  getPayment(context: MerchantContext, paymentId: string): Promise<PublicPayment>;
}

export function createSaleService(
  repository: SaleRepository,
  recordAudit: AuditRecorder = async () => {},
): SaleService {
  async function resolveBranch(merchantId: string): Promise<string> {
    const branch = await repository.findBranch(merchantId);

    if (!branch) {
      throw new AppError(
        422,
        "UNPROCESSABLE_ENTITY",
        "El comercio no tiene una sucursal configurada",
      );
    }

    return branch.id;
  }

  async function loadProduct(merchantId: string, productId: string): Promise<SaleProductRecord> {
    const product = await repository.findProduct(merchantId, productId);

    if (!product) {
      throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
    }

    if (!product.isActive) {
      throw new AppError(422, "UNPROCESSABLE_ENTITY", "El producto está inactivo");
    }

    return product;
  }

  async function computeTotals(merchantId: string, input: SaleCreate): Promise<ComputedTotals> {
    const items: ComputedSaleItem[] = [];
    const currencies = new Set<string>();

    for (const line of input.items) {
      const product = await loadProduct(merchantId, line.productId);
      let unitPriceMinor = product.priceMinor;
      let sku = product.sku;

      if (line.variantId) {
        const variant = await repository.findVariant(product.id, line.variantId);

        if (!variant || !variant.isActive) {
          throw new AppError(422, "UNPROCESSABLE_ENTITY", "La variante no está disponible");
        }

        if (variant.priceMinor !== null) unitPriceMinor = variant.priceMinor;
        sku = variant.sku ?? sku;
      }

      currencies.add(product.currency);

      const quantity = new Prisma.Decimal(String(line.quantity));
      const grossMinor = roundMinor(new Prisma.Decimal(unitPriceMinor.toString()).times(quantity));
      const taxRateBp = product.taxRateBp ?? 0;
      const taxMinor = roundMinor(
        new Prisma.Decimal(grossMinor.toString()).times(taxRateBp).div(BASE_SCALE),
      );

      items.push({
        productId: product.id,
        variantId: line.variantId ?? null,
        productName: product.name,
        sku,
        quantity: quantity.toFixed(3),
        unitPriceMinor,
        grossMinor,
        taxRateBp,
        taxMinor,
        lineTotalMinor: grossMinor + taxMinor,
        trackInventory: product.trackInventory,
        productType: product.type,
      });
    }

    if (currencies.size !== 1) {
      throw new AppError(
        422,
        "UNPROCESSABLE_ENTITY",
        "Los productos de la venta deben usar la misma moneda",
      );
    }

    const subtotal = items.reduce((sum, item) => sum + item.grossMinor, 0n);
    const taxMinor = items.reduce((sum, item) => sum + item.taxMinor, 0n);

    let discountMinor = 0n;
    let discount: ComputedTotals["discount"] = null;

    if (input.discount) {
      if (input.discount.type === "PERCENT") {
        discountMinor = roundMinor(
          new Prisma.Decimal(subtotal.toString()).times(input.discount.percentBp).div(BASE_SCALE),
        );
        discount = {
          type: "PERCENT",
          percentBp: input.discount.percentBp,
          amountMinor: discountMinor,
        };
      } else {
        discountMinor = BigInt(input.discount.amount);
        discount = { type: "AMOUNT", percentBp: null, amountMinor: discountMinor };
      }
    }

    if (discountMinor > subtotal + taxMinor) {
      throw new AppError(
        422,
        "UNPROCESSABLE_ENTITY",
        "El descuento no puede superar el total de la venta",
      );
    }

    return {
      items,
      subtotalMinor: subtotal,
      discountMinor,
      taxMinor,
      totalMinor: subtotal - discountMinor + taxMinor,
      discount,
      currency: [...currencies][0] ?? "COP",
    };
  }

  async function loadSale(context: MerchantContext, saleId: string): Promise<SaleRecord> {
    const sale = await repository.findSale(context.merchantId, saleId);

    if (!sale) {
      throw new AppError(404, "NOT_FOUND", "Venta no encontrada");
    }

    return sale;
  }

  return {
    async listPaymentMethods(context) {
      await repository.ensurePaymentMethods(context.merchantId);
      const methods = await repository.listPaymentMethods(context.merchantId, true);
      return methods.map(toPublicPaymentMethod);
    },

    async listSales(context, query) {
      const { data, total } = await repository.listSales(context.merchantId, {
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        status: query.status,
        customerId: query.customerId,
        page: query.page,
        pageSize: query.pageSize,
      });

      return {
        data: data.map(toPublicSale),
        meta: pagination(query.page, query.pageSize, total),
      };
    },

    async createSale(context, userId, input, idempotencyKey) {
      const existing = await repository.findSaleByIdempotencyKey(
        context.merchantId,
        idempotencyKey,
      );

      if (existing) {
        return toPublicSale(existing);
      }

      if (input.customerId) {
        const exists = await repository.customerExists(context.merchantId, input.customerId);

        if (!exists) {
          throw new AppError(404, "NOT_FOUND", "Cliente no encontrado");
        }
      }

      const branchId = await resolveBranch(context.merchantId);
      const totals = await computeTotals(context.merchantId, input);

      const sale = await repository.createSale({
        merchantId: context.merchantId,
        branchId,
        sellerUserId: userId,
        customerId: input.customerId ?? null,
        currency: totals.currency,
        subtotalMinor: totals.subtotalMinor,
        discountMinor: totals.discountMinor,
        taxMinor: totals.taxMinor,
        totalMinor: totals.totalMinor,
        notes: input.notes ?? null,
        idempotencyKey,
        items: totals.items,
        discount: totals.discount,
      });

      await recordAudit({
        merchantId: context.merchantId,
        actorUserId: userId,
        action: "sale.created",
        entityType: "Sale",
        entityId: sale.id,
        metadata: { total: sale.totalMinor.toString(), itemCount: sale.items.length },
      });

      return toPublicSale(sale);
    },

    async getSale(context, saleId) {
      return toPublicSale(await loadSale(context, saleId));
    },

    async getReceipt(context, saleId) {
      const sale = await loadSale(context, saleId);

      const hasApprovedPayment = sale.payments.some((payment) => payment.status === "APPROVED");

      if (sale.status !== "PAID" && !hasApprovedPayment) {
        throw new AppError(
          409,
          "CONFLICT",
          "La venta aún no tiene un pago aprobado para generar comprobante",
        );
      }

      const receiptContext = await repository.findReceiptContext(context.merchantId, saleId);

      if (!receiptContext) {
        throw new AppError(404, "NOT_FOUND", "Venta no encontrada");
      }

      return toReceipt(sale, receiptContext);
    },

    async cancelSale(context, saleId, userId, input) {
      const sale = await loadSale(context, saleId);

      if (!PAYABLE_STATUSES.includes(sale.status)) {
        throw new AppError(409, "CONFLICT", "Solo se pueden anular ventas sin pago aprobado");
      }

      if (sale.payments.some((payment) => payment.status === "APPROVED")) {
        throw new AppError(409, "CONFLICT", "La venta ya tiene un pago aprobado");
      }

      const cancelled = await repository.cancelSale(
        context.merchantId,
        saleId,
        input?.reason ?? null,
      );

      if (cancelled) {
        await recordAudit({
          merchantId: context.merchantId,
          actorUserId: userId,
          action: "sale.cancelled",
          entityType: "Sale",
          entityId: cancelled.id,
          metadata: { reason: input?.reason ?? null },
        });
        return toPublicSale(cancelled);
      }

      const current = await repository.findSale(context.merchantId, saleId);

      if (!current) {
        throw new AppError(404, "NOT_FOUND", "Venta no encontrada");
      }

      throw new AppError(409, "CONFLICT", "La venta cambió de estado y no se puede anular");
    },

    async listSalePayments(context, saleId) {
      await loadSale(context, saleId);
      const payments = await repository.listSalePayments(context.merchantId, saleId);
      return payments.map(toPublicPayment);
    },

    async createPayment(context, saleId, userId, input, idempotencyKey) {
      const existing = await repository.findPaymentByIdempotencyKey(
        context.merchantId,
        idempotencyKey,
      );

      if (existing) {
        if (existing.saleId !== saleId) {
          throw new AppError(
            409,
            "CONFLICT",
            "La clave de idempotencia ya fue usada en otra venta",
          );
        }
        return toPublicPayment(existing);
      }

      if (input.methodCode === "CARD_SOFTPOS") {
        throw new AppError(
          501,
          "NOT_IMPLEMENTED",
          "El cobro con SoftPOS real todavía no está disponible",
        );
      }

      const sale = await loadSale(context, saleId);

      if (!PAYABLE_STATUSES.includes(sale.status)) {
        throw new AppError(409, "CONFLICT", "La venta no admite pagos en su estado actual");
      }

      if (sale.payments.length > 0) {
        throw new AppError(409, "CONFLICT", "La venta ya tiene un pago registrado");
      }

      await repository.ensurePaymentMethods(context.merchantId);
      const method = await repository.findPaymentMethodByCode(context.merchantId, input.methodCode);

      if (!method || !method.isActive || method.requiresProvider) {
        throw new AppError(422, "UNPROCESSABLE_ENTITY", "El método de pago no está disponible");
      }

      const amountMinor = BigInt(input.amount);

      if (amountMinor !== sale.totalMinor) {
        throw new AppError(
          422,
          "UNPROCESSABLE_ENTITY",
          "El importe del pago debe ser igual al total de la venta",
        );
      }

      try {
        const payment = await repository.createPayment({
          merchantId: context.merchantId,
          saleId,
          method,
          amountMinor,
          idempotencyKey,
          notes: input.notes ?? null,
          createdByUserId: userId,
        });

        await recordAudit({
          merchantId: context.merchantId,
          actorUserId: userId,
          action: "payment.approved",
          entityType: "Payment",
          entityId: payment.id,
          metadata: {
            saleId,
            methodCode: payment.methodCode,
            amount: payment.amountMinor.toString(),
            isSimulated: payment.isSimulated,
          },
        });

        return toPublicPayment(payment);
      } catch (error) {
        if (error instanceof SaleNotFoundError) {
          throw new AppError(404, "NOT_FOUND", "Venta no encontrada");
        }
        if (error instanceof SaleNotPayableError || error instanceof PaymentAlreadyExistsError) {
          throw new AppError(409, "CONFLICT", error.message);
        }
        if (error instanceof PaymentAmountMismatchError) {
          throw new AppError(422, "UNPROCESSABLE_ENTITY", error.message);
        }
        if (error instanceof InsufficientStockError) {
          throw new AppError(
            422,
            "UNPROCESSABLE_ENTITY",
            "Stock insuficiente para completar la venta",
          );
        }
        throw error;
      }
    },

    async getPayment(context, paymentId) {
      const payment = await repository.findPayment(context.merchantId, paymentId);

      if (!payment) {
        throw new AppError(404, "NOT_FOUND", "Pago no encontrado");
      }

      return toPublicPayment(payment);
    },
  };
}
