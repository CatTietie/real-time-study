"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleReport = exports.getReports = exports.createReport = void 0;
const sequelize_1 = require("sequelize");
const report_model_1 = __importDefault(require("../models/report.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const post_model_1 = __importDefault(require("../models/post.model"));
const comment_model_1 = __importDefault(require("../models/comment.model"));
const createReport = async (req, res) => {
    try {
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
        const { page = 1, pageSize = 20, status, keyword, targetType } = req.query;
        const where = {};
        if (status !== undefined) {
            where.status = Number(status);
        }
        if (targetType) {
            where.target_type = String(targetType);
        }
        if (keyword) {
            where.reason = { [sequelize_1.Op.like]: `%${keyword}%` };
        }
        const result = await report_model_1.default.findAndCountAll({
            where,
            include: [
                { model: user_model_1.default, attributes: ["id", "username", "nickname"] },
                {
                    model: user_model_1.default,
                    as: "handler",
                    attributes: ["id", "username", "nickname"],
                },
            ],
            order: [[sequelize_1.Sequelize.col("created_at"), "DESC"]],
            offset: (Number(page) - 1) * Number(pageSize),
            limit: Number(pageSize),
        });
        const rows = result.rows.map((report) => report.toJSON());
        const postIds = rows
            .filter((item) => item.target_type === "post")
            .map((item) => item.target_id);
        const commentIds = rows
            .filter((item) => item.target_type === "comment")
            .map((item) => item.target_id);
        const [posts, comments] = await Promise.all([
            postIds.length
                ? post_model_1.default.findAll({
                    where: { id: postIds },
                    attributes: ["id", "title", "status", "publish_status"],
                })
                : Promise.resolve([]),
            commentIds.length
                ? comment_model_1.default.findAll({
                    where: { id: commentIds },
                    attributes: ["id", "content", "status"],
                })
                : Promise.resolve([]),
        ]);
        const postMap = new Map(posts.map((item) => [item.id, item]));
        const commentMap = new Map(comments.map((item) => [item.id, item]));
        const data = rows.map((item) => {
            const target = item.target_type === "post"
                ? postMap.get(item.target_id)
                : commentMap.get(item.target_id);
            return {
                ...item,
                target: target ? (target.toJSON?.() ?? target) : null,
            };
        });
        res.json({
            success: true,
            message: "获取举报成功",
            data,
            pagination: {
                page: Number(page),
                pageSize: Number(pageSize),
                total: result.count,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "获取举报失败";
        res.status(500).json({ success: false, message });
    }
};
exports.getReports = getReports;
const handleReport = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "未授权访问" });
        }
        const id = Number(req.params.id);
        const { handleResult, action } = req.body;
        const report = await report_model_1.default.findByPk(id);
        if (!report) {
            return res.status(404).json({ success: false, message: "举报不存在" });
        }
        if (report.target_type === "post" && action) {
            const post = await post_model_1.default.findByPk(report.target_id);
            if (post) {
                const nextStatus = action === "approve" ? 1 : 2;
                await post.update({
                    status: nextStatus,
                    audit_admin_id: req.user.id,
                    audit_reason: handleResult,
                    audit_at: new Date(),
                });
            }
        }
        await report.update({
            status: 1,
            handle_result: handleResult,
            handler_admin_id: req.user.id,
            handled_at: new Date(),
        });
        res.json({ success: true, message: "处理成功", data: report });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "处理失败";
        res.status(500).json({ success: false, message });
    }
};
exports.handleReport = handleReport;
//# sourceMappingURL=report.controller.js.map