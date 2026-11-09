export type CashSessionStatusValue = "OPEN" | "CLOSED";

export type CashMovementTypeValue =
  "OPENING" | "SALE" | "REFUND" | "EXPENSE" | "WITHDRAWAL" | "DEPOSIT" | "ADJUSTMENT" | "CLOSING";

export type CashDirectionValue = "IN" | "OUT";

/** Tipos que el cliente puede registrar manualmente en una sesión abierta. */
export type CashManualMovementTypeValue = "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface CashBranchRecord {
  id: string;
}

export interface CashSessionRecord {
  id: string;
  branchId: string;
  status: CashSessionStatusValue;
  openedByUserId: string;
  openedAt: Date;
  openingAmountMinor: bigint;
  closedByUserId: string | null;
  closedAt: Date | null;
  closingAmountMinor: bigint | null;
  expectedAmountMinor: bigint | null;
  differenceMinor: bigint | null;
  notes: string | null;
}

export interface CashMovementRecord {
  id: string;
  sessionId: string;
  type: CashMovementTypeValue;
  direction: CashDirectionValue;
  amountMinor: bigint;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: Date;
}

export interface ExpenseRecord {
  id: string;
  branchId: string;
  sessionId: string | null;
  category: string;
  amountMinor: bigint;
  currency: string;
  description: string | null;
  incurredAt: Date;
  createdAt: Date;
}

export interface CashTotalsRecord {
  inMinor: bigint;
  outMinor: bigint;
}

export interface ListCashSessionsParams {
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export interface ListExpensesParams {
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export interface OpenCashSessionInput {
  merchantId: string;
  branchId: string;
  userId: string;
  openingAmountMinor: bigint;
  notes: string | null;
}

export interface CloseCashSessionInput {
  merchantId: string;
  sessionId: string;
  userId: string;
  closingAmountMinor: bigint;
  notes: string | null;
}

export interface CreateCashMovementInput {
  merchantId: string;
  sessionId: string;
  userId: string;
  type: CashManualMovementTypeValue;
  direction: CashDirectionValue;
  amountMinor: bigint;
  description: string | null;
}

export interface CreateExpenseInput {
  merchantId: string;
  branchId: string;
  sessionId: string | null;
  userId: string;
  category: string;
  amountMinor: bigint;
  currency: string;
  description: string | null;
  incurredAt: Date;
}

export interface CashRepository {
  findBranch(merchantId: string): Promise<CashBranchRecord | null>;
  findOpenSession(merchantId: string, branchId: string): Promise<CashSessionRecord | null>;
  findSession(merchantId: string, sessionId: string): Promise<CashSessionRecord | null>;
  listSessions(
    merchantId: string,
    branchId: string,
    params: ListCashSessionsParams,
  ): Promise<Paginated<CashSessionRecord>>;
  openSession(input: OpenCashSessionInput): Promise<CashSessionRecord>;
  closeSession(input: CloseCashSessionInput): Promise<CashSessionRecord>;
  listMovements(merchantId: string, sessionId: string): Promise<CashMovementRecord[]>;
  createMovement(input: CreateCashMovementInput): Promise<CashMovementRecord>;
  listExpenses(
    merchantId: string,
    branchId: string,
    params: ListExpensesParams,
  ): Promise<Paginated<ExpenseRecord>>;
  createExpense(input: CreateExpenseInput): Promise<ExpenseRecord>;
  getMerchantCurrency(merchantId: string): Promise<string | null>;
}
