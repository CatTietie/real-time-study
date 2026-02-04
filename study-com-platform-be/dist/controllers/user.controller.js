"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = exports.getUser = void 0;
const getUser = async (req, res) => {
    try {
        // 获取用户逻辑
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
};
exports.getUser = getUser;
const updateUser = async (req, res) => {
    try {
        // 更新用户逻辑
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
};
exports.updateUser = updateUser;
//# sourceMappingURL=user.controller.js.map