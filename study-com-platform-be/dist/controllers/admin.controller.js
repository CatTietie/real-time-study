"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminStats = void 0;
const getAdminStats = async (req, res) => {
    try {
        // 管理员统计逻辑
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
};
exports.getAdminStats = getAdminStats;
//# sourceMappingURL=admin.controller.js.map