import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { MerchantContext } from "../merchant/merchant.types.js";
import type { PublicSale } from "../sale/sale.mappers.js";
import type { SaleCreateInput } from "../sale/sale.schemas.js";
import type { SaleService } from "../sale/sale.service.js";
import {
  toPublicCart,
  type CartTotals,
  type PricedCartItem,
  type PublicCart,
} from "./cart.mappers.js";
import type {
  cartCreateSchema,
  cartItemCreateSchema,
  cartItemUpdateSchema,
  cartUpdateSchema,
} from "./cart.schemas.js";
import type {
  AddCartItemInput,
  CartProductRecord,
  CartRecord,
  CartRepository,
  UpdateCartData,
} from "./cart.types.js";

type CartCreate = z.infer<typeof cartCreateSchema>;
type CartUpdate = z.infer<typeof cartUpdateSchema>;
type CartItemCreate = z.infer<typeof cartItemCreateSchema>;
type CartItemUpdate = z.infer<typeof cartItemUpdateSchema>;

const BASE_SCALE = new Prisma.Decimal(10_000);

function roundMinor(value: Prisma.Decimal): bigint {
  return BigInt(value.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toFixed(0));
}

export interface CartService {
  createCart(context: MerchantContext, userId: string, input: CartCreate): Promise<PublicCart>;
  getCart(context: MerchantContext, cartId: string): Promise<PublicCart>;
  updateCart(context: MerchantContext, cartId: string, input: CartUpdate): Promise<PublicCart>;
  deleteCart(context: MerchantContext, cartId: string): Promise<void>;
  addItem(context: MerchantContext, cartId: string, input: CartItemCreate): Promise<PublicCart>;
  updateItem(
    context: MerchantContext,
    cartId: string,
    itemId: string,
    input: CartItemUpdate,
  ): Promise<PublicCart>;
  removeItem(context: MerchantContext, cartId: string, itemId: string): Promise<PublicCart>;
  checkout(context: MerchantContext, userId: string, cartId: string): Promise<PublicSale>;
}

