export class InsufficientStockError extends Error {
  constructor() {
    super("Stock insuficiente");
    this.name = "InsufficientStockError";
  }
}
