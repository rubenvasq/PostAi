import { Prisma, type PrismaClient } from "@prisma/client";
import { InsufficientStockError } from "./inventory.errors.js";
import type {
  AdjustInventoryInput,
  InventoryBranchRecord,
  InventoryItemRecord,
  InventoryMovementRecord,
  InventoryMovementTypeValue,
  InventoryProductRecord,
  InventoryRepository,
  ListInventoryParams,
  ListMovementsParams,
  Paginated,
} from "./inventory.types.js";

const MOVEMENT_SELECT = {
  id: true,
  inventoryItem: { select: { productId: true } },
  type: true,
  quantityDelta: true,
  previousQuantity: true,
  newQuantity: true,
  referenceType: true,
  referenceId: true,
  reason: true,
  createdByUserId: true,
  createdAt: true,
} as const;

type MovementRow = Prisma.InventoryMovementGetPayload<{ select: typeof MOVEMENT_SELECT }>;

function toMovementRecord(row: MovementRow): InventoryMovementRecord {
  return {
    id: row.id,
    productId: row.inventoryItem.productId,
    type: row.type as InventoryMovementTypeValue,
    quantityDelta: row.quantityDelta.toString(),
    previousQuantity: row.previousQuantity.toString(),
    newQuantity: row.newQuantity.toString(),
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    reason: row.reason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
  };
}

function isSerializationFailure(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly db: PrismaClient) {}

  async findBranch(merchantId: string): Promise<InventoryBranchRecord | null> {
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

  async listInventory(
    merchantId: string,
    branchId: string,
    params: ListInventoryParams,
  ): Promise<Paginated<InventoryItemRecord>> {
    const products = await this.db.product.findMany({
      where: {
        merchantId,
        trackInventory: true,
        type: "PRODUCT",
        ...(params.search
          ? {
              OR: [
                { name: { contains: params.search, mode: "insensitive" } },
                { sku: { contains: params.search, mode: "insensitive" } },
                { barcode: { contains: params.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        updatedAt: true,
        inventoryItems: {
          where: { branchId },
          take: 1,
          select: { quantity: true, lowStockThreshold: true, updatedAt: true },
        },
      },
    });

    const records: InventoryItemRecord[] = products.map((product) => {
      const item = product.inventoryItems[0];

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: item?.quantity.toString() ?? "0",
        lowStockThreshold: item?.lowStockThreshold?.toString() ?? null,
        updatedAt: item?.updatedAt ?? product.updatedAt,
      };
    });

    const filtered = params.lowStock
      ? records.filter(
          (record) =>
            record.lowStockThreshold !== null &&
            Number(record.quantity) <= Number(record.lowStockThreshold),
        )
      : records;

    const start = (params.page - 1) * params.pageSize;

    return {
      data: filtered.slice(start, start + params.pageSize),
      total: filtered.length,
    };
  }

  findProduct(merchantId: string, productId: string): Promise<InventoryProductRecord | null> {
    return this.db.product.findFirst({
      where: { id: productId, merchantId },
      select: { id: true, name: true, sku: true, type: true, trackInventory: true },
    });
  }

  async adjustInventory(
    merchantId: string,
    branchId: string,
    productId: string,
    input: AdjustInventoryInput,
  ): Promise<InventoryMovementRecord> {
    const delta = new Prisma.Decimal(input.quantityDelta);

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.db.$transaction(
          async (tx) => {
            const existing = await tx.inventoryItem.findUnique({
              where: { branchId_productId: { branchId, productId } },
            });

            let previous: Prisma.Decimal;
            let item;

            if (!existing) {
              if (delta.isNegative()) {
                throw new InsufficientStockError();
              }

              previous = new Prisma.Decimal(0);
              item = await tx.inventoryItem.create({
                data: { merchantId, branchId, productId, quantity: delta },
              });
            } else {
              const next = existing.quantity.plus(delta);

              if (next.isNegative()) {
                throw new InsufficientStockError();
              }

              previous = existing.quantity;
              item = await tx.inventoryItem.update({
                where: { id: existing.id },
                data: { quantity: next },
              });
            }

            const movement = await tx.inventoryMovement.create({
              data: {
                merchantId,
                branchId,
                inventoryItemId: item.id,
                type: "ADJUSTMENT",
                quantityDelta: delta,
                previousQuantity: previous,
                newQuantity: item.quantity,
                reason: input.reason,
                createdByUserId: input.createdByUserId,
              },
              select: MOVEMENT_SELECT,
            });

            return toMovementRecord(movement);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (isSerializationFailure(error) && attempt < 2) {
          continue;
        }
        throw error;
      }
    }
  }

  async listMovements(
    merchantId: string,
    params: ListMovementsParams,
  ): Promise<Paginated<InventoryMovementRecord>> {
    const createdAt =
      params.from || params.to
        ? {
            ...(params.from ? { gte: params.from } : {}),
            ...(params.to ? { lte: params.to } : {}),
          }
        : undefined;

    const where: Prisma.InventoryMovementWhereInput = {
      merchantId,
      ...(params.productId ? { inventoryItem: { productId: params.productId } } : {}),
      ...(createdAt ? { createdAt } : {}),
    };

    const [data, total] = await this.db.$transaction([
      this.db.inventoryMovement.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: MOVEMENT_SELECT,
      }),
      this.db.inventoryMovement.count({ where }),
    ]);

    return { data: data.map(toMovementRecord), total };
  }
}
