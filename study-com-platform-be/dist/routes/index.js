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
const router = (0, express_1.Router)();
router.use("/admin", admin_routes_1.default);
router.use("/user", user_routes_1.default);
router.use("/post", post_routes_1.default);
router.use("/dashboard", dashboard_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map