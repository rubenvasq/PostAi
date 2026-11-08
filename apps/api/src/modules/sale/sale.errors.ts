export class SaleNotFoundError extends Error {
  constructor() {
    super("Venta no encontrada");
    this.name = "SaleNotFoundError";
  }
}

export class SaleNotPayableError extends Error {
  constructor(message = "La venta no admite pagos en su estado actual") {
    super(message);
    this.name = "SaleNotPayableError";
  }
}

export class PaymentAlreadyExistsError extends Error {
  constructor() {
    super("La venta ya tiene un pago registrado");
    this.name = "PaymentAlreadyExistsError";
  }
}

export class PaymentAmountMismatchError extends Error {
  constructor() {
    super("El importe del pago no coincide con el total de la venta");
    this.name = "PaymentAmountMismatchError";
  }
}

export class PaymentNotFoundError extends Error {
  constructor() {
    super("Pago no encontrado");
    this.name = "PaymentNotFoundError";
  }
}

export class RefundNotAllowedError extends Error {
  constructor(message = "El pago no admite reembolsos en su estado actual") {
    super(message);
    this.name = "RefundNotAllowedError";
  }
}

export class RefundAmountInvalidError extends Error {
  constructor(message = "El importe del reembolso debe ser igual al saldo del pago") {
    super(message);
    this.name = "RefundAmountInvalidError";
  }
}

export class RefundProviderUnsupportedError extends Error {
  constructor() {
    super("El reembolso con SoftPOS real todavía no está disponible");
    this.name = "RefundProviderUnsupportedError";
  }
}

export class PaymentIdempotencyConflictError extends Error {
  constructor() {
    super("La clave de idempotencia ya fue usada en otra operación");
    this.name = "PaymentIdempotencyConflictError";
  }
}
