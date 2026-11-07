import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { getMerchantContext } from "../../middleware/require-merchant.js";
import {
  customerCreateSchema,
  customerListQuerySchema,
  customerUpdateSchema,
} from "./customer.schemas.js";
import type { CustomerService } from "./customer.service.js";

const idParamSchema = z.uuid("Identificador inválido");

export function createCustomerRouter(
  service: CustomerService,
  requireAuth: RequestHandler,
  requireMerchant: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth, requireMerchant);

  router.get("/customers", async (req, res) => {
    const query = customerListQuerySchema.parse(req.query);
    const result = await service.listCustomers(getMerchantContext(res), query);
    res.status(200).json(result);
  });

  router.post("/customers", async (req, res) => {
    const input = customerCreateSchema.parse(req.body);
    const customer = await service.createCustomer(getMerchantContext(res), input);
    res.status(201).json(customer);
  });

  router.get("/customers/:customerId", async (req, res) => {
    const customerId = idParamSchema.parse(req.params.customerId);
    const customer = await service.getCustomer(getMerchantContext(res), customerId);
    res.status(200).json(customer);
  });

  router.patch("/customers/:customerId", async (req, res) => {
    const customerId = idParamSchema.parse(req.params.customerId);
    const input = customerUpdateSchema.parse(req.body);
    const customer = await service.updateCustomer(getMerchantContext(res), customerId, input);
    res.status(200).json(customer);
  });

  return router;
}
