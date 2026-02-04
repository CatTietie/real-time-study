"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReports = exports.createReport = void 0;
const createReport = async (req, res) => {
    try {
        // 创建举报逻辑
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
};
exports.createReport = createReport;
const getReports = async (req, res) => {
    try {
        // 获取举报列表逻辑
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
};
exports.getReports = getReports;
//# sourceMappingURL=report.controller.js.map