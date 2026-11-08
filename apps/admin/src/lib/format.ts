const BOGOTA_TIME_ZONE = "America/Bogota";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeZone: BOGOTA_TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: BOGOTA_TIME_ZONE,
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: BOGOTA_TIME_ZONE,
});

export function formatMoney(value: string | number, currency = "COP"): string {
  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(value);
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

export function todayInBogota(): string {
  return dayKeyFormatter.format(new Date());
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const base = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function defaultReportRange(days = 30): { from: string; to: string } {
  const to = todayInBogota();
  return { from: addDaysToDateKey(to, -(days - 1)), to };
}

/** Convierte una fecha de `<input type="date">` a ISO en la zona de Bogotá (UTC-5). */
export function dateKeyToIso(dateKey: string, endOfDay = false): string | undefined {
  if (!dateKey) {
    return undefined;
  }

  return `${dateKey}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}-05:00`;
}

export function shortId(value: string): string {
  return value.slice(0, 8);
}

export function formatRateBp(rateBp: number): string {
  return `${rateBp / 100} %`;
}

export function formatDayKey(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00-05:00`);
  return Number.isNaN(date.getTime()) ? dayKey : dateFormatter.format(date);
}

export function paymentMethodLabel(methodCode: string): string {
  const labels: Record<string, string> = {
    CASH: "Efectivo",
    TRANSFER: "Transferencia",
    CARD_SIMULATED: "Tarjeta simulada",
    CARD_SOFTPOS: "Tarjeta SoftPOS",
    OTHER: "Otro",
  };

  return labels[methodCode] ?? methodCode;
}
