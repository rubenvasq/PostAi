import { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { MerchantContext } from "../merchant/merchant.types.js";
import { InsufficientStockError } from "./inventory.errors.js";
import {
  toPublicInventoryItem,
  toPublicInventoryMovement,
  type PublicInventoryItem,
  type PublicInventoryMovement,
} from "./inventory.mappers.js";
import type {
  inventoryAdjustmentSchema,
  inventoryListQuerySchema,
  inventoryMovementListQuerySchema,
} from "./inventory.schemas.js";
import type { InventoryRepository, PaginationMeta } from "./inventory.types.js";

type AdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;
type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;
type MovementListQuery = z.infer<typeof inventoryMovementListQuerySchema>;

function pagination(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export interface InventoryService {
  listInventory(
    context: MerchantContext,
    query: InventoryListQuery,
  ): Promise<{ data: PublicInventoryItem[]; meta: PaginationMeta }>;
  adjustInventory(
    context: MerchantContext,
    productId: string,
    input: AdjustmentInput,
    userId: string,
  ): Promise<PublicInventoryMovement>;
  listMovements(
    context: MerchantContext,
    query: MovementListQuery,
  ): Promise<{ data: PublicInventoryMovement[]; meta: PaginationMeta }>;
}

export function createInventoryService(repository: InventoryRepository): InventoryService {
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

  return {
    async listInventory(context, query) {
      const branchId = await resolveBranch(context.merchantId);
      const { data, total } = await repository.listInventory(context.merchantId, branchId, {
        search: query.search,
        lowStock: query.lowStock,
        page: query.page,
        pageSize: query.pageSize,
      });

      return {
        data: data.map(toPublicInventoryItem),
        meta: pagination(query.page, query.pageSize, total),
      };
    },

    async adjustInventory(context, productId, input, userId) {
      const product = await repository.findProduct(context.merchantId, productId);

      if (!product) {
        throw new AppError(404, "NOT_FOUND", "Producto no encontrado");
      }

      if (!product.trackInventory || product.type === "SERVICE") {
        throw new AppError(422, "UNPROCESSABLE_ENTITY", "El producto no controla inventario");
      }

      const branchId = await resolveBranch(context.merchantId);

      try {
        const movement = await repository.adjustInventory(context.merchantId, branchId, productId, {
          quantityDelta: String(input.quantityDelta),
          reason: input.reason,
          createdByUserId: userId,
        });

        return toPublicInventoryMovement(movement);
      } catch (error) {
        if (error instanceof InsufficientStockError) {
          throw new AppError(422, "UNPROCESSABLE_ENTITY", "Stock insuficiente para el ajuste");
        }
        throw error;
      }
    },

    async listMovements(context, query) {
      const { data, total } = await repository.listMovements(context.merchantId, {
        productId: query.productId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        page: query.page,
        pageSize: query.pageSize,
      });

      return {
        data: data.map(toPublicInventoryMovement),
        meta: pagination(query.page, query.pageSize, total),
      };
    },
  };
}
