import Report from "../models/report.model";
export declare const createReport: (reportData: any) => Promise<Report>;
export declare const getReports: () => Promise<Report[]>;
export declare const getReportById: (id: number) => Promise<Report | null>;
export declare const updateReportStatus: (id: number, status: string) => Promise<[affectedCount: number]>;
export declare const getReportsByStatus: (status: string) => Promise<Report[]>;
//# sourceMappingURL=report.service.d.ts.map