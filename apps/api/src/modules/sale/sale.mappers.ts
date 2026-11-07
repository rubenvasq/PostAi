import type {
  PaymentMethodRecord,
  PaymentMethodTypeValue,
  PaymentRecord,
  PaymentStatusValue,
  ReceiptContext,
  SaleItemRecord,
  SaleRecord,
  SaleStatusValue,
} from "./sale.types.js";

export interface PublicPaymentMethod {
  id: string;
  code: string;
  name: string;
  type: PaymentMethodTypeValue;
  isSimulated: boolean;
  requiresProvider: boolean;
  isActive: boolean;
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
  status: PaymentStatusValue;
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
  status: SaleStatusValue;
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

export function toPublicPaymentMethod(method: PaymentMethodRecord): PublicPaymentMethod {
  return {
    id: method.id,
    code: method.code,
    name: method.name,
    type: method.type,
    isSimulated: method.isSimulated,
    requiresProvider: method.requiresProvider,
    isActive: method.isActive,
  };
}

export function toPublicSaleItem(item: SaleItemRecord): PublicSaleItem {
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    productName: item.productName,
    sku: item.sku,
    quantity: Number(item.quantity),
    unitPrice: item.unitPriceMinor.toString(),
    discount: item.discountMinor.toString(),
    taxRateBp: item.taxRateBp,
    tax: item.taxMinor.toString(),
    lineTotal: item.lineTotalMinor.toString(),
  };
}

export function toPublicPayment(payment: PaymentRecord): PublicPayment {
  return {
    id: payment.id,
    saleId: payment.saleId,
    methodCode: payment.methodCode,
    status: payment.status,
    amount: payment.amountMinor.toString(),
    currency: payment.currency,
    isSimulated: payment.isSimulated,
    providerPaymentId: payment.providerPaymentId,
    failureCode: payment.failureCode,
    failureMessage: payment.failureMessage,
    refunded: payment.refundedMinor.toString(),
    approvedAt: payment.approvedAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

export function toReceipt(sale: SaleRecord, context: ReceiptContext): Receipt {
  const approvedPayments = sale.payments.filter((payment) => payment.status === "APPROVED");
  const issuedAt = sale.completedAt ?? approvedPayments[0]?.approvedAt ?? sale.createdAt;

  return {
    saleId: sale.id,
    receiptNumber: sale.receiptNumber ?? sale.id,
    issuedAt: issuedAt.toISOString(),
    merchant: context.merchant,
    branch: context.branch,
    items: sale.items.map(toPublicSaleItem),
    totals: {
      subtotal: sale.subtotalMinor.toString(),
      discount: sale.discountMinor.toString(),
      tax: sale.taxMinor.toString(),
      total: sale.totalMinor.toString(),
    },
    payments: approvedPayments.map((payment) => ({
      methodCode: payment.methodCode,
      amount: payment.amountMinor.toString(),
      isSimulated: payment.isSimulated,
    })),
    simulated: approvedPayments.some((payment) => payment.isSimulated),
    note: sale.notes,
  };
}

export function toPublicSale(sale: SaleRecord): PublicSale {
  return {
    id: sale.id,
    status: sale.status,
    currency: sale.currency,
    subtotal: sale.subtotalMinor.toString(),
    discount: sale.discountMinor.toString(),
    tax: sale.taxMinor.toString(),
    total: sale.totalMinor.toString(),
    refunded: sale.refundedMinor.toString(),
    receiptNumber: sale.receiptNumber,
    branchId: sale.branchId,
    sellerUserId: sale.sellerUserId,
    customerId: sale.customerId,
    notes: sale.notes,
    items: sale.items.map(toPublicSaleItem),
    payments: sale.payments.map(toPublicPayment),
    createdAt: sale.createdAt.toISOString(),
    completedAt: sale.completedAt?.toISOString() ?? null,
    cancelledAt: sale.cancelledAt?.toISOString() ?? null,
  };
}
