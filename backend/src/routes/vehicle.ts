/**
 * Vehicle-Cargo Matching Proxy
 * POST /api/v1/vehicle/match → AI-Service POST /match-vehicle
 */

import { Router } from "express";
import { forwardToAiService } from "../utils/aiServiceClient";

const router = Router();

router.post("/vehicle/match", async (req, res, next) => {
  try {
    const result = await forwardToAiService("/match-vehicle", req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
