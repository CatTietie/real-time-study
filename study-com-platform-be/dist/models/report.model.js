"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Report = void 0;
// 举报数据模型
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Report extends sequelize_1.Model {
}
exports.Report = Report;
Report.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    reporter_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "举报人ID",
    },
    target_type: {
        type: sequelize_1.DataTypes.ENUM("post", "comment"),
        allowNull: false,
        comment: "举报对象类型",
    },
    target_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        comment: "被举报的对象ID",
    },
    reason: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        comment: "举报理由（如垃圾广告、人身攻击）",
    },
    status: {
        type: sequelize_1.DataTypes.TINYINT,
        defaultValue: 0,
        comment: "处理状态：0-待处理, 1-已处理",
    },
    handle_result: {
        type: sequelize_1.DataTypes.STRING(255),
        comment: "处理结论（如 忽略、删除内容并扣分）",
    },
}, {
    sequelize: database_1.default,
    modelName: "Report",
    tableName: "reports",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
});
exports.default = Report;
//# sourceMappingURL=report.model.js.map