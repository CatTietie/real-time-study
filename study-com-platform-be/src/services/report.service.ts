// 举报服务
import Report from "../models/report.model";

export const createReport = async (reportData: any) => {
  return await Report.create(reportData);
};

export const getReports = async () => {
  return await Report.findAll({
    order: [["createdAt", "DESC"]],
  });
};

export const getReportById = async (id: number) => {
  return await Report.findByPk(id);
};

export const updateReportStatus = async (id: number, status: string) => {
  return await Report.update({ status }, { where: { id } });
};

export const getReportsByStatus = async (status: string) => {
  return await Report.findAll({
    where: { status },
    order: [["createdAt", "DESC"]],
  });
};
