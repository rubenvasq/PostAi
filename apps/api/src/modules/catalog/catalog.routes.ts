import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { getMerchantContext } from "../../middleware/require-merchant.js";
import type { CatalogService } from "./catalog.service.js";
import {
  categoryCreateSchema,
  categoryListQuerySchema,
  categoryUpdateSchema,
  productCreateSchema,
  productListQuerySchema,
  productUpdateSchema,
  taxRateCreateSchema,
} from "./catalog.schemas.js";

const idParamSchema = z.uuid("Identificador inválido");

export function createCatalogRouter(
  service: CatalogService,
  requireAuth: RequestHandler,
  requireMerchant: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth, requireMerchant);

  // -- Categorías -----------------------------------------------------------

  router.get("/categories", async (req, res) => {
    const { active } = categoryListQuerySchema.parse(req.query);
    const data = await service.listCategories(getMerchantContext(res), active);
    res.status(200).json({ data });
  });

  router.post("/categories", async (req, res) => {
    const input = categoryCreateSchema.parse(req.body);
    const category = await service.createCategory(getMerchantContext(res), input);
    res.status(201).json(category);
  });

  router.patch("/categories/:categoryId", async (req, res) => {
    const categoryId = idParamSchema.parse(req.params.categoryId);
    const input = categoryUpdateSchema.parse(req.body);
    const category = await service.updateCategory(getMerchantContext(res), categoryId, input);
    res.status(200).json(category);
  });

  router.delete("/categories/:categoryId", async (req, res) => {
    const categoryId = idParamSchema.parse(req.params.categoryId);
    await service.deactivateCategory(getMerchantContext(res), categoryId);
    res.status(204).end();
  });

  // -- Impuestos ------------------------------------------------------------

  router.get("/tax-rates", async (_req, res) => {
    const data = await service.listTaxRates(getMerchantContext(res));
    res.status(200).json({ data });
  });

  router.post("/tax-rates", async (req, res) => {
    const input = taxRateCreateSchema.parse(req.body);
    const taxRate = await service.createTaxRate(getMerchantContext(res), input);
    res.status(201).json(taxRate);
  });

  // -- Productos ------------------------------------------------------------

  router.get("/products", async (req, res) => {
    const query = productListQuerySchema.parse(req.query);
    const result = await service.listProducts(getMerchantContext(res), query);
    res.status(200).json(result);
  });

  router.post("/products", async (req, res) => {
    const input = productCreateSchema.parse(req.body);
    const product = await service.createProduct(getMerchantContext(res), input);
    res.status(201).json(product);
  });

  router.get("/products/:productId", async (req, res) => {
    const productId = idParamSchema.parse(req.params.productId);
    const product = await service.getProduct(getMerchantContext(res), productId);
    res.status(200).json(product);
  });

  router.patch("/products/:productId", async (req, res) => {
    const productId = idParamSchema.parse(req.params.productId);
    const input = productUpdateSchema.parse(req.body);
    const product = await service.updateProduct(getMerchantContext(res), productId, input);
    res.status(200).json(product);
  });

  router.delete("/products/:productId", async (req, res) => {
    const productId = idParamSchema.parse(req.params.productId);
    await service.deactivateProduct(getMerchantContext(res), productId);
    res.status(204).end();
  });

  return router;
}
