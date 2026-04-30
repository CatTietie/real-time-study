"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 路由总入口
const express_1 = require("express");
const admin_routes_1 = __importDefault(require("./admin.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const post_routes_1 = __importDefault(require("./post.routes"));
const dashboard_routes_1 = __importDefault(require("./dashboard.routes"));
const community_routes_1 = __importDefault(require("./community.routes"));
const learning_goal_routes_1 = __importDefault(require("./learning-goal.routes"));
const study_room_routes_1 = __importDefault(require("./study-room.routes"));
const chat_routes_1 = __importDefault(require("./chat.routes")); // 新增
const whiteboard_routes_1 = __importDefault(require("./whiteboard.routes")); // 新增
const user_management_routes_1 = __importDefault(require("./user-management.routes")); // 用户管理
const notification_routes_1 = __importDefault(require("./notification.routes")); // 通知路由
const router = (0, express_1.Router)();
router.use("/admin", admin_routes_1.default);
router.use("/user", user_routes_1.default);
router.use("/post", post_routes_1.default);
router.use("/dashboard", dashboard_routes_1.default);
router.use("/community", community_routes_1.default);
router.use("/learning-goals", learning_goal_routes_1.default);
router.use("/study-rooms", study_room_routes_1.default);
router.use("/chat", chat_routes_1.default); // 新增
router.use("/whiteboard", whiteboard_routes_1.default); // 新增
router.use("/user-management", user_management_routes_1.default); // 用户管理
router.use("/notifications", notification_routes_1.default); // 通知路由
exports.default = router;
//# sourceMappingURL=index.js.map