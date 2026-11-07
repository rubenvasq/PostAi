export type ProductTypeValue = "PRODUCT" | "SERVICE";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

export interface CategoryRecord {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Impuestos
// ---------------------------------------------------------------------------

export interface TaxRateRecord {
  id: string;
  name: string;
  rateBp: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface CreateTaxRateInput {
  name: string;
  rateBp: number;
  isDefault?: boolean;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export interface ProductRecord {
  id: string;
  type: ProductTypeValue;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  categoryId: string | null;
  taxRateId: string | null;
  priceMinor: bigint;
  currency: string;
  trackInventory: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductInput {
  type?: ProductTypeValue;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  taxRateId?: string;
  priceMinor: bigint;
  trackInventory?: boolean;
  isActive?: boolean;
}

export interface UpdateProductInput {
  type?: ProductTypeValue;
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryId?: string | null;
  taxRateId?: string | null;
  priceMinor?: bigint;
  trackInventory?: boolean;
  isActive?: boolean;
}

export interface ListProductsParams {
  search?: string;
  categoryId?: string;
  active?: boolean;
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface CatalogRepository {
  // Categorías
  listCategories(merchantId: string, active?: boolean): Promise<CategoryRecord[]>;
  createCategory(merchantId: string, data: CreateCategoryInput): Promise<CategoryRecord>;
  updateCategory(
    merchantId: string,
    categoryId: string,
    data: UpdateCategoryInput,
  ): Promise<CategoryRecord | null>;
  deactivateCategory(merchantId: string, categoryId: string): Promise<boolean>;

  // Impuestos
  listTaxRates(merchantId: string): Promise<TaxRateRecord[]>;
  createTaxRate(merchantId: string, data: CreateTaxRateInput): Promise<TaxRateRecord>;

  // Productos
  listProducts(merchantId: string, params: ListProductsParams): Promise<Paginated<ProductRecord>>;
  findProduct(merchantId: string, productId: string): Promise<ProductRecord | null>;
  createProduct(merchantId: string, data: CreateProductInput): Promise<ProductRecord>;
  updateProduct(
    merchantId: string,
    productId: string,
    data: UpdateProductInput,
  ): Promise<ProductRecord | null>;
  deactivateProduct(merchantId: string, productId: string): Promise<boolean>;

  // Validaciones de pertenencia
  categoryExists(merchantId: string, categoryId: string): Promise<boolean>;
  taxRateExists(merchantId: string, taxRateId: string): Promise<boolean>;
}
