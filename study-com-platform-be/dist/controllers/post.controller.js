"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPost = exports.createPost = void 0;
const createPost = async (req, res) => {
    try {
        // 创建帖子逻辑
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
};
exports.createPost = createPost;
const getPost = async (req, res) => {
    try {
        // 获取帖子逻辑
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
    }
};
exports.getPost = getPost;
//# sourceMappingURL=post.controller.js.map