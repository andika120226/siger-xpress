/**
 * Health Check Route
 * GET /api/v1/health
 */

import { Router } from "express";
import { checkAiServiceHealth } from "../utils/aiServiceClient";

const router = Router();

router.get("/health", async (_req, res, next) => {
  try {
    const aiStatus = await checkAiServiceHealth();

    res.json({
      status: "healthy",
      service: "marta-backend",
      version: "1.0.0",
      ai_service_status: aiStatus.reachable ? "connected" : "disconnected",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
