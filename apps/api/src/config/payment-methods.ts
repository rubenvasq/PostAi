export interface DefaultPaymentMethod {
  code: string;
  name: string;
  type: "CASH" | "TRANSFER" | "CARD_SIMULATED" | "CARD_SOFTPOS";
  isSimulated: boolean;
  requiresProvider: boolean;
  isActive: boolean;
  sortOrder: number;
}

// Métodos disponibles para todo comercio nuevo. `CARD_SOFTPOS` queda inactivo
// hasta validar proveedor, SDK y sandbox (PAY-001 / ARQ-004).
export const DEFAULT_PAYMENT_METHODS: readonly DefaultPaymentMethod[] = [
  {
    code: "CASH",
    name: "Efectivo",
    type: "CASH",
    isSimulated: false,
    requiresProvider: false,
    isActive: true,
    sortOrder: 1,
  },
  {
    code: "TRANSFER",
    name: "Transferencia",
    type: "TRANSFER",
    isSimulated: false,
    requiresProvider: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    code: "CARD_SIMULATED",
    name: "Tarjeta (simulada)",
    type: "CARD_SIMULATED",
    isSimulated: true,
    requiresProvider: false,
    isActive: true,
    sortOrder: 3,
  },
  {
    code: "CARD_SOFTPOS",
    name: "Tarjeta (SoftPOS)",
    type: "CARD_SOFTPOS",
    isSimulated: false,
    requiresProvider: true,
    isActive: false,
    sortOrder: 4,
  },
];
