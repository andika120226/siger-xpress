/**
 * Route Optimization Proxy
 * POST /api/v1/route/optimize → AI-Service POST /optimize-route
 */

import { Router } from "express";
import { forwardToAiService } from "../utils/aiServiceClient";

const router = Router();

router.post("/route/optimize", async (req, res, next) => {
  try {
    const result = await forwardToAiService("/optimize-route", req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
