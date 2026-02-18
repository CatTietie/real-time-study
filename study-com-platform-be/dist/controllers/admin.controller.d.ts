import { Request, Response } from "express";
/**
 * 管理员登录
 */
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 管理员登出
 */
export declare const logout: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 获取管理员个人信息
 */
export declare const getProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 修改管理员个人信息
 */
export declare const editProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 获取操作日志列表
 */
export declare const getAdminLogs: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 获取操作日志统计
 */
export declare const getAdminLogStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 获取管理员列表（超级管理员）
 */
export declare const getAdmins: (req: Request, res: Response) => Promise<void>;
/**
 * 创建普通管理员（超级管理员）
 */
export declare const createAdmin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * 删除普通管理员（超级管理员）
 */
export declare const deleteAdmin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=admin.controller.d.ts.map