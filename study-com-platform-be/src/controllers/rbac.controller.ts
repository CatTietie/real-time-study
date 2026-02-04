import { Request, Response } from "express";
import Role from "../models/role.model";
import Permission from "../models/permission.model";
import RolePermission from "../models/role-permission.model";
import UserRole from "../models/user-role.model";
import User from "../models/user.model";
import { PERMISSION_DEFINITIONS } from "../constants/permissions";

export const getRoles = async (_req: Request, res: Response) => {
  const roles = await Role.findAll({ order: [["created_at", "DESC"]] });
  res.json({ success: true, data: roles });
};

export const createRole = async (req: Request, res: Response) => {
  const { name, description, permissionIds } = req.body as {
    name?: string;
    description?: string;
    permissionIds?: number[];
  };
  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "角色名称不能为空" });
  }
  const tempCode = `role_tmp_${Date.now()}`;
  const role = await Role.create({
    name,
    code: tempCode,
    description,
    status: 1,
  });
  await role.update({ code: String(role.id) });
  if (Array.isArray(permissionIds) && permissionIds.length > 0) {
    await RolePermission.bulkCreate(
      permissionIds.map((pid) => ({ role_id: role.id, permission_id: pid })),
    );
  }
  res.json({ success: true, data: role });
};

export const getPermissions = async (_req: Request, res: Response) => {
  const existing = await Permission.findAll({
    where: { code: PERMISSION_DEFINITIONS.map((item) => item.code) },
  });
  const existingCodes = new Set(existing.map((item) => item.code));
  const toCreate = PERMISSION_DEFINITIONS.filter(
    (item) => !existingCodes.has(item.code),
  );
  if (toCreate.length > 0) {
    await Permission.bulkCreate(toCreate);
  }

  const permissions = await Permission.findAll({
    where: { code: PERMISSION_DEFINITIONS.map((item) => item.code) },
    order: [["id", "ASC"]],
  });
  res.json({ success: true, data: permissions });
};

export const setRolePermissions = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { permissionIds } = req.body as { permissionIds: number[] };

  const role = await Role.findByPk(Number(id));
  if (!role) {
    return res.status(404).json({ success: false, message: "角色不存在" });
  }

  await RolePermission.destroy({ where: { role_id: role.id } });
  if (Array.isArray(permissionIds) && permissionIds.length > 0) {
    await RolePermission.bulkCreate(
      permissionIds.map((pid) => ({ role_id: role.id, permission_id: pid })),
    );
  }

  res.json({ success: true, message: "权限已更新" });
};

export const setAdminRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { roleId } = req.body as { roleId: number };

  const admin = await User.findByPk(Number(id));
  if (!admin) {
    return res.status(404).json({ success: false, message: "管理员不存在" });
  }
  if (admin.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "仅可给普通管理员分配角色" });
  }

  const role = await Role.findByPk(Number(roleId));
  if (!role) {
    return res.status(404).json({ success: false, message: "角色不存在" });
  }

  await UserRole.destroy({ where: { user_id: admin.id } });
  await UserRole.create({ user_id: admin.id, role_id: role.id });

  res.json({ success: true, message: "分配角色成功" });
};
