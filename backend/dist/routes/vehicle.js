"use strict";
/**
 * Vehicle-Cargo Matching Proxy
 * POST /api/v1/vehicle/match → AI-Service POST /match-vehicle
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiServiceClient_1 = require("../utils/aiServiceClient");
const router = (0, express_1.Router)();
router.post("/vehicle/match", async (req, res, next) => {
    try {
        const result = await (0, aiServiceClient_1.forwardToAiService)("/match-vehicle", req.body);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=vehicle.js.map