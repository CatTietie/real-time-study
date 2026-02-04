"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = void 0;
const getDashboard = async (req, res) => {
    try {
        // 获取仪表板数据逻辑
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
};
exports.getDashboard = getDashboard;
//# sourceMappingURL=dashboard.controller.js.map