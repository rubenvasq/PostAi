import { Router } from "express";
import { APP_NAME, APP_VERSION } from "../config/app.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: APP_NAME,
    version: APP_VERSION,
  });
});
