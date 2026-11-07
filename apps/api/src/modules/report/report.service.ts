import { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import type { MerchantContext } from "../merchant/merchant.types.js";
import type { dashboardQuerySchema, salesReportQuerySchema } from "./report.schemas.js";
import type { ApprovedPaymentRow, PaidSaleRow, ReportRepository } from "./report.types.js";

type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;

// America/Bogota es UTC-5 fijo (sin horario de verano).
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;

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
  openCashSession: null;
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

function resolveRange(from?: string, to?: string): { from: Date; to: Date } {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from
    ? new Date(from)
    : new Date(toDate.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

  if (fromDate.getTime() > toDate.getTime()) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "El inicio del rango no puede ser posterior al fin",
    );
  }

  return { from: fromDate, to: toDate };
}

function dayKey(date: Date): string {
  return new Date(date.getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

function roundHalfUp(value: bigint, divisor: bigint): bigint {
  if (divisor === 0n) return 0n;
  return (2n * value + divisor) / (2n * divisor);
}

export interface ReportService {
  getDashboardSummary(context: MerchantContext, query: DashboardQuery): Promise<DashboardSummary>;
  getSalesReport(context: MerchantContext, query: SalesReportQuery): Promise<SalesReport>;
}

export function createReportService(repository: ReportRepository): ReportService {
  async function loadData(merchantId: string, from: Date, to: Date) {
    const [sales, payments] = await Promise.all([
      repository.listPaidSales(merchantId, from, to),
      repository.listApprovedPayments(merchantId, from, to),
    ]);
    return { sales, payments };
  }

  return {
    async getDashboardSummary(context, query) {
      const { from, to } = resolveRange(query.from, query.to);
      const [{ sales, payments }, currency, lowStockCount] = await Promise.all([
        loadData(context.merchantId, from, to),
        repository.getMerchantCurrency(context.merchantId),
        repository.countLowStock(context.merchantId),
      ]);

      const grossSales = sales.reduce((sum, sale) => sum + sale.totalMinor, 0n);
      const refunds = sales.reduce((sum, sale) => sum + sale.refundedMinor, 0n);
      const netSales = grossSales - refunds;
      const salesCount = sales.length;
      const averageTicket = roundHalfUp(grossSales, BigInt(salesCount));

      const byMethodMap = new Map<string, { count: number; amount: bigint }>();
      for (const payment of payments) {
        const entry = byMethodMap.get(payment.methodCode) ?? { count: 0, amount: 0n };
        entry.count += 1;
        entry.amount += payment.amountMinor;
        byMethodMap.set(payment.methodCode, entry);
      }

      return {
        from: from.toISOString(),
        to: to.toISOString(),
        currency: currency ?? "COP",
        salesCount,
        grossSales: grossSales.toString(),
        refunds: refunds.toString(),
        netSales: netSales.toString(),
        averageTicket: averageTicket.toString(),
        byMethod: [...byMethodMap.entries()]
          .map(([methodCode, entry]) => ({
            methodCode,
            count: entry.count,
            amount: entry.amount.toString(),
          }))
          .sort((left, right) => left.methodCode.localeCompare(right.methodCode)),
        lowStockCount,
        openCashSession: null,
      };
    },

    async getSalesReport(context, query) {
      const { from, to } = resolveRange(query.from, query.to);
      const { sales, payments } = await loadData(context.merchantId, from, to);

      const rows = new Map<string, { salesCount: number; grossSales: bigint; refunds: bigint }>();
      const bump = (key: string, gross: bigint, refund: bigint) => {
        const row = rows.get(key) ?? { salesCount: 0, grossSales: 0n, refunds: 0n };
        row.salesCount += 1;
        row.grossSales += gross;
        row.refunds += refund;
        rows.set(key, row);
      };

      if (query.groupBy === "day") {
        for (const sale of sales)
          bump(dayKey(sale.occurredAt), sale.totalMinor, sale.refundedMinor);
      } else {
        // payment_method: cada pago aprobado aporta su importe a su método.
        const refundByMethod = aggregateRefunds(sales, payments);
        for (const payment of payments) {
          bump(
            payment.methodCode,
            payment.amountMinor,
            refundByMethod.get(payment.methodCode) ?? 0n,
          );
        }
      }

      return {
        groupBy: query.groupBy,
        from: from.toISOString(),
        to: to.toISOString(),
        rows: [...rows.entries()]
          .map(([key, row]) => ({
            key,
            salesCount: row.salesCount,
            grossSales: row.grossSales.toString(),
            refunds: row.refunds.toString(),
            netSales: (row.grossSales - row.refunds).toString(),
          }))
          .sort((left, right) => left.key.localeCompare(right.key)),
      };
    },
  };
}

// Los reembolsos aún no se asignan por método (MVP sin reembolsos); se devuelve 0.
function aggregateRefunds(
  _sales: PaidSaleRow[],
  _payments: ApprovedPaymentRow[],
): Map<string, bigint> {
  return new Map<string, bigint>();
}
