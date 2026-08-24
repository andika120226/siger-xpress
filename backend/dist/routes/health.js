"use strict";
/**
 * Health Check Route
 * GET /api/v1/health
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiServiceClient_1 = require("../utils/aiServiceClient");
const router = (0, express_1.Router)();
router.get("/health", async (_req, res, next) => {
    try {
        const aiStatus = await (0, aiServiceClient_1.checkAiServiceHealth)();
        res.json({
            status: "healthy",
            service: "marta-backend",
            version: "1.0.0",
            ai_service_status: aiStatus.reachable ? "connected" : "disconnected",
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map