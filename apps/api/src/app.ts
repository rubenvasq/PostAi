import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestId);

  app.use("/health", healthRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
