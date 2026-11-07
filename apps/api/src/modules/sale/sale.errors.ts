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

export class PaymentIdempotencyConflictError extends Error {
  constructor() {
    super("La clave de idempotencia ya fue usada en otra operación");
    this.name = "PaymentIdempotencyConflictError";
  }
}
