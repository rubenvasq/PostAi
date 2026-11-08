import { clearSession, getSession, setSession, type AdminSession } from "@/lib/session";
import type {
  AuthTokens,
  DashboardSummary,
  LoginResponse,
  MeResponse,
  Paginated,
  ProductType,
  PublicBranch,
  PublicCategory,
  PublicCustomer,
  PublicInventoryItem,
  PublicInventoryMovement,
  PublicMerchant,
  PublicPaymentMethod,
  PublicProduct,
  PublicRefund,
  PublicSale,
  PublicTaxRate,
  Receipt,
  SaleStatus,
  SalesReport,
} from "@/lib/types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const DEVICE_NAME = "Panel PostAi (web)";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface ApiRequestOptions {
  method?: HttpMethod;
  /** El cuerpo puede ser una función para leer el estado más reciente de la sesión. */
  body?: unknown | (() => unknown);
  /** Si es `false`, no se envía el bearer token ni se intenta renovar. */
  auth?: boolean;
  /** Si es `false`, no se envía `X-Merchant-Id`. */
  merchantScoped?: boolean;
  /** Cabeceras adicionales (p. ej. `Idempotency-Key`). */
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : null;
    const message =
      error && typeof error.message === "string"
        ? error.message
        : `Error HTTP ${response.status} al llamar a la API`;
    const code = error && typeof error.code === "string" ? error.code : "HTTP_ERROR";

    throw new ApiError(response.status, code, message, error?.details);
  }

  return payload as T;
}

async function send(path: string, options: ApiRequestOptions): Promise<Response> {
  const session = getSession();
  const headers = new Headers({ Accept: "application/json" });
  const body = typeof options.body === "function" ? options.body() : options.body;

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  if (options.merchantScoped !== false && session?.merchantId) {
    headers.set("X-Merchant-Id", session.merchantId);
  }

  headers.set("X-Device-Name", DEVICE_NAME);

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers.set(key, value);
    }
  }

  return fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

let refreshPromise: Promise<AdminSession> | null = null;

async function renewSession(): Promise<AdminSession> {
  const session = getSession();

  if (!session?.refreshToken) {
    throw new ApiError(401, "UNAUTHORIZED", "No hay una sesión activa");
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await send("/v1/auth/refresh", {
        method: "POST",
        body: { refreshToken: session.refreshToken },
        auth: false,
        merchantScoped: false,
      });
      const tokens = await handleResponse<AuthTokens>(response);
      const nextSession: AdminSession = {
        ...session,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
      setSession(nextSession);
      return nextSession;
    })()
      .catch((error: unknown) => {
        clearSession();
        throw error instanceof ApiError
          ? error
          : new ApiError(401, "UNAUTHORIZED", "La sesión expiró");
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await send(path, options);
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "No se pudo conectar con la API. Verifica que el backend esté disponible.",
    );
  }

  if (response.status === 401 && options.auth !== false && getSession()?.refreshToken) {
    await renewSession();

    try {
      response = await send(path, options);
    } catch {
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        "No se pudo conectar con la API. Verifica que el backend esté disponible.",
      );
    }
  }

  return handleResponse<T>(response);
}

type QueryValue = string | number | boolean | null | undefined;

function withQuery(path: string, params: object): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params) as Array<[string, QueryValue]>) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

// ---------------------------------------------------------------------------
// Autenticación y comercio
// ---------------------------------------------------------------------------

export function loginRequest(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/v1/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
    merchantScoped: false,
  });
}

export function logoutRequest(): Promise<void> {
  return apiFetch<void>("/v1/auth/logout", {
    method: "POST",
    body: () => ({ refreshToken: getSession()?.refreshToken ?? "" }),
    merchantScoped: false,
  });
}

export function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/v1/auth/me", { merchantScoped: false });
}

export function getMerchant(): Promise<PublicMerchant> {
  return apiFetch<PublicMerchant>("/v1/merchant");
}

