"use strict";
/**
 * MARTA-EXPRESS Backend
 * =====================
 * Lightweight, synchronous API proxy between Frontend (Next.js)
 * and AI-Service (FastAPI).
 *
 * Architecture: Frontend :3000 → Backend :5000 → AI-Service :8000
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const health_1 = __importDefault(require("./routes/health"));
const route_1 = __importDefault(require("./routes/route"));
const warehouse_1 = __importDefault(require("./routes/warehouse"));
const vehicle_1 = __importDefault(require("./routes/vehicle"));
const forecasting_1 = __importDefault(require("./routes/forecasting"));
const errorHandler_1 = require("./middleware/errorHandler");
// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || "5000", 10);
const CORS_ORIGINS = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const ALLOWED_ORIGINS = new Set([
    ...CORS_ORIGINS,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://frontend:3000",
]);
// ---------------------------------------------------------------------------
// Express App
// ---------------------------------------------------------------------------
const app = (0, express_1.default)();
// --- Middleware ---
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin || ALLOWED_ORIGINS.has(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: "1mb" }));
// --- API Routes (all under /api/v1) ---
app.use("/api/v1", health_1.default);
app.use("/api/v1", route_1.default);
app.use("/api/v1", warehouse_1.default);
app.use("/api/v1", vehicle_1.default);
app.use("/api/v1", forecasting_1.default);
// --- Global Error Handler (must be last) ---
app.use(errorHandler_1.errorHandler);
// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`[MARTA Backend] Server running on http://localhost:${PORT}`);
    console.log(`[MARTA Backend] API base path: /api/v1`);
    console.log(`[MARTA Backend] AI-Service URL: ${process.env.AI_SERVICE_URL || "http://localhost:8000"}`);
    console.log(`[MARTA Backend] CORS origins: ${Array.from(ALLOWED_ORIGINS).join(", ")}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map