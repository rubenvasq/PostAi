export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("El correo ya está registrado");
    this.name = "EmailAlreadyRegisteredError";
  }
}
