import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";
import { createRequireAuth } from "./middleware/require-auth.js";
import { createRequireMerchant } from "./middleware/require-merchant.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { PrismaAuthRepository } from "./modules/auth/auth.repository.js";
import { createAuthService, type AuthService } from "./modules/auth/auth.service.js";
import { createMerchantRouter } from "./modules/merchant/merchant.routes.js";
import { PrismaMerchantRepository } from "./modules/merchant/merchant.repository.js";
import {
  createMerchantService,
  type MerchantService,
} from "./modules/merchant/merchant.service.js";
import { createCatalogRouter } from "./modules/catalog/catalog.routes.js";
import { PrismaCatalogRepository } from "./modules/catalog/catalog.repository.js";
import { createCatalogService, type CatalogService } from "./modules/catalog/catalog.service.js";
import { createCustomerRouter } from "./modules/customer/customer.routes.js";
import { PrismaCustomerRepository } from "./modules/customer/customer.repository.js";
import {
  createCustomerService,
  type CustomerService,
} from "./modules/customer/customer.service.js";
import { createInventoryRouter } from "./modules/inventory/inventory.routes.js";
import { PrismaInventoryRepository } from "./modules/inventory/inventory.repository.js";
import {
  createInventoryService,
  type InventoryService,
} from "./modules/inventory/inventory.service.js";
import { createSaleRouter } from "./modules/sale/sale.routes.js";
import { PrismaSaleRepository } from "./modules/sale/sale.repository.js";
import { createSaleService, type SaleService } from "./modules/sale/sale.service.js";
import { createCartRouter } from "./modules/cart/cart.routes.js";
import { PrismaCartRepository } from "./modules/cart/cart.repository.js";
import { createCartService, type CartService } from "./modules/cart/cart.service.js";
import { createReportRouter } from "./modules/report/report.routes.js";
import { PrismaReportRepository } from "./modules/report/report.repository.js";
import { createReportService, type ReportService } from "./modules/report/report.service.js";
import { createAuditRouter } from "./modules/audit/audit.routes.js";
import { PrismaAuditRepository } from "./modules/audit/audit.repository.js";
import { createAuditService, type AuditService } from "./modules/audit/audit.service.js";
import { healthRouter } from "./routes/health.js";

export interface AppDependencies {
  authService?: AuthService;
  merchantService?: MerchantService;
  catalogService?: CatalogService;
  customerService?: CustomerService;
  inventoryService?: InventoryService;
  saleService?: SaleService;
  cartService?: CartService;
  reportService?: ReportService;
  auditService?: AuditService;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  const authService =
    dependencies.authService ?? createAuthService(new PrismaAuthRepository(prisma));
  const merchantService =
    dependencies.merchantService ?? createMerchantService(new PrismaMerchantRepository(prisma));
  const catalogService =
    dependencies.catalogService ?? createCatalogService(new PrismaCatalogRepository(prisma));
  const customerService =
    dependencies.customerService ?? createCustomerService(new PrismaCustomerRepository(prisma));
  const inventoryService =
    dependencies.inventoryService ?? createInventoryService(new PrismaInventoryRepository(prisma));
  const auditService =
    dependencies.auditService ?? createAuditService(new PrismaAuditRepository(prisma));
  const saleService =
    dependencies.saleService ??
    createSaleService(new PrismaSaleRepository(prisma), (event) => auditService.record(event));
  const cartService =
    dependencies.cartService ?? createCartService(new PrismaCartRepository(prisma), saleService);
  const reportService =
    dependencies.reportService ?? createReportService(new PrismaReportRepository(prisma));

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestId);

  const requireAuth = createRequireAuth(authService);
  const requireMerchant = createRequireMerchant(merchantService);

  app.use("/health", healthRouter);
  app.use("/v1/auth", createAuthRouter(authService));
  app.use("/v1", createMerchantRouter(merchantService, requireAuth, requireMerchant));
  app.use("/v1", createCatalogRouter(catalogService, requireAuth, requireMerchant));
  app.use("/v1", createCustomerRouter(customerService, requireAuth, requireMerchant));
  app.use("/v1", createInventoryRouter(inventoryService, requireAuth, requireMerchant));
  app.use("/v1", createSaleRouter(saleService, requireAuth, requireMerchant));
  app.use("/v1", createCartRouter(cartService, requireAuth, requireMerchant));
  app.use("/v1", createReportRouter(reportService, requireAuth, requireMerchant));
  app.use("/v1", createAuditRouter(auditService, requireAuth, requireMerchant));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
