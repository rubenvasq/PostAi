export type UserStatus = "ACTIVE" | "DISABLED";
export type MembershipStatus = "ACTIVE" | "INVITED" | "SUSPENDED";
export type MerchantStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";
export type ProductType = "PRODUCT" | "SERVICE";
export type SaleStatus =
  "DRAFT" | "PENDING_PAYMENT" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "CANCELLED";
export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";
export type PaymentMethodType = "CASH" | "TRANSFER" | "CARD_SOFTPOS" | "CARD_SIMULATED" | "OTHER";
export type InventoryMovementType =
  "INITIAL" | "PURCHASE" | "SALE" | "RETURN" | "ADJUSTMENT" | "LOSS";

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: UserStatus;
  createdAt: string;
}

export interface PublicMerchant {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  currency: string;
  timezone: string;
  status: MerchantStatus;
  createdAt: string;
}

export interface PublicMembership {
  merchantId: string;
  merchantName: string;
  status: MembershipStatus;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface LoginResponse {
  user: PublicUser;
  memberships: PublicMembership[];
  tokens: AuthTokens;
}

export interface MeResponse {
  user: PublicUser;
  memberships: PublicMembership[];
}

export interface PublicBranch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
}

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
  type: ProductType;
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

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PublicCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  notes: string | null;
  createdAt: string;
}

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
  type: InventoryMovementType;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface PublicSaleItem {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  discount: string;
  taxRateBp: number;
  tax: string;
  lineTotal: string;
}

export interface PublicPayment {
  id: string;
  saleId: string;
  methodCode: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  isSimulated: boolean;
  providerPaymentId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  refunded: string;
  approvedAt: string | null;
  createdAt: string;
}

export interface PublicSale {
  id: string;
  status: SaleStatus;
  currency: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  refunded: string;
  receiptNumber: string | null;
  branchId: string;
  sellerUserId: string;
  customerId: string | null;
  notes: string | null;
  items: PublicSaleItem[];
  payments: PublicPayment[];
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
}

export type RefundStatus =
  "CREATED" | "PENDING" | "PROCESSING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface PublicRefund {
  id: string;
  paymentId: string;
  status: RefundStatus;
  amount: string;
  currency: string;
  reason: string | null;
  providerRefundId: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface PublicPaymentMethod {
  id: string;
  code: string;
  name: string;
  type: PaymentMethodType;
  isSimulated: boolean;
  requiresProvider: boolean;
  isActive: boolean;
}

export interface ReceiptPayment {
  methodCode: string;
  amount: string;
  isSimulated: boolean;
}

export interface Receipt {
  saleId: string;
  receiptNumber: string;
  issuedAt: string;
  merchant: { name: string; legalName: string | null; taxId: string | null };
  branch: { name: string; address: string | null };
  items: PublicSaleItem[];
  totals: { subtotal: string; discount: string; tax: string; total: string };
  payments: ReceiptPayment[];
  simulated: boolean;
  note: string | null;
}

export interface DashboardSummary {
  from: string;
  to: string;
  currency: string;
  salesCount: number;
  grossSales: string;
  refunds: string;
  netSales: string;
  averageTicket: string;
  byMethod: Array<{ methodCode: string; count: number; amount: string }>;
  lowStockCount: number;
  openCashSession: { id: string; openedAt: string; openingAmount: string } | null;
}

export type CashSessionStatus = "OPEN" | "CLOSED";
export type CashMovementType =
  "OPENING" | "SALE" | "REFUND" | "EXPENSE" | "WITHDRAWAL" | "DEPOSIT" | "ADJUSTMENT" | "CLOSING";
export type CashDirection = "IN" | "OUT";
export type ManualCashMovementType = "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT";

export interface PublicCashSession {
  id: string;
  branchId: string;
  status: CashSessionStatus;
  openedByUserId: string;
  openedAt: string;
  openingAmount: string;
  closedByUserId: string | null;
  closedAt: string | null;
  closingAmount?: string;
  expectedAmount?: string;
  difference?: string;
  notes: string | null;
}

export interface PublicCashMovement {
  id: string;
  sessionId: string;
  type: CashMovementType;
  direction: CashDirection;
  amount: string;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface PublicExpense {
  id: string;
  branchId: string;
  sessionId: string | null;
  category: string;
  amount: string;
  currency: string;
  description: string | null;
  incurredAt: string;
  createdAt: string;
}

export interface SalesReport {
  groupBy: "day" | "payment_method";
  from: string;
  to: string;
  rows: Array<{
    key: string;
    salesCount: number;
    grossSales: string;
    refunds: string;
    netSales: string;
  }>;
}
