"use strict";
/**
 * Warehouse Optimization Proxy
 * POST /api/v1/warehouse/optimize → AI-Service POST /optimize-warehouse
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiServiceClient_1 = require("../utils/aiServiceClient");
const router = (0, express_1.Router)();
router.post("/warehouse/optimize", async (req, res, next) => {
    try {
        const result = await (0, aiServiceClient_1.forwardToAiService)("/optimize-warehouse", req.body);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=warehouse.js.map