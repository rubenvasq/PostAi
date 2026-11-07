export type InventoryMovementTypeValue =
  "INITIAL" | "PURCHASE" | "SALE" | "RETURN" | "ADJUSTMENT" | "LOSS";

export interface InventoryItemRecord {
  productId: string;
  productName: string;
  sku: string | null;
  quantity: string;
  lowStockThreshold: string | null;
  updatedAt: Date;
}

export interface InventoryMovementRecord {
  id: string;
  productId: string;
  type: InventoryMovementTypeValue;
  quantityDelta: string;
  previousQuantity: string;
  newQuantity: string;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: Date;
}

export interface InventoryProductRecord {
  id: string;
  name: string;
  sku: string | null;
  type: "PRODUCT" | "SERVICE";
  trackInventory: boolean;
}

export interface InventoryBranchRecord {
  id: string;
}

export interface ListInventoryParams {
  search?: string;
  lowStock?: boolean;
  page: number;
  pageSize: number;
}

export interface ListMovementsParams {
  productId?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export interface AdjustInventoryInput {
  quantityDelta: string;
  reason: string;
  createdByUserId: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface InventoryRepository {
  findBranch(merchantId: string): Promise<InventoryBranchRecord | null>;
  listInventory(
    merchantId: string,
    branchId: string,
    params: ListInventoryParams,
  ): Promise<Paginated<InventoryItemRecord>>;
  findProduct(merchantId: string, productId: string): Promise<InventoryProductRecord | null>;
  adjustInventory(
    merchantId: string,
    branchId: string,
    productId: string,
    input: AdjustInventoryInput,
  ): Promise<InventoryMovementRecord>;
  listMovements(
    merchantId: string,
    params: ListMovementsParams,
  ): Promise<Paginated<InventoryMovementRecord>>;
}