export function createCartService(
  repository: CartRepository,
  saleService: SaleService,
): CartService {
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

  async function loadCart(context: MerchantContext, cartId: string): Promise<CartRecord> {
    const cart = await repository.findCart(context.merchantId, cartId);

    if (!cart) {
      throw new AppError(404, "NOT_FOUND", "Carrito no encontrado");
    }

    return cart;
  }

  function assertEditable(cart: CartRecord): void {
    if (cart.status !== "OPEN") {
      throw new AppError(
        409,
        "CONFLICT",
        "El carrito ya fue confirmado o descartado y no se puede modificar",
      );
    }
  }

  async function validateCustomer(merchantId: string, customerId: string): Promise<void> {
    const exists = await repository.customerExists(merchantId, customerId);

    if (!exists) {
      throw new AppError(404, "NOT_FOUND", "Cliente no encontrado");
    }
  }

  // Valida que el producto (y la variante, si se envía) exista, pertenezca al
  // comercio y esté activo. Se usa al agregar ítems al carrito.
  async function loadActiveProduct(
    merchantId: string,
    productId: string,
    variantId: string | null,
  ): Promise<CartProductRecord> {
    const product = await repository.findProduct(merchantId, productId);

    if (!product) {
      throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
    }

    if (!product.isActive) {
      throw new AppError(422, "UNPROCESSABLE_ENTITY", "El producto está inactivo");
    }

    if (variantId) {
      const variant = await repository.findVariant(product.id, variantId);

      if (!variant || !variant.isActive) {
        throw new AppError(422, "UNPROCESSABLE_ENTITY", "La variante no está disponible");
      }
    }

    return product;
  }

  // Precios vivos del carrito. Lee el catálogo actual (ADR-008, espejo de las
  // fórmulas de ADR-007). Los ítems cuyo producto o variante ya no está
  // disponible se marcan como no disponibles y no suman al total.
  async function computeTotals(cart: CartRecord): Promise<CartTotals> {
    const items: PricedCartItem[] = [];

    for (const line of cart.items) {
      const product = await repository.findProduct(cart.merchantId, line.productId);
      let available = Boolean(product && product.isActive);
      let unitPriceMinor = product?.priceMinor ?? 0n;
      let sku = product?.sku ?? null;
      const taxRateBp = product?.taxRateBp ?? 0;
      const productName = product?.name ?? "Producto no disponible";

      if (available && line.variantId) {
        const variant = await repository.findVariant(line.productId, line.variantId);

        if (!variant || !variant.isActive) {
          available = false;
        } else {
          if (variant.priceMinor !== null) unitPriceMinor = variant.priceMinor;
          sku = variant.sku ?? sku;
        }
      }

      if (!available) {
        items.push({
          id: line.id,
          productId: line.productId,
          variantId: line.variantId,
          productName,
          sku,
          quantity: line.quantity,
          available: false,
          unitPriceMinor: 0n,
          taxRateBp: 0,
          taxMinor: 0n,
          lineTotalMinor: 0n,
          notes: line.notes,
        });
        continue;
      }

      const quantity = new Prisma.Decimal(line.quantity);
      const grossMinor = roundMinor(new Prisma.Decimal(unitPriceMinor.toString()).times(quantity));
      const taxMinor = roundMinor(
        new Prisma.Decimal(grossMinor.toString()).times(taxRateBp).div(BASE_SCALE),
      );

      items.push({
        id: line.id,
        productId: line.productId,
        variantId: line.variantId,
        productName,
        sku,
        quantity: line.quantity,
        available: true,
        unitPriceMinor,
        taxRateBp,
        taxMinor,
        lineTotalMinor: grossMinor + taxMinor,
        notes: line.notes,
      });
    }

    const subtotalMinor = items.reduce(
      (sum, item) => sum + (item.available ? item.lineTotalMinor - item.taxMinor : 0n),
      0n,
    );
    const taxMinor = items.reduce((sum, item) => sum + item.taxMinor, 0n);

    let discountMinor = 0n;

    if (cart.discountType === "PERCENT" && cart.discountPercentBp !== null) {
      discountMinor = roundMinor(
        new Prisma.Decimal(subtotalMinor.toString()).times(cart.discountPercentBp).div(BASE_SCALE),
      );
    } else if (cart.discountType === "AMOUNT" && cart.discountAmountMinor !== null) {
      discountMinor = cart.discountAmountMinor;
    }

    // Salvaguarda de presentación: el preview nunca muestra un total negativo.
    // El checkout revalida de forma estricta en SaleService.createSale.
    const maxDiscount = subtotalMinor + taxMinor;
    if (discountMinor > maxDiscount) discountMinor = maxDiscount;

    return {
      items,
      subtotalMinor,
      discountMinor,
      taxMinor,
      totalMinor: subtotalMinor - discountMinor + taxMinor,
    };
  }

  async function present(cart: CartRecord): Promise<PublicCart> {
    return toPublicCart(cart, await computeTotals(cart));
  }

  function buildSaleInput(cart: CartRecord): SaleCreateInput {
    const discount: SaleCreateInput["discount"] =
      cart.discountType === "PERCENT" && cart.discountPercentBp !== null
        ? { type: "PERCENT", percentBp: cart.discountPercentBp }
        : cart.discountType === "AMOUNT" && cart.discountAmountMinor !== null
          ? { type: "AMOUNT", amount: cart.discountAmountMinor.toString() }
          : undefined;

    return {
      items: cart.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: Number(item.quantity),
      })),
      customerId: cart.customerId ?? undefined,
      discount,
      notes: cart.notes ?? undefined,
    };
  }

  return {
    async createCart(context, userId, input) {
      if (input.customerId) {
        await validateCustomer(context.merchantId, input.customerId);
      }

      const branchId = await resolveBranch(context.merchantId);
      const cart = await repository.createCart({
        merchantId: context.merchantId,
        branchId,
        createdByUserId: userId,
        customerId: input.customerId ?? null,
        notes: input.notes ?? null,
      });

      return present(cart);
    },

    async getCart(context, cartId) {
      return present(await loadCart(context, cartId));
    },

    async updateCart(context, cartId, input) {
      const cart = await loadCart(context, cartId);
      assertEditable(cart);

      const data: UpdateCartData = {};

      if (input.customerId !== undefined) {
        if (input.customerId !== null) {
          await validateCustomer(context.merchantId, input.customerId);
        }
        data.customerId = input.customerId;
      }

      if (input.notes !== undefined) {
        data.notes = input.notes;
      }

      if (input.discount !== undefined) {
        if (input.discount === null) {
          data.discountType = null;
          data.discountPercentBp = null;
          data.discountAmountMinor = null;
        } else if (input.discount.type === "PERCENT") {
          data.discountType = "PERCENT";
          data.discountPercentBp = input.discount.percentBp;
          data.discountAmountMinor = null;
        } else {
          data.discountType = "AMOUNT";
          data.discountPercentBp = null;
          data.discountAmountMinor = BigInt(input.discount.amount);
        }
      }

      const updated = await repository.updateCart(context.merchantId, cartId, data);

      if (!updated) {
        throw new AppError(404, "NOT_FOUND", "Carrito no encontrado");
      }

      return present(updated);
    },

    async deleteCart(context, cartId) {
      const cart = await loadCart(context, cartId);

      if (cart.status === "CHECKED_OUT") {
        throw new AppError(409, "CONFLICT", "El carrito ya fue confirmado y no se puede eliminar");
      }

      await repository.deleteCart(context.merchantId, cartId);
    },

    async addItem(context, cartId, input) {
      const cart = await loadCart(context, cartId);
      assertEditable(cart);

      const product = await loadActiveProduct(
        context.merchantId,
        input.productId,
        input.variantId ?? null,
      );

      // Moneda homogénea: el carrito no mezcla divisas.
      if (cart.items.length > 0 && product.currency !== cart.currency) {
        throw new AppError(
          422,
          "UNPROCESSABLE_ENTITY",
          "Los productos del carrito deben usar la misma moneda",
        );
      }

      const existing = await repository.findCartItem(
        cartId,
        input.productId,
        input.variantId ?? null,
      );

      if (existing) {
        const quantity = new Prisma.Decimal(existing.quantity)
          .plus(new Prisma.Decimal(String(input.quantity)))
          .toFixed(3);
        const updated = await repository.updateItem(cartId, existing.id, {
          quantity,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        });

        if (!updated) {
          throw new AppError(404, "NOT_FOUND", "Carrito no encontrado");
        }

        return present(updated);
      }

      const added: AddCartItemInput = {
        productId: input.productId,
        variantId: input.variantId ?? null,
        quantity: new Prisma.Decimal(String(input.quantity)).toFixed(3),
        notes: input.notes ?? null,
      };

      return present(await repository.addItem(cartId, added));
    },

    async updateItem(context, cartId, itemId, input) {
      const cart = await loadCart(context, cartId);
      assertEditable(cart);

      const updated = await repository.updateItem(cartId, itemId, {
        ...(input.quantity !== undefined
          ? { quantity: new Prisma.Decimal(String(input.quantity)).toFixed(3) }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      });

      if (!updated) {
        throw new AppError(404, "NOT_FOUND", "Ítem del carrito no encontrado");
      }

      return present(updated);
    },

    async removeItem(context, cartId, itemId) {
      const cart = await loadCart(context, cartId);
      assertEditable(cart);

      const updated = await repository.removeItem(cartId, itemId);

      if (!updated) {
        throw new AppError(404, "NOT_FOUND", "Ítem del carrito no encontrado");
      }

      return present(updated);
    },

    async checkout(context, userId, cartId) {
      const cart = await loadCart(context, cartId);

      // Checkout idempotente: si el carrito ya fue confirmado, devolvemos la
      // venta generada sin crear otra.
      if (cart.status === "CHECKED_OUT" && cart.checkoutSaleId) {
        return saleService.getSale(context, cart.checkoutSaleId);
      }

      if (cart.status !== "OPEN") {
        throw new AppError(409, "CONFLICT", "El carrito no se puede confirmar en su estado actual");
      }

      if (cart.items.length === 0) {
        throw new AppError(
          422,
          "UNPROCESSABLE_ENTITY",
          "El carrito no tiene productos para confirmar",
        );
      }

      const sale = await saleService.createSale(context, userId, buildSaleInput(cart), cart.id);
      await repository.markCheckedOut(context.merchantId, cartId, sale.id);

      return sale;
    },
  };
}
