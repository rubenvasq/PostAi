export type SaleStatusValue =
  "DRAFT" | "PENDING_PAYMENT" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "CANCELLED";

export type PaymentStatusValue =
  | "CREATED"
  | "PENDING"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

export type PaymentMethodTypeValue =
  "CASH" | "TRANSFER" | "CARD_SOFTPOS" | "CARD_SIMULATED" | "OTHER";

export type RefundStatusValue =
  "CREATED" | "PENDING" | "PROCESSING" | "APPROVED" | "REJECTED" | "CANCELLED";

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

export interface BranchRecord {
  id: string;
}

export interface SaleProductRecord {
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

export interface SaleVariantRecord {
  id: string;
  productId: string;
  sku: string | null;
  priceMinor: bigint | null;
  isActive: boolean;
}

export interface ComputedSaleItem {
  productId: string;
  variantId: string | null;
  productName: string;
  sku: string | null;
  quantity: string;
  unitPriceMinor: bigint;
  grossMinor: bigint;
  taxRateBp: number;
  taxMinor: bigint;
  lineTotalMinor: bigint;
  trackInventory: boolean;
  productType: "PRODUCT" | "SERVICE";
}

export interface SaleItemRecord {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  sku: string | null;
  quantity: string;
  unitPriceMinor: bigint;
  discountMinor: bigint;
  taxRateBp: number;
  taxMinor: bigint;
  lineTotalMinor: bigint;
}

export interface PaymentMethodRecord {
  id: string;
  code: string;
  name: string;
  type: PaymentMethodTypeValue;
  isSimulated: boolean;
  requiresProvider: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface PaymentRecord {
  id: string;
  saleId: string;
  methodCode: string;
  methodType: PaymentMethodTypeValue;
  status: PaymentStatusValue;
  amountMinor: bigint;
  currency: string;
  isSimulated: boolean;
  providerPaymentId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  notes: string | null;
  refundedMinor: bigint;
  approvedAt: Date | null;
  createdAt: Date;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  status: RefundStatusValue;
  amountMinor: bigint;
  currency: string;
  reason: string | null;
  providerRefundId: string | null;
  approvedAt: Date | null;
  createdAt: Date;
}

export interface SaleRecord {
  id: string;
  merchantId: string;
  branchId: string;
  sellerUserId: string;
  customerId: string | null;
  status: SaleStatusValue;
  currency: string;
  subtotalMinor: bigint;
  discountMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
  refundedMinor: bigint;
  receiptNumber: string | null;
  idempotencyKey: string | null;
  notes: string | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  items: SaleItemRecord[];
  payments: PaymentRecord[];
}

export interface ReceiptContext {
  merchant: { name: string; legalName: string | null; taxId: string | null };
  branch: { name: string; address: string | null };
}

export interface SaleDiscountInput {
  type: "PERCENT" | "AMOUNT";
  percentBp: number | null;
  amountMinor: bigint;
}

export interface CreateSaleInput {
  merchantId: string;
  branchId: string;
  sellerUserId: string;
  customerId: string | null;
  currency: string;
  subtotalMinor: bigint;
  discountMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
  notes: string | null;
  idempotencyKey: string;
  items: ComputedSaleItem[];
  discount: SaleDiscountInput | null;
}

export interface ListSalesParams {
  from?: Date;
  to?: Date;
  status?: SaleStatusValue;
  customerId?: string;
  page: number;
  pageSize: number;
}

export interface CreatePaymentInput {
  merchantId: string;
  saleId: string;
  method: PaymentMethodRecord;
  amountMinor: bigint;
  idempotencyKey: string;
  notes: string | null;
  createdByUserId: string;
}

export interface CreateRefundInput {
  merchantId: string;
  paymentId: string;
  amountMinor: bigint;
  reason: string | null;
  idempotencyKey: string;
  createdByUserId: string;
}

export interface SaleRepository {
  findBranch(merchantId: string): Promise<BranchRecord | null>;
  ensurePaymentMethods(merchantId: string): Promise<void>;
  listPaymentMethods(merchantId: string, activeOnly: boolean): Promise<PaymentMethodRecord[]>;
  findPaymentMethodByCode(merchantId: string, code: string): Promise<PaymentMethodRecord | null>;
  customerExists(merchantId: string, customerId: string): Promise<boolean>;
  findProduct(merchantId: string, productId: string): Promise<SaleProductRecord | null>;
  findVariant(productId: string, variantId: string): Promise<SaleVariantRecord | null>;
  findSaleByIdempotencyKey(merchantId: string, key: string): Promise<SaleRecord | null>;
  createSale(input: CreateSaleInput): Promise<SaleRecord>;
  listSales(merchantId: string, params: ListSalesParams): Promise<Paginated<SaleRecord>>;
  findSale(merchantId: string, saleId: string): Promise<SaleRecord | null>;
  findReceiptContext(merchantId: string, saleId: string): Promise<ReceiptContext | null>;
  cancelSale(merchantId: string, saleId: string, reason: string | null): Promise<SaleRecord | null>;
  findPaymentByIdempotencyKey(merchantId: string, key: string): Promise<PaymentRecord | null>;
  findPayment(merchantId: string, paymentId: string): Promise<PaymentRecord | null>;
  listSalePayments(merchantId: string, saleId: string): Promise<PaymentRecord[]>;
  createPayment(input: CreatePaymentInput): Promise<PaymentRecord>;
  findRefundByIdempotencyKey(merchantId: string, key: string): Promise<RefundRecord | null>;
  listRefundsByPayment(merchantId: string, paymentId: string): Promise<RefundRecord[]>;
  createRefund(input: CreateRefundInput): Promise<RefundRecord>;
}
