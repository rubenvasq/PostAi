import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { getAuthUser } from "../../middleware/require-auth.js";
import { getMerchantContext } from "../../middleware/require-merchant.js";
import {
  idempotencyKeySchema,
  paymentCreateSchema,
  refundCreateSchema,
  saleCancelSchema,
  saleCreateSchema,
  saleListQuerySchema,
} from "./sale.schemas.js";
import type { SaleService } from "./sale.service.js";

const idParamSchema = z.uuid("Identificador inválido");

function idempotencyKey(header: string | undefined): string {
  return idempotencyKeySchema.parse(header);
}

export function createSaleRouter(
  service: SaleService,
  requireAuth: RequestHandler,
  requireMerchant: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth, requireMerchant);

  router.get("/payment-methods", async (_req, res) => {
    const data = await service.listPaymentMethods(getMerchantContext(res));
    res.status(200).json({ data });
  });

  // -- Ventas ---------------------------------------------------------------

  router.get("/sales", async (req, res) => {
    const query = saleListQuerySchema.parse(req.query);
    const result = await service.listSales(getMerchantContext(res), query);
    res.status(200).json(result);
  });

  router.post("/sales", async (req, res) => {
    const input = saleCreateSchema.parse(req.body);
    const key = idempotencyKey(req.header("idempotency-key"));
    const sale = await service.createSale(getMerchantContext(res), getAuthUser(res).id, input, key);
    res.status(201).json(sale);
  });

  router.get("/sales/:saleId", async (req, res) => {
    const saleId = idParamSchema.parse(req.params.saleId);
    const sale = await service.getSale(getMerchantContext(res), saleId);
    res.status(200).json(sale);
  });

  router.get("/sales/:saleId/receipt", async (req, res) => {
    const saleId = idParamSchema.parse(req.params.saleId);
    const receipt = await service.getReceipt(getMerchantContext(res), saleId);
    res.status(200).json(receipt);
  });

  router.post("/sales/:saleId/cancel", async (req, res) => {
    const saleId = idParamSchema.parse(req.params.saleId);
    const input = saleCancelSchema.parse(req.body ?? {});
    const sale = await service.cancelSale(
      getMerchantContext(res),
      saleId,
      getAuthUser(res).id,
      input,
    );
    res.status(200).json(sale);
  });

  router.get("/sales/:saleId/payments", async (req, res) => {
    const saleId = idParamSchema.parse(req.params.saleId);
    const data = await service.listSalePayments(getMerchantContext(res), saleId);
    res.status(200).json({ data });
  });

  router.post("/sales/:saleId/payments", async (req, res) => {
    const saleId = idParamSchema.parse(req.params.saleId);
    const input = paymentCreateSchema.parse(req.body);
    const key = idempotencyKey(req.header("idempotency-key"));
    const payment = await service.createPayment(
      getMerchantContext(res),
      saleId,
      getAuthUser(res).id,
      input,
      key,
    );
    res.status(201).json(payment);
  });

  // -- Pagos ----------------------------------------------------------------

  router.get("/payments/:paymentId", async (req, res) => {
    const paymentId = idParamSchema.parse(req.params.paymentId);
    const payment = await service.getPayment(getMerchantContext(res), paymentId);
    res.status(200).json(payment);
  });

  router.get("/payments/:paymentId/refunds", async (req, res) => {
    const paymentId = idParamSchema.parse(req.params.paymentId);
    const data = await service.listRefunds(getMerchantContext(res), paymentId);
    res.status(200).json({ data });
  });

  router.post("/payments/:paymentId/refunds", async (req, res) => {
    const paymentId = idParamSchema.parse(req.params.paymentId);
    const input = refundCreateSchema.parse(req.body);
    const key = idempotencyKey(req.header("idempotency-key"));
    const refund = await service.createRefund(
      getMerchantContext(res),
      paymentId,
      getAuthUser(res).id,
      input,
      key,
    );
    res.status(201).json(refund);
  });

  return router;
}
