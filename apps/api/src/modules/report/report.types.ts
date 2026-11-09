export interface PaidSaleRow {
  totalMinor: bigint;
  refundedMinor: bigint;
  occurredAt: Date;
}

export interface ApprovedPaymentRow {
  methodCode: string;
  amountMinor: bigint;
  occurredAt: Date;
}

export interface OpenCashSessionRow {
  id: string;
  openedAt: Date;
  openingAmountMinor: bigint;
}

export interface ReportRepository {
  getMerchantCurrency(merchantId: string): Promise<string | null>;
  listPaidSales(merchantId: string, from: Date, to: Date): Promise<PaidSaleRow[]>;
  listApprovedPayments(merchantId: string, from: Date, to: Date): Promise<ApprovedPaymentRow[]>;
  countLowStock(merchantId: string): Promise<number>;
  findOpenCashSession(merchantId: string): Promise<OpenCashSessionRow | null>;
}
