import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { getAuthUser } from "../../middleware/require-auth.js";
import { getMerchantContext } from "../../middleware/require-merchant.js";
import {
  cashCloseSchema,
  cashListQuerySchema,
  cashMovementCreateSchema,
  cashOpenSchema,
  expenseCreateSchema,
  expenseListQuerySchema,
} from "./cash.schemas.js";
import type { CashService } from "./cash.service.js";

const idParamSchema = z.uuid("Identificador inválido");

export function createCashRouter(
  service: CashService,
  requireAuth: RequestHandler,
  requireMerchant: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth, requireMerchant);

  router.get("/cash/sessions/current", async (_req, res) => {
    const session = await service.getCurrentSession(getMerchantContext(res));
    res.status(200).json(session);
  });

  router.get("/cash/sessions", async (req, res) => {
    const query = cashListQuerySchema.parse(req.query);
    const result = await service.listSessions(getMerchantContext(res), query);
    res.status(200).json(result);
  });

  router.post("/cash/sessions", async (req, res) => {
    const input = cashOpenSchema.parse(req.body);
    const session = await service.openSession(getMerchantContext(res), getAuthUser(res).id, input);
    res.status(201).json(session);
  });

  router.post("/cash/sessions/:sessionId/close", async (req, res) => {
    const sessionId = idParamSchema.parse(req.params.sessionId);
    const input = cashCloseSchema.parse(req.body);
    const session = await service.closeSession(
      getMerchantContext(res),
      sessionId,
      getAuthUser(res).id,
      input,
    );
    res.status(200).json(session);
  });

  router.get("/cash/sessions/:sessionId/movements", async (req, res) => {
    const sessionId = idParamSchema.parse(req.params.sessionId);
    const data = await service.listMovements(getMerchantContext(res), sessionId);
    res.status(200).json({ data });
  });

  router.post("/cash/sessions/:sessionId/movements", async (req, res) => {
    const sessionId = idParamSchema.parse(req.params.sessionId);
    const input = cashMovementCreateSchema.parse(req.body);
    const movement = await service.createMovement(
      getMerchantContext(res),
      sessionId,
      getAuthUser(res).id,
      input,
    );
    res.status(201).json(movement);
  });

  router.get("/expenses", async (req, res) => {
    const query = expenseListQuerySchema.parse(req.query);
    const result = await service.listExpenses(getMerchantContext(res), query);
    res.status(200).json(result);
  });

  router.post("/expenses", async (req, res) => {
    const input = expenseCreateSchema.parse(req.body);
    const expense = await service.createExpense(
      getMerchantContext(res),
      getAuthUser(res).id,
      input,
    );
    res.status(201).json(expense);
  });

  return router;
}
