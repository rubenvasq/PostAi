import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { InventoryMovementType, PaymentStatus, SaleStatus } from "@/lib/types";

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

export function SimulatedBadge() {
  return <Badge tone="simulated">Simulado</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "success" : "neutral"}>{active ? "Activo" : "Inactivo"}</Badge>;
}