export function getBranches(): Promise<{ data: PublicBranch[] }> {
  return apiFetch<{ data: PublicBranch[] }>("/v1/branches");
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export interface ProductListParams {
  search?: string;
  categoryId?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export function listProducts(params: ProductListParams): Promise<Paginated<PublicProduct>> {
  return apiFetch<Paginated<PublicProduct>>(withQuery("/v1/products", params));
}

export interface ProductCreateBody {
  type?: ProductType;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  taxRateId?: string;
  price: string;
  trackInventory?: boolean;
  isActive?: boolean;
}

export interface ProductUpdateBody {
  type?: ProductType;
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryId?: string | null;
  taxRateId?: string | null;
  price?: string;
  trackInventory?: boolean;
  isActive?: boolean;
}

export function createProduct(body: ProductCreateBody): Promise<PublicProduct> {
  return apiFetch<PublicProduct>("/v1/products", { method: "POST", body });
}

export function updateProduct(id: string, body: ProductUpdateBody): Promise<PublicProduct> {
  return apiFetch<PublicProduct>(`/v1/products/${id}`, { method: "PATCH", body });
}

export function deactivateProduct(id: string): Promise<void> {
  return apiFetch<void>(`/v1/products/${id}`, { method: "DELETE" });
}

export function listCategories(active?: boolean): Promise<{ data: PublicCategory[] }> {
  return apiFetch<{ data: PublicCategory[] }>(withQuery("/v1/categories", { active }));
}

export interface CategoryBody {
  name: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export function createCategory(body: CategoryBody): Promise<PublicCategory> {
  return apiFetch<PublicCategory>("/v1/categories", { method: "POST", body });
}

export function updateCategory(id: string, body: Partial<CategoryBody>): Promise<PublicCategory> {
  return apiFetch<PublicCategory>(`/v1/categories/${id}`, { method: "PATCH", body });
}

export function deactivateCategory(id: string): Promise<void> {
  return apiFetch<void>(`/v1/categories/${id}`, { method: "DELETE" });
}

export function listTaxRates(): Promise<{ data: PublicTaxRate[] }> {
  return apiFetch<{ data: PublicTaxRate[] }>("/v1/tax-rates");
}

export interface TaxRateBody {
  name: string;
  rateBp: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export function createTaxRate(body: TaxRateBody): Promise<PublicTaxRate> {
  return apiFetch<PublicTaxRate>("/v1/tax-rates", { method: "POST", body });
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export interface CustomerListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export function listCustomers(params: CustomerListParams): Promise<Paginated<PublicCustomer>> {
  return apiFetch<Paginated<PublicCustomer>>(withQuery("/v1/customers", params));
}

export function getCustomer(id: string): Promise<PublicCustomer> {
  return apiFetch<PublicCustomer>(`/v1/customers/${id}`);
}

export interface CustomerBody {
  name: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  notes?: string | null;
}

export function createCustomer(body: CustomerBody): Promise<PublicCustomer> {
  return apiFetch<PublicCustomer>("/v1/customers", { method: "POST", body });
}

export function updateCustomer(id: string, body: Partial<CustomerBody>): Promise<PublicCustomer> {
  return apiFetch<PublicCustomer>(`/v1/customers/${id}`, { method: "PATCH", body });
}

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

export interface InventoryListParams {
  search?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
}

export function listInventory(
  params: InventoryListParams,
): Promise<Paginated<PublicInventoryItem>> {
  return apiFetch<Paginated<PublicInventoryItem>>(withQuery("/v1/inventory", params));
}

export interface InventoryMovementListParams {
  productId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function listInventoryMovements(
  params: InventoryMovementListParams,
): Promise<Paginated<PublicInventoryMovement>> {
  return apiFetch<Paginated<PublicInventoryMovement>>(withQuery("/v1/inventory/movements", params));
}

export function adjustInventory(
  productId: string,
  body: { quantityDelta: number; reason: string },
): Promise<PublicInventoryMovement> {
  return apiFetch<PublicInventoryMovement>(`/v1/inventory/${productId}/adjustments`, {
    method: "POST",
    body,
  });
}

// ---------------------------------------------------------------------------
// Ventas, pagos y comprobantes
// ---------------------------------------------------------------------------

export interface SaleListParams {
  from?: string;
  to?: string;
  status?: SaleStatus;
  customerId?: string;
  page?: number;
  pageSize?: number;
}

export function listSales(params: SaleListParams): Promise<Paginated<PublicSale>> {
  return apiFetch<Paginated<PublicSale>>(withQuery("/v1/sales", params));
}

export function getSale(id: string): Promise<PublicSale> {
  return apiFetch<PublicSale>(`/v1/sales/${id}`);
}

export function getReceipt(id: string): Promise<Receipt> {
  return apiFetch<Receipt>(`/v1/sales/${id}/receipt`);
}

export function listPaymentMethods(): Promise<{ data: PublicPaymentMethod[] }> {
  return apiFetch<{ data: PublicPaymentMethod[] }>("/v1/payment-methods");
}

export function listRefunds(paymentId: string): Promise<{ data: PublicRefund[] }> {
  return apiFetch<{ data: PublicRefund[] }>(`/v1/payments/${paymentId}/refunds`);
}

export function createRefund(
  paymentId: string,
  body: { amount: string; reason?: string },
): Promise<PublicRefund> {
  return apiFetch<PublicRefund>(`/v1/payments/${paymentId}/refunds`, {
    method: "POST",
    body,
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
}

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------

export interface ReportParams {
  from?: string;
  to?: string;
}

export function getDashboardSummary(params: ReportParams): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>(withQuery("/v1/dashboard/summary", params));
}

export interface SalesReportParams extends ReportParams {
  groupBy?: "day" | "payment_method";
}

export function getSalesReport(params: SalesReportParams): Promise<SalesReport> {
  return apiFetch<SalesReport>(withQuery("/v1/reports/sales", params));
}
