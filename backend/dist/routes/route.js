"use strict";
/**
 * Route Optimization Proxy
 * POST /api/v1/route/optimize → AI-Service POST /optimize-route
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiServiceClient_1 = require("../utils/aiServiceClient");
const router = (0, express_1.Router)();
router.post("/route/optimize", async (req, res, next) => {
    try {
        const result = await (0, aiServiceClient_1.forwardToAiService)("/optimize-route", req.body);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=route.js.map