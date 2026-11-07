import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { getAuthUser } from "../../middleware/require-auth.js";
import { getMerchantContext } from "../../middleware/require-merchant.js";
import {
  inventoryAdjustmentSchema,
  inventoryListQuerySchema,
  inventoryMovementListQuerySchema,
} from "./inventory.schemas.js";
import type { InventoryService } from "./inventory.service.js";

const idParamSchema = z.uuid("Identificador inválido");

export function createInventoryRouter(
  service: InventoryService,
  requireAuth: RequestHandler,
  requireMerchant: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth, requireMerchant);

  router.get("/inventory", async (req, res) => {
    const query = inventoryListQuerySchema.parse(req.query);
    const result = await service.listInventory(getMerchantContext(res), query);
    res.status(200).json(result);
  });

  router.get("/inventory/movements", async (req, res) => {
    const query = inventoryMovementListQuerySchema.parse(req.query);
    const result = await service.listMovements(getMerchantContext(res), query);
    res.status(200).json(result);
  });

  router.post("/inventory/:productId/adjustments", async (req, res) => {
    const productId = idParamSchema.parse(req.params.productId);
    const input = inventoryAdjustmentSchema.parse(req.body);
    const movement = await service.adjustInventory(
      getMerchantContext(res),
      productId,
      input,
      getAuthUser(res).id,
    );
    res.status(201).json(movement);
  });

  return router;
}
