export class CashSessionAlreadyOpenError extends Error {
  constructor() {
    super("Ya hay una caja abierta para la sucursal");
    this.name = "CashSessionAlreadyOpenError";
  }
}

export class CashSessionNotOpenError extends Error {
  constructor(message = "La sesión de caja no está abierta") {
    super(message);
    this.name = "CashSessionNotOpenError";
  }
}

export class CashSessionNotFoundError extends Error {
  constructor() {
    super("Sesión de caja no encontrada");
    this.name = "CashSessionNotFoundError";
  }
}
