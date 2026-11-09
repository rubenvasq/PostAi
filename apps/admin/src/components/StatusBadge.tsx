import { Badge, type BadgeTone } from "@/components/ui/badge";
import type {
  CashMovementType,
  CashSessionStatus,
  InventoryMovementType,
  PaymentStatus,
  SaleStatus,
} from "@/lib/types";

const SALE_LABELS: Record<SaleStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Borrador", tone: "neutral" },
  PENDING_PAYMENT: { label: "Pendiente de pago", tone: "warning" },
  PAID: { label: "Pagada", tone: "success" },
  PARTIALLY_REFUNDED: { label: "Reembolso parcial", tone: "info" },
  REFUNDED: { label: "Reembolsada", tone: "info" },
  CANCELLED: { label: "Anulada", tone: "danger" },
};

const PAYMENT_LABELS: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  CREATED: { label: "Creado", tone: "neutral" },
  PENDING: { label: "Pendiente", tone: "warning" },
  PROCESSING: { label: "Procesando", tone: "info" },
  APPROVED: { label: "Aprobado", tone: "success" },
  REJECTED: { label: "Rechazado", tone: "danger" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
  PARTIALLY_REFUNDED: { label: "Reembolso parcial", tone: "info" },
  REFUNDED: { label: "Reembolsado", tone: "info" },
};

const MOVEMENT_LABELS: Record<InventoryMovementType, string> = {
  INITIAL: "Inicial",
  PURCHASE: "Compra",
  SALE: "Venta",
  RETURN: "Devolución",
  ADJUSTMENT: "Ajuste",
  LOSS: "Pérdida",
};

const CASH_SESSION_LABELS: Record<CashSessionStatus, { label: string; tone: BadgeTone }> = {
  OPEN: { label: "Abierta", tone: "success" },
  CLOSED: { label: "Cerrada", tone: "neutral" },
};

const CASH_MOVEMENT_LABELS: Record<CashMovementType, string> = {
  OPENING: "Apertura",
  SALE: "Venta en efectivo",
  REFUND: "Reembolso en efectivo",
  EXPENSE: "Gasto",
  WITHDRAWAL: "Retiro",
  DEPOSIT: "Depósito",
  ADJUSTMENT: "Ajuste",
  CLOSING: "Cierre",
};

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const entry = SALE_LABELS[status];
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const entry = PAYMENT_LABELS[status];
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

export function MovementTypeLabel({ type }: { type: InventoryMovementType }) {
  return <span>{MOVEMENT_LABELS[type]}</span>;
}

export function CashSessionStatusBadge({ status }: { status: CashSessionStatus }) {
  const entry = CASH_SESSION_LABELS[status];
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

export function CashMovementTypeLabel({ type }: { type: CashMovementType }) {
  return <span>{CASH_MOVEMENT_LABELS[type]}</span>;
}

export function SimulatedBadge() {
  return <Badge tone="simulated">Simulado</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "success" : "neutral"}>{active ? "Activo" : "Inactivo"}</Badge>;
}
