"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensitiveWord = void 0;
// 敏感词库数据模型
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class SensitiveWord extends sequelize_1.Model {
}
exports.SensitiveWord = SensitiveWord;
SensitiveWord.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    word: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: "违禁词条",
    },
    category: {
        type: sequelize_1.DataTypes.STRING(50),
        comment: "分类：政治、色情、暴力等",
    },
}, {
    sequelize: database_1.default,
    modelName: "SensitiveWord",
    tableName: "sensitive_words",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
});
exports.default = SensitiveWord;
//# sourceMappingURL=sensitive-word.model.js.map