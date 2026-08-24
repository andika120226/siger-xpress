"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiServiceClient_1 = require("../utils/aiServiceClient");
const router = (0, express_1.Router)();
router.post("/demand/predict", async (req, res, next) => {
    try {
        // Forward to AI-Service: POST /predict-demand
        const result = await (0, aiServiceClient_1.forwardToAiService)("/predict-demand", req.body);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=forecasting.js.map