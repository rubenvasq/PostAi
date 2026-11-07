import { z } from "zod";

const isoDate = z.string().datetime({ offset: true }).optional();

export const dashboardQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
});

export const salesReportQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
  groupBy: z.enum(["day", "payment_method"]).default("day"),
});
