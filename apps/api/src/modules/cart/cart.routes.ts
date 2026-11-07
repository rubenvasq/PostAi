import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { getAuthUser } from "../../middleware/require-auth.js";
import { getMerchantContext } from "../../middleware/require-merchant.js";
import {
  cartCreateSchema,
  cartItemCreateSchema,
  cartItemUpdateSchema,
  cartUpdateSchema,
} from "./cart.schemas.js";
import type { CartService } from "./cart.service.js";

const idParamSchema = z.uuid("Identificador inválido");

export function createCartRouter(
  service: CartService,
  requireAuth: RequestHandler,
  requireMerchant: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth, requireMerchant);

  router.post("/carts", async (req, res) => {
    const input = cartCreateSchema.parse(req.body ?? {});
    const cart = await service.createCart(getMerchantContext(res), getAuthUser(res).id, input);
    res.status(201).json(cart);
  });

  router.get("/carts/:cartId", async (req, res) => {
    const cartId = idParamSchema.parse(req.params.cartId);
    const cart = await service.getCart(getMerchantContext(res), cartId);
    res.status(200).json(cart);
  });

  router.patch("/carts/:cartId", async (req, res) => {
    const cartId = idParamSchema.parse(req.params.cartId);
    const input = cartUpdateSchema.parse(req.body);
    const cart = await service.updateCart(getMerchantContext(res), cartId, input);
    res.status(200).json(cart);
  });

  router.delete("/carts/:cartId", async (req, res) => {
    const cartId = idParamSchema.parse(req.params.cartId);
    await service.deleteCart(getMerchantContext(res), cartId);
    res.status(204).send();
  });

  router.post("/carts/:cartId/items", async (req, res) => {
    const cartId = idParamSchema.parse(req.params.cartId);
    const input = cartItemCreateSchema.parse(req.body);
    const cart = await service.addItem(getMerchantContext(res), cartId, input);
    res.status(201).json(cart);
  });

  router.patch("/carts/:cartId/items/:itemId", async (req, res) => {
    const cartId = idParamSchema.parse(req.params.cartId);
    const itemId = idParamSchema.parse(req.params.itemId);
    const input = cartItemUpdateSchema.parse(req.body);
    const cart = await service.updateItem(getMerchantContext(res), cartId, itemId, input);
    res.status(200).json(cart);
  });

  router.delete("/carts/:cartId/items/:itemId", async (req, res) => {
    const cartId = idParamSchema.parse(req.params.cartId);
    const itemId = idParamSchema.parse(req.params.itemId);
    const cart = await service.removeItem(getMerchantContext(res), cartId, itemId);
    res.status(200).json(cart);
  });

  router.post("/carts/:cartId/checkout", async (req, res) => {
    const cartId = idParamSchema.parse(req.params.cartId);
    const sale = await service.checkout(getMerchantContext(res), getAuthUser(res).id, cartId);
    res.status(201).json(sale);
  });

  return router;
}
