export class UniqueConstraintError extends Error {
  constructor(public readonly field: string) {
    super(`Valor duplicado para ${field}`);
    this.name = "UniqueConstraintError";
  }
}
