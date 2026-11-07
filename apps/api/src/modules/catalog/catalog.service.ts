import { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { MerchantContext } from "../merchant/merchant.types.js";
import { UniqueConstraintError } from "./catalog.errors.js";
import {
  toPublicCategory,
  toPublicProduct,
  toPublicTaxRate,
  type PublicCategory,
  type PublicProduct,
  type PublicTaxRate,
} from "./catalog.mappers.js";
import type {
  categoryCreateSchema,
  categoryUpdateSchema,
  productCreateSchema,
  productListQuerySchema,
  productUpdateSchema,
  taxRateCreateSchema,
} from "./catalog.schemas.js";
import type { CatalogRepository, PaginationMeta } from "./catalog.types.js";

type CategoryCreate = z.infer<typeof categoryCreateSchema>;
type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
type TaxRateCreate = z.infer<typeof taxRateCreateSchema>;
type ProductCreate = z.infer<typeof productCreateSchema>;
type ProductUpdate = z.infer<typeof productUpdateSchema>;
type ProductListQuery = z.infer<typeof productListQuerySchema>;

const CONFLICT_MESSAGES: Record<string, string> = {
  name: "Ya existe un registro con ese nombre",
  sku: "Ya existe un producto con ese SKU",
  barcode: "Ya existe un producto con ese código de barras",
};

function toConflict(error: unknown): never {
  if (error instanceof UniqueConstraintError) {
    throw new AppError(409, "CONFLICT", CONFLICT_MESSAGES[error.field] ?? "Valor duplicado");
  }
  throw error;
}

export interface CatalogService {
  listCategories(context: MerchantContext, active?: boolean): Promise<PublicCategory[]>;
  createCategory(context: MerchantContext, input: CategoryCreate): Promise<PublicCategory>;
  updateCategory(
    context: MerchantContext,
    categoryId: string,
    input: CategoryUpdate,
  ): Promise<PublicCategory>;
  deactivateCategory(context: MerchantContext, categoryId: string): Promise<void>;

  listTaxRates(context: MerchantContext): Promise<PublicTaxRate[]>;
  createTaxRate(context: MerchantContext, input: TaxRateCreate): Promise<PublicTaxRate>;

  listProducts(
    context: MerchantContext,
    query: ProductListQuery,
  ): Promise<{ data: PublicProduct[]; meta: PaginationMeta }>;
  getProduct(context: MerchantContext, productId: string): Promise<PublicProduct>;
  createProduct(context: MerchantContext, input: ProductCreate): Promise<PublicProduct>;
  updateProduct(
    context: MerchantContext,
    productId: string,
    input: ProductUpdate,
  ): Promise<PublicProduct>;
  deactivateProduct(context: MerchantContext, productId: string): Promise<void>;
}

export function createCatalogService(repository: CatalogRepository): CatalogService {
  async function assertCategory(merchantId: string, categoryId: string): Promise<void> {
    if (!(await repository.categoryExists(merchantId, categoryId))) {
      throw new AppError(422, "UNPROCESSABLE_ENTITY", "La categoría indicada no existe");
    }
  }

  async function assertTaxRate(merchantId: string, taxRateId: string): Promise<void> {
    if (!(await repository.taxRateExists(merchantId, taxRateId))) {
      throw new AppError(422, "UNPROCESSABLE_ENTITY", "El impuesto indicado no existe");
    }
  }

  return {
    // -- Categorías ---------------------------------------------------------

    async listCategories(context, active) {
      const categories = await repository.listCategories(context.merchantId, active);
      return categories.map(toPublicCategory);
    },

    async createCategory(context, input) {
      try {
        const category = await repository.createCategory(context.merchantId, input);
        return toPublicCategory(category);
      } catch (error) {
        toConflict(error);
      }
    },

    async updateCategory(context, categoryId, input) {
      try {
        const category = await repository.updateCategory(context.merchantId, categoryId, input);
        if (!category) {
          throw new AppError(404, "NOT_FOUND", "Categoría no encontrada");
        }
        return toPublicCategory(category);
      } catch (error) {
        toConflict(error);
      }
    },

    async deactivateCategory(context, categoryId) {
      const ok = await repository.deactivateCategory(context.merchantId, categoryId);
      if (!ok) {
        throw new AppError(404, "NOT_FOUND", "Categoría no encontrada");
      }
    },

    // -- Impuestos ----------------------------------------------------------

    async listTaxRates(context) {
      const taxRates = await repository.listTaxRates(context.merchantId);
      return taxRates.map(toPublicTaxRate);
    },

    async createTaxRate(context, input) {
      try {
        const taxRate = await repository.createTaxRate(context.merchantId, input);
        return toPublicTaxRate(taxRate);
      } catch (error) {
        toConflict(error);
      }
    },

    // -- Productos ----------------------------------------------------------

    async listProducts(context, query) {
      const { data, total } = await repository.listProducts(context.merchantId, {
        search: query.search,
        categoryId: query.categoryId,
        active: query.active,
        page: query.page,
        pageSize: query.pageSize,
      });

      return {
        data: data.map(toPublicProduct),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
      };
    },

    async getProduct(context, productId) {
      const product = await repository.findProduct(context.merchantId, productId);
      if (!product) {
        throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
      }
      return toPublicProduct(product);
    },

    async createProduct(context, input) {
      if (input.categoryId) await assertCategory(context.merchantId, input.categoryId);
      if (input.taxRateId) await assertTaxRate(context.merchantId, input.taxRateId);

      try {
        const product = await repository.createProduct(context.merchantId, {
          type: input.type,
          name: input.name,
          sku: input.sku,
          barcode: input.barcode,
          description: input.description,
          categoryId: input.categoryId,
          taxRateId: input.taxRateId,
          priceMinor: BigInt(input.price),
          trackInventory: input.type === "SERVICE" ? false : input.trackInventory,
          isActive: input.isActive,
        });
        return toPublicProduct(product);
      } catch (error) {
        toConflict(error);
      }
    },

    async updateProduct(context, productId, input) {
      if (input.categoryId) await assertCategory(context.merchantId, input.categoryId);
      if (input.taxRateId) await assertTaxRate(context.merchantId, input.taxRateId);

      try {
        const product = await repository.updateProduct(context.merchantId, productId, {
          type: input.type,
          name: input.name,
          sku: input.sku,
          barcode: input.barcode,
          description: input.description,
          categoryId: input.categoryId,
          taxRateId: input.taxRateId,
          priceMinor: input.price === undefined ? undefined : BigInt(input.price),
          trackInventory: input.type === "SERVICE" ? false : input.trackInventory,
          isActive: input.isActive,
        });
        if (!product) {
          throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
        }
        return toPublicProduct(product);
      } catch (error) {
        toConflict(error);
      }
    },

    async deactivateProduct(context, productId) {
      const ok = await repository.deactivateProduct(context.merchantId, productId);
      if (!ok) {
        throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
      }
    },
  };
}
