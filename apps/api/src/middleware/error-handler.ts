import type { ErrorRequestHandler, RequestHandler } from "express";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : undefined;

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
    });
    return;
  }

  console.error("[api] Error no controlado:", error);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Error interno del servidor",
      requestId,
    },
  });
};
