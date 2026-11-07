import type { CartRecord, DiscountTypeValue } from "./cart.types.js";

export interface PricedCartItem {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  sku: string | null;
  quantity: string;
  available: boolean;
  unitPriceMinor: bigint;
  taxRateBp: number;
  taxMinor: bigint;
  lineTotalMinor: bigint;
  notes: string | null;
}

export interface CartTotals {
  items: PricedCartItem[];
  subtotalMinor: bigint;
  discountMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
}

export interface PublicCartItem {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  sku: string | null;
  quantity: number;
  available: boolean;
  unitPrice: string;
  taxRateBp: number;
  tax: string;
  lineTotal: string;
  notes: string | null;
}

export interface PublicCart {
  id: string;
  status: CartRecord["status"];
  currency: string;
  customerId: string | null;
  notes: string | null;
  discountType: DiscountTypeValue | null;
  discountPercentBp: number | null;
  items: PublicCartItem[];
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  checkoutSaleId: string | null;
  createdAt: string;
  updatedAt: string;
}

function toPublicCartItem(item: PricedCartItem): PublicCartItem {
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    productName: item.productName,
    sku: item.sku,
    quantity: Number(item.quantity),
    available: item.available,
    unitPrice: item.unitPriceMinor.toString(),
    taxRateBp: item.taxRateBp,
    tax: item.taxMinor.toString(),
    lineTotal: item.lineTotalMinor.toString(),
    notes: item.notes,
  };
}

export function toPublicCart(cart: CartRecord, totals: CartTotals): PublicCart {
  return {
    id: cart.id,
    status: cart.status,
    currency: cart.currency,
    customerId: cart.customerId,
    notes: cart.notes,
    discountType: cart.discountType,
    discountPercentBp: cart.discountPercentBp,
    items: totals.items.map(toPublicCartItem),
    subtotal: totals.subtotalMinor.toString(),
    discount: totals.discountMinor.toString(),
    tax: totals.taxMinor.toString(),
    total: totals.totalMinor.toString(),
    checkoutSaleId: cart.checkoutSaleId,
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
  };
}
