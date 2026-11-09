import type {
  CashDirectionValue,
  CashMovementRecord,
  CashMovementTypeValue,
  CashSessionRecord,
  CashSessionStatusValue,
  ExpenseRecord,
} from "./cash.types.js";

export interface PublicCashSession {
  id: string;
  branchId: string;
  status: CashSessionStatusValue;
  openedByUserId: string;
  openedAt: string;
  openingAmount: string;
  closedByUserId: string | null;
  closedAt: string | null;
  closingAmount?: string;
  expectedAmount?: string;
  difference?: string;
  notes: string | null;
}

export interface PublicCashMovement {
  id: string;
  sessionId: string;
  type: CashMovementTypeValue;
  direction: CashDirectionValue;
  amount: string;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface PublicExpense {
  id: string;
  branchId: string;
  sessionId: string | null;
  category: string;
  amount: string;
  currency: string;
  description: string | null;
  incurredAt: string;
  createdAt: string;
}

export function toPublicCashSession(session: CashSessionRecord): PublicCashSession {
  return {
    id: session.id,
    branchId: session.branchId,
    status: session.status,
    openedByUserId: session.openedByUserId,
    openedAt: session.openedAt.toISOString(),
    openingAmount: session.openingAmountMinor.toString(),
    closedByUserId: session.closedByUserId,
    closedAt: session.closedAt?.toISOString() ?? null,
    ...(session.closingAmountMinor !== null
      ? { closingAmount: session.closingAmountMinor.toString() }
      : {}),
    ...(session.expectedAmountMinor !== null
      ? { expectedAmount: session.expectedAmountMinor.toString() }
      : {}),
    ...(session.differenceMinor !== null ? { difference: session.differenceMinor.toString() } : {}),
    notes: session.notes,
  };
}

export function toPublicCashMovement(movement: CashMovementRecord): PublicCashMovement {
  return {
    id: movement.id,
    sessionId: movement.sessionId,
    type: movement.type,
    direction: movement.direction,
    amount: movement.amountMinor.toString(),
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    description: movement.description,
    createdAt: movement.createdAt.toISOString(),
  };
}

export function toPublicExpense(expense: ExpenseRecord): PublicExpense {
  return {
    id: expense.id,
    branchId: expense.branchId,
    sessionId: expense.sessionId,
    category: expense.category,
    amount: expense.amountMinor.toString(),
    currency: expense.currency,
    description: expense.description,
    incurredAt: expense.incurredAt.toISOString(),
    createdAt: expense.createdAt.toISOString(),
  };
}
