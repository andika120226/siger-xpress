/**
 * Global Error Handler Middleware
 * ================================
 * Catches all unhandled errors and returns a consistent JSON response.
 */

import type { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.statusCode || 500;
  const message = err.message || "Internal server error";

  console.error(`[ERROR ${status}] ${message}`);

  res.status(status).json({
    error: true,
    status,
    message,
    timestamp: new Date().toISOString(),
  });
}
