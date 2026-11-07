import type {
  InventoryItemRecord,
  InventoryMovementRecord,
  InventoryMovementTypeValue,
} from "./inventory.types.js";

export interface PublicInventoryItem {
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  lowStockThreshold: number | null;
  updatedAt: string;
}

export interface PublicInventoryMovement {
  id: string;
  productId: string;
  type: InventoryMovementTypeValue;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export function toPublicInventoryItem(item: InventoryItemRecord): PublicInventoryItem {
  return {
    productId: item.productId,
    productName: item.productName,
    sku: item.sku,
    quantity: Number(item.quantity),
    lowStockThreshold: item.lowStockThreshold === null ? null : Number(item.lowStockThreshold),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toPublicInventoryMovement(
  movement: InventoryMovementRecord,
): PublicInventoryMovement {
  return {
    id: movement.id,
    productId: movement.productId,
    type: movement.type,
    quantityDelta: Number(movement.quantityDelta),
    previousQuantity: Number(movement.previousQuantity),
    newQuantity: Number(movement.newQuantity),
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    reason: movement.reason,
    createdByUserId: movement.createdByUserId,
    createdAt: movement.createdAt.toISOString(),
  };
}
