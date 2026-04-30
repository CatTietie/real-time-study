"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// 用户路由
const express_1 = require("express");
const userController = __importStar(require("../controllers/user.controller"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
router.post("/login", userController.login);
router.post("/register", userController.register);
router.get("/permissions", auth_middleware_1.authMiddleware, userController.getMyPermissions);
// 用户资料相关路由
router.get("/profile/:userId", auth_middleware_1.authMiddleware, userController.getUserProfile);
router.get("/study-stats/:userId", auth_middleware_1.authMiddleware, userController.getUserStudyStats);
router.put("/profile/:userId", auth_middleware_1.authMiddleware, userController.updateUserProfile);
// 头像上传路由
router.post("/avatar", auth_middleware_1.authMiddleware, upload_middleware_1.uploadAvatar.single("avatar"), userController.uploadAvatar);
router.put("/:id/password", auth_middleware_1.authMiddleware, userController.updateUserPassword);
router.get("/:id", auth_middleware_1.authMiddleware, userController.getUser);
router.put("/:id", auth_middleware_1.authMiddleware, userController.updateUser);
exports.default = router;
//# sourceMappingURL=user.routes.js.map