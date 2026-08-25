/**
 * Warehouse Optimization Proxy
 * POST /api/v1/warehouse/optimize → AI-Service POST /optimize-warehouse
 */

import { Router } from "express";
import { forwardToAiService } from "../utils/aiServiceClient";

const router = Router();

router.post("/warehouse/optimize", async (req, res, next) => {
  try {
    const result = await forwardToAiService("/optimize-warehouse", req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
