import type { CategoryRecord, ProductRecord, TaxRateRecord } from "./catalog.types.js";

export interface PublicCategory {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface PublicTaxRate {
  id: string;
  name: string;
  rateBp: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface PublicProduct {
  id: string;
  type: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  categoryId: string | null;
  taxRateId: string | null;
  price: string;
  currency: string;
  trackInventory: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toPublicCategory(category: CategoryRecord): PublicCategory {
  return { ...category };
}

export function toPublicTaxRate(taxRate: TaxRateRecord): PublicTaxRate {
  return { ...taxRate };
}

export function toPublicProduct(product: ProductRecord): PublicProduct {
  return {
    id: product.id,
    type: product.type,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    description: product.description,
    categoryId: product.categoryId,
    taxRateId: product.taxRateId,
    price: product.priceMinor.toString(),
    currency: product.currency,
    trackInventory: product.trackInventory,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
