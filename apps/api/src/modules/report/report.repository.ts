import type { PrismaClient } from "@prisma/client";
import type {
  ApprovedPaymentRow,
  OpenCashSessionRow,
  PaidSaleRow,
  ReportRepository,
} from "./report.types.js";

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly db: PrismaClient) {}

  async getMerchantCurrency(merchantId: string): Promise<string | null> {
    const merchant = await this.db.merchant.findUnique({
      where: { id: merchantId },
      select: { currency: true },
    });
    return merchant?.currency ?? null;
  }

  async listPaidSales(merchantId: string, from: Date, to: Date): Promise<PaidSaleRow[]> {
    const sales = await this.db.sale.findMany({
      where: { merchantId, status: "PAID", completedAt: { gte: from, lte: to } },
      select: { totalMinor: true, refundedMinor: true, completedAt: true, createdAt: true },
    });

    return sales.map((sale) => ({
      totalMinor: sale.totalMinor,
      refundedMinor: sale.refundedMinor,
      occurredAt: sale.completedAt ?? sale.createdAt,
    }));
  }

  async listApprovedPayments(
    merchantId: string,
    from: Date,
    to: Date,
  ): Promise<ApprovedPaymentRow[]> {
    const payments = await this.db.payment.findMany({
      where: {
        merchantId,
        status: "APPROVED",
        approvedAt: { gte: from, lte: to },
      },
      select: {
        amountMinor: true,
        approvedAt: true,
        createdAt: true,
        method: { select: { code: true } },
      },
    });

    return payments.map((payment) => ({
      methodCode: payment.method.code,
      amountMinor: payment.amountMinor,
      occurredAt: payment.approvedAt ?? payment.createdAt,
    }));
  }

  async countLowStock(merchantId: string): Promise<number> {
    // Stock por debajo o igual al umbral configurado (umbral no nulo).
    const rows = await this.db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM inventory_items
      WHERE "merchantId" = ${merchantId}::uuid
        AND "lowStockThreshold" IS NOT NULL
        AND quantity <= "lowStockThreshold"
    `;
    return Number(rows[0]?.count ?? 0n);
  }

  async findOpenCashSession(merchantId: string): Promise<OpenCashSessionRow | null> {
    const main = await this.db.branch.findFirst({
      where: { merchantId, code: "MAIN" },
      select: { id: true },
    });

    const branch =
      main ??
      (await this.db.branch.findFirst({
        where: { merchantId, isActive: true },
        orderBy: { code: "asc" },
        select: { id: true },
      }));

    if (!branch) return null;

    return this.db.cashSession.findFirst({
      where: { merchantId, branchId: branch.id, status: "OPEN" },
      orderBy: { openedAt: "desc" },
      select: { id: true, openedAt: true, openingAmountMinor: true },
    });
  }
}
