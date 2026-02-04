"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteComment = exports.createComment = void 0;
const createComment = async (req, res) => {
    try {
        // 创建评论逻辑
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
};
exports.createComment = createComment;
const deleteComment = async (req, res) => {
    try {
        // 删除评论逻辑
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
};
exports.deleteComment = deleteComment;
//# sourceMappingURL=comment.controller.js.map