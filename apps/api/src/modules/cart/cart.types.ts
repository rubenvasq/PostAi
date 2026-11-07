export type CartStatusValue = "OPEN" | "CHECKED_OUT" | "ABANDONED";

export type DiscountTypeValue = "PERCENT" | "AMOUNT";

export interface BranchRecord {
  id: string;
}

export interface CartProductRecord {
  id: string;
  name: string;
  sku: string | null;
  priceMinor: bigint;
  currency: string;
  type: "PRODUCT" | "SERVICE";
  trackInventory: boolean;
  isActive: boolean;
  taxRateBp: number | null;
}

export interface CartVariantRecord {
  id: string;
  productId: string;
  sku: string | null;
  priceMinor: bigint | null;
  isActive: boolean;
}

export interface CartItemRecord {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: string;
  notes: string | null;
  createdAt: Date;
}

export interface CartRecord {
  id: string;
  merchantId: string;
  branchId: string;
  createdByUserId: string;
  customerId: string | null;
  status: CartStatusValue;
  currency: string;
  discountType: DiscountTypeValue | null;
  discountPercentBp: number | null;
  discountAmountMinor: bigint | null;
  notes: string | null;
  checkoutSaleId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: CartItemRecord[];
}

export interface CreateCartInput {
  merchantId: string;
  branchId: string;
  createdByUserId: string;
  customerId: string | null;
  notes: string | null;
}

export interface UpdateCartData {
  customerId?: string | null;
  notes?: string | null;
  discountType?: DiscountTypeValue | null;
  discountPercentBp?: number | null;
  discountAmountMinor?: bigint | null;
}

export interface AddCartItemInput {
  productId: string;
  variantId: string | null;
  quantity: string;
  notes: string | null;
}

export interface CartRepository {
  findBranch(merchantId: string): Promise<BranchRecord | null>;
  customerExists(merchantId: string, customerId: string): Promise<boolean>;
  findProduct(merchantId: string, productId: string): Promise<CartProductRecord | null>;
  findVariant(productId: string, variantId: string): Promise<CartVariantRecord | null>;
  createCart(input: CreateCartInput): Promise<CartRecord>;
  findCart(merchantId: string, cartId: string): Promise<CartRecord | null>;
  updateCart(merchantId: string, cartId: string, data: UpdateCartData): Promise<CartRecord | null>;
  deleteCart(merchantId: string, cartId: string): Promise<boolean>;
  findCartItem(
    cartId: string,
    productId: string,
    variantId: string | null,
  ): Promise<CartItemRecord | null>;
  addItem(cartId: string, input: AddCartItemInput): Promise<CartRecord>;
  updateItem(
    cartId: string,
    itemId: string,
    data: { quantity?: string; notes?: string | null },
  ): Promise<CartRecord | null>;
  removeItem(cartId: string, itemId: string): Promise<CartRecord | null>;
  markCheckedOut(merchantId: string, cartId: string, saleId: string): Promise<CartRecord | null>;
}
