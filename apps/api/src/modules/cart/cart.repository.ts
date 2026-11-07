import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  AddCartItemInput,
  BranchRecord,
  CartItemRecord,
  CartProductRecord,
  CartRecord,
  CartRepository,
  CartStatusValue,
  CreateCartInput,
  DiscountTypeValue,
  UpdateCartData,
  CartVariantRecord,
} from "./cart.types.js";

const CART_SELECT = {
  id: true,
  merchantId: true,
  branchId: true,
  createdByUserId: true,
  customerId: true,
  status: true,
  currency: true,
  discountType: true,
  discountPercentBp: true,
  discountAmountMinor: true,
  notes: true,
  checkoutSaleId: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      productId: true,
      variantId: true,
      quantity: true,
      notes: true,
      createdAt: true,
    },
  },
} as const;

type CartRow = Prisma.CartGetPayload<{ select: typeof CART_SELECT }>;

function toCartItemRecord(row: CartRow["items"][number]): CartItemRecord {
  return {
    id: row.id,
    productId: row.productId,
    variantId: row.variantId,
    quantity: row.quantity.toString(),
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

function toCartRecord(row: CartRow): CartRecord {
  return {
    id: row.id,
    merchantId: row.merchantId,
    branchId: row.branchId,
    createdByUserId: row.createdByUserId,
    customerId: row.customerId,
    status: row.status as CartStatusValue,
    currency: row.currency,
    discountType: (row.discountType as DiscountTypeValue | null) ?? null,
    discountPercentBp: row.discountPercentBp,
    discountAmountMinor: row.discountAmountMinor,
    notes: row.notes,
    checkoutSaleId: row.checkoutSaleId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: row.items.map(toCartItemRecord),
  };
}

export class PrismaCartRepository implements CartRepository {
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

  async customerExists(merchantId: string, customerId: string): Promise<boolean> {
    const count = await this.db.customer.count({ where: { id: customerId, merchantId } });
    return count > 0;
  }

  async findProduct(merchantId: string, productId: string): Promise<CartProductRecord | null> {
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

  findVariant(productId: string, variantId: string): Promise<CartVariantRecord | null> {
    return this.db.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true, productId: true, sku: true, priceMinor: true, isActive: true },
    });
  }

  async createCart(input: CreateCartInput): Promise<CartRecord> {
    const cart = await this.db.cart.create({
      data: {
        merchantId: input.merchantId,
        branchId: input.branchId,
        createdByUserId: input.createdByUserId,
        customerId: input.customerId,
        notes: input.notes,
      },
      select: CART_SELECT,
    });

    return toCartRecord(cart);
  }

  async findCart(merchantId: string, cartId: string): Promise<CartRecord | null> {
    const cart = await this.db.cart.findFirst({
      where: { id: cartId, merchantId },
      select: CART_SELECT,
    });

    return cart ? toCartRecord(cart) : null;
  }

  async updateCart(
    merchantId: string,
    cartId: string,
    data: UpdateCartData,
  ): Promise<CartRecord | null> {
    const result = await this.db.cart.updateMany({
      where: { id: cartId, merchantId },
      data: {
        ...(data.customerId !== undefined ? { customerId: data.customerId } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.discountType !== undefined ? { discountType: data.discountType } : {}),
        ...(data.discountPercentBp !== undefined
          ? { discountPercentBp: data.discountPercentBp }
          : {}),
        ...(data.discountAmountMinor !== undefined
          ? { discountAmountMinor: data.discountAmountMinor }
          : {}),
      },
    });

    if (result.count === 0) return null;

    return this.findCart(merchantId, cartId);
  }

  async deleteCart(merchantId: string, cartId: string): Promise<boolean> {
    const result = await this.db.cart.deleteMany({ where: { id: cartId, merchantId } });
    return result.count > 0;
  }

  async findCartItem(
    cartId: string,
    productId: string,
    variantId: string | null,
  ): Promise<CartItemRecord | null> {
    const item = await this.db.cartItem.findFirst({
      where: { cartId, productId, variantId },
      select: {
        id: true,
        productId: true,
        variantId: true,
        quantity: true,
        notes: true,
        createdAt: true,
      },
    });

    return item ? toCartItemRecord(item) : null;
  }

  async addItem(cartId: string, input: AddCartItemInput): Promise<CartRecord> {
    const cart = await this.db.cart.update({
      where: { id: cartId },
      data: {
        items: {
          create: {
            productId: input.productId,
            variantId: input.variantId,
            quantity: new Prisma.Decimal(input.quantity),
            notes: input.notes,
          },
        },
      },
      select: CART_SELECT,
    });

    return toCartRecord(cart);
  }

  async updateItem(
    cartId: string,
    itemId: string,
    data: { quantity?: string; notes?: string | null },
  ): Promise<CartRecord | null> {
    const result = await this.db.cartItem.updateMany({
      where: { id: itemId, cartId },
      data: {
        ...(data.quantity !== undefined ? { quantity: new Prisma.Decimal(data.quantity) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    if (result.count === 0) return null;

    const cart = await this.db.cart.findUnique({ where: { id: cartId }, select: CART_SELECT });
    return cart ? toCartRecord(cart) : null;
  }

  async removeItem(cartId: string, itemId: string): Promise<CartRecord | null> {
    const result = await this.db.cartItem.deleteMany({ where: { id: itemId, cartId } });

    if (result.count === 0) return null;

    const cart = await this.db.cart.findUnique({ where: { id: cartId }, select: CART_SELECT });
    return cart ? toCartRecord(cart) : null;
  }

  async markCheckedOut(
    merchantId: string,
    cartId: string,
    saleId: string,
  ): Promise<CartRecord | null> {
    const result = await this.db.cart.updateMany({
      where: { id: cartId, merchantId, status: "OPEN" },
      data: { status: "CHECKED_OUT", checkoutSaleId: saleId },
    });

    if (result.count === 0) return this.findCart(merchantId, cartId);

    return this.findCart(merchantId, cartId);
  }
}
