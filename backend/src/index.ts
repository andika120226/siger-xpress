/**
 * MARTA-EXPRESS Backend
 * =====================
 * Lightweight, synchronous API proxy between Frontend (Next.js)
 * and AI-Service (FastAPI).
 *
 * Architecture: Frontend :3000 → Backend :5000 → AI-Service :8000
 */

import express from "express";
import cors from "cors";

import healthRouter from "./routes/health";
import routeRouter from "./routes/route";
import warehouseRouter from "./routes/warehouse";
import vehicleRouter from "./routes/vehicle";
import forecastingRouter from "./routes/forecasting";
import { errorHandler } from "./middleware/errorHandler";

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
const app = express();

// --- Middleware ---
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// --- API Routes (all under /api/v1) ---
app.use("/api/v1", healthRouter);
app.use("/api/v1", routeRouter);
app.use("/api/v1", warehouseRouter);
app.use("/api/v1", vehicleRouter);
app.use("/api/v1", forecastingRouter);

// --- Global Error Handler (must be last) ---
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[MARTA Backend] Server running on http://localhost:${PORT}`);
  console.log(`[MARTA Backend] API base path: /api/v1`);
  console.log(
    `[MARTA Backend] AI-Service URL: ${process.env.AI_SERVICE_URL || "http://localhost:8000"}`
  );
  console.log(`[MARTA Backend] CORS origins: ${Array.from(ALLOWED_ORIGINS).join(", ")}`);
});

export default app;
