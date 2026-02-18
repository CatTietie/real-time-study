"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
const getDashboard = async (req, res) => {
    try {
        const stats = await (0, dashboard_service_1.getDashboardStats)();
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({
            success: false,
            error: message,
        });
    }
};
exports.getDashboard = getDashboard;
//# sourceMappingURL=dashboard.controller.js.map