import { Request, Response } from "express";
import AuditConfig, { getAuditConfig, clearAuditConfigCache } from "../models/audit-config.model";
import * as adminLogService from "../services/admin-log.service";

export const getConfig = async (req: Request, res: Response) => {
  try {
    const config = await getAuditConfig();
    res.json({
      success: true,
      message: "获取审核策略成功",
      data: config,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取审核策略失败";
    res.status(500).json({ success: false, message });
  }
};

export const updateConfig = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "未授权访问" });
    }

    const { audit_mode, new_user_days_threshold, auto_approve_hours } = req.body;

    if (audit_mode && !["full", "smart", "off"].includes(audit_mode)) {
      return res.status(400).json({ success: false, message: "无效的审核模式" });
    }

    if (new_user_days_threshold !== undefined && (new_user_days_threshold < 1 || new_user_days_threshold > 30)) {
      return res.status(400).json({ success: false, message: "新用户天数阈值应在1-30之间" });
    }

    if (auto_approve_hours !== undefined && (auto_approve_hours < 0 || auto_approve_hours > 168)) {
      return res.status(400).json({ success: false, message: "自动通过小时数应在0-168之间" });
    }

    const config = await getAuditConfig();

    const updateData: any = {};
    if (audit_mode !== undefined) updateData.audit_mode = audit_mode;
    if (new_user_days_threshold !== undefined) updateData.new_user_days_threshold = new_user_days_threshold;
    if (auto_approve_hours !== undefined) updateData.auto_approve_hours = auto_approve_hours;

    await AuditConfig.update(updateData, { where: { id: config.id } });
    clearAuditConfigCache();

    const updated = await getAuditConfig();

    await adminLogService.recordAdminLog(
      req.user.id,
      adminLogService.ActionTypes.SYSTEM_CONFIG,
      "audit_configs",
      config.id,
      `修改审核策略：${JSON.stringify(updateData)}`,
      req,
    );

    res.json({
      success: true,
      message: "审核策略更新成功",
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新审核策略失败";
    res.status(500).json({ success: false, message });
  }
};
