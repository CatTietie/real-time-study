"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensitiveWord = void 0;
// 敏感词库数据模型
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../config/sequelize");
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
    status: {
        type: sequelize_1.DataTypes.TINYINT,
        defaultValue: 1,
        comment: "状态：1-启用, 0-禁用",
    },
    level: {
        type: sequelize_1.DataTypes.TINYINT,
        defaultValue: 1,
        comment: "等级：1-拦截, 2-提示, 3-复审",
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: "SensitiveWord",
    tableName: "sensitive_words",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["status"] }, { fields: ["level"] }],
});
exports.default = SensitiveWord;
//# sourceMappingURL=sensitive-word.model.js.map