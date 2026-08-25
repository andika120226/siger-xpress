import { Router, Request, Response, NextFunction } from "express";
import { forwardToAiService } from "../utils/aiServiceClient";

const router = Router();

router.post(
  "/demand/predict",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Forward to AI-Service: POST /predict-demand
      const result = await forwardToAiService("/predict-demand", req.body);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
