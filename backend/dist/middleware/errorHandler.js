"use strict";
/**
 * Global Error Handler Middleware
 * ================================
 * Catches all unhandled errors and returns a consistent JSON response.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
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
//# sourceMappingURL=errorHandler.js.map