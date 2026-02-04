"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportsByStatus = exports.updateReportStatus = exports.getReportById = exports.getReports = exports.createReport = void 0;
// 举报服务
const report_model_1 = __importDefault(require("../models/report.model"));
const createReport = async (reportData) => {
    return await report_model_1.default.create(reportData);
};
exports.createReport = createReport;
const getReports = async () => {
    return await report_model_1.default.findAll({
        order: [["createdAt", "DESC"]],
    });
};
exports.getReports = getReports;
const getReportById = async (id) => {
    return await report_model_1.default.findByPk(id);
};
exports.getReportById = getReportById;
const updateReportStatus = async (id, status) => {
    return await report_model_1.default.update({ status }, { where: { id } });
};
exports.updateReportStatus = updateReportStatus;
const getReportsByStatus = async (status) => {
    return await report_model_1.default.findAll({
        where: { status },
        order: [["createdAt", "DESC"]],
    });
};
exports.getReportsByStatus = getReportsByStatus;
//# sourceMappingURL=report.service.js.map