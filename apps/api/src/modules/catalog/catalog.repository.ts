import { Prisma, type PrismaClient } from "@prisma/client";
import { UniqueConstraintError } from "./catalog.errors.js";
import type {
  CatalogRepository,
  CategoryRecord,
  CreateCategoryInput,
  CreateProductInput,
  CreateTaxRateInput,
  ListProductsParams,
  Paginated,
  ProductRecord,
  TaxRateRecord,
  UpdateCategoryInput,
  UpdateProductInput,
} from "./catalog.types.js";

const CATEGORY_SELECT = {
  id: true,
  name: true,
  color: true,
  sortOrder: true,
  isActive: true,
} as const;

const TAX_RATE_SELECT = {
  id: true,
  name: true,
  rateBp: true,
  isDefault: true,
  isActive: true,
} as const;

function uniqueField(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return null;
  }
  const target = JSON.stringify(error.meta?.target ?? "");
  if (target.includes("barcode")) return "barcode";
  if (target.includes("sku")) return "sku";
  return "name";
}

function rethrowUnique(error: unknown): never {
  const field = uniqueField(error);
  if (field) {
    throw new UniqueConstraintError(field);
  }
  throw error;
}

export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly db: PrismaClient) {}

  // -- Categorías -----------------------------------------------------------

  listCategories(merchantId: string, active?: boolean): Promise<CategoryRecord[]> {
    return this.db.category.findMany({
      where: { merchantId, ...(active === undefined ? {} : { isActive: active }) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: CATEGORY_SELECT,
    });
  }

  async createCategory(merchantId: string, data: CreateCategoryInput): Promise<CategoryRecord> {
    try {
      return await this.db.category.create({
        data: { merchantId, ...data },
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      rethrowUnique(error);
    }
  }

  async updateCategory(
    merchantId: string,
    categoryId: string,
    data: UpdateCategoryInput,
  ): Promise<CategoryRecord | null> {
    const existing = await this.db.category.findFirst({
      where: { id: categoryId, merchantId },
      select: { id: true },
    });
    if (!existing) return null;

    try {
      return await this.db.category.update({
        where: { id: categoryId },
        data,
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      rethrowUnique(error);
    }
  }

  async deactivateCategory(merchantId: string, categoryId: string): Promise<boolean> {
    const result = await this.db.category.updateMany({
      where: { id: categoryId, merchantId },
      data: { isActive: false },
    });
    return result.count > 0;
  }

  // -- Impuestos ------------------------------------------------------------

  listTaxRates(merchantId: string): Promise<TaxRateRecord[]> {
    return this.db.taxRate.findMany({
      where: { merchantId },
      orderBy: { name: "asc" },
      select: TAX_RATE_SELECT,
    });
  }

  async createTaxRate(merchantId: string, data: CreateTaxRateInput): Promise<TaxRateRecord> {
    try {
      return await this.db.$transaction(async (tx) => {
        if (data.isDefault) {
          await tx.taxRate.updateMany({
            where: { merchantId, isDefault: true },
            data: { isDefault: false },
          });
        }
        return tx.taxRate.create({
          data: { merchantId, ...data },
          select: TAX_RATE_SELECT,
        });
      });
    } catch (error) {
      rethrowUnique(error);
    }
  }

  // -- Productos ------------------------------------------------------------

  async listProducts(
    merchantId: string,
    params: ListProductsParams,
  ): Promise<Paginated<ProductRecord>> {
    const where: Prisma.ProductWhereInput = {
      merchantId,
      ...(params.active === undefined ? {} : { isActive: params.active }),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { sku: { contains: params.search, mode: "insensitive" } },
              { barcode: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.db.$transaction([
      this.db.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.db.product.count({ where }),
    ]);

    return { data, total };
  }

  findProduct(merchantId: string, productId: string): Promise<ProductRecord | null> {
    return this.db.product.findFirst({ where: { id: productId, merchantId } });
  }

  async createProduct(merchantId: string, data: CreateProductInput): Promise<ProductRecord> {
    try {
      return await this.db.product.create({ data: { merchantId, ...data } });
    } catch (error) {
      rethrowUnique(error);
    }
  }

  async updateProduct(
    merchantId: string,
    productId: string,
    data: UpdateProductInput,
  ): Promise<ProductRecord | null> {
    const existing = await this.db.product.findFirst({
      where: { id: productId, merchantId },
      select: { id: true },
    });
    if (!existing) return null;

    try {
      return await this.db.product.update({ where: { id: productId }, data });
    } catch (error) {
      rethrowUnique(error);
    }
  }

  async deactivateProduct(merchantId: string, productId: string): Promise<boolean> {
    const result = await this.db.product.updateMany({
      where: { id: productId, merchantId },
      data: { isActive: false },
    });
    return result.count > 0;
  }

  // -- Validaciones de pertenencia -----------------------------------------

  async categoryExists(merchantId: string, categoryId: string): Promise<boolean> {
    const found = await this.db.category.findFirst({
      where: { id: categoryId, merchantId },
      select: { id: true },
    });
    return found !== null;
  }

  async taxRateExists(merchantId: string, taxRateId: string): Promise<boolean> {
    const found = await this.db.taxRate.findFirst({
      where: { id: taxRateId, merchantId },
      select: { id: true },
    });
    return found !== null;
  }
}
