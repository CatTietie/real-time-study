import Role from "../models/role.model";
import Permission from "../models/permission.model";
import RolePermission from "../models/role-permission.model";
import UserRole from "../models/user-role.model";
import User from "../models/user.model";
import { PERMISSION_DEFINITIONS } from "../constants/permissions";

const DEFAULT_ROLES = [
  {
    name: "超级管理员",
    code: "super_admin",
    description: "拥有系统全部权限",
    permissionCodes: PERMISSION_DEFINITIONS.map((p) => p.code),
  },
  {
    name: "内容审核员",
    code: "content_reviewer",
    description: "负责社区帖子、评论审核及举报处理",
    permissionCodes: [
      "community.post.review",
      "community.comment.review",
      "community.report.handle",
    ],
  },
  {
    name: "社区管理员",
    code: "community_manager",
    description: "负责社区内容管理及敏感词维护",
    permissionCodes: [
      "community.post.manage",
      "community.comment.manage",
      "community.sensitiveword.manage",
      "community.post.review",
      "community.comment.review",
      "community.report.handle",
    ],
  },
  {
    name: "用户管理员",
    code: "user_manager",
    description: "负责用户账号管理",
    permissionCodes: ["admin.users.manage"],
  },
  {
    name: "内容管理员",
    code: "content_manager",
    description: "负责社区内容全面管理，包括帖子、评论、标签、分类及公告",
    permissionCodes: [
      "community.post.manage",
      "community.comment.manage",
      "community.tag.manage",
      "community.category.manage",
      "community.announcement.manage",
      "community.post.review",
      "community.comment.review",
      "community.report.handle",
      "community.sensitiveword.manage",
    ],
  },
  {
    name: "标签管理员",
    code: "tag_manager",
    description: "负责社区标签的创建、编辑和删除",
    permissionCodes: ["community.tag.manage"],
  },
  {
    name: "分类管理员",
    code: "category_manager",
    description: "负责社区分类的创建、编辑和删除",
    permissionCodes: ["community.category.manage"],
  },
  {
    name: "公告管理员",
    code: "announcement_manager",
    description: "负责社区公告的发布和管理",
    permissionCodes: ["community.announcement.manage"],
  },
  {
    name: "学习资源管理员",
    code: "resource_manager",
    description: "负责学习资源的上传、编辑和管理",
    permissionCodes: ["resource.manage"],
  },
  {
    name: "积分管理员",
    code: "points_manager",
    description: "负责积分规则的配置和管理",
    permissionCodes: ["points.rule.manage"],
  },
  {
    name: "徽章管理员",
    code: "badge_manager",
    description: "负责徽章的创建、编辑和管理",
    permissionCodes: ["badge.manage"],
  },
];

export const seedRoles = async () => {
  let created = 0;
  let skipped = 0;

  // Migrate: fix content_manager role code from "5" to "content_manager"
  const existingContentManager = await Role.findOne({ where: { code: "content_manager" } });
  if (!existingContentManager) {
    const legacyContentManager = await Role.findOne({ where: { code: "5" } });
    if (legacyContentManager && legacyContentManager.name === "内容管理员") {
      await legacyContentManager.update({ code: "content_manager" });
    }
  }

  // Ensure permissions exist
  const existingPerms = await Permission.findAll({
    where: { code: PERMISSION_DEFINITIONS.map((p) => p.code) },
  });
  const existingPermCodes = new Set(existingPerms.map((p) => p.code));
  const permsToCreate = PERMISSION_DEFINITIONS.filter(
    (p) => !existingPermCodes.has(p.code),
  );
  if (permsToCreate.length > 0) {
    await Permission.bulkCreate(permsToCreate);
  }

  const allPerms = await Permission.findAll({
    where: { code: PERMISSION_DEFINITIONS.map((p) => p.code) },
  });
  const permCodeToId = new Map(allPerms.map((p) => [p.code, p.id]));

  for (const roleDef of DEFAULT_ROLES) {
    const existing = await Role.findOne({ where: { code: roleDef.code } });
    if (existing) {
      // Update permissions for existing roles to stay in sync
      const desiredPermIds = roleDef.permissionCodes
        .map((code) => permCodeToId.get(code))
        .filter((id): id is number => id !== undefined);
      const currentPerms = await RolePermission.findAll({ where: { role_id: existing.id } });
      const currentPermIds = new Set(currentPerms.map((rp) => rp.permission_id));
      const toAdd = desiredPermIds.filter((pid) => !currentPermIds.has(pid));
      if (toAdd.length > 0) {
        await RolePermission.bulkCreate(
          toAdd.map((pid) => ({ role_id: existing.id, permission_id: pid })),
        );
      }
      skipped += 1;
      continue;
    }

    const role = await Role.create({
      name: roleDef.name,
      code: roleDef.code,
      description: roleDef.description,
      status: 1,
    });

    const permIds = roleDef.permissionCodes
      .map((code) => permCodeToId.get(code))
      .filter((id): id is number => id !== undefined);

    if (permIds.length > 0) {
      await RolePermission.bulkCreate(
        permIds.map((pid) => ({ role_id: role.id, permission_id: pid })),
      );
    }

    created += 1;
  }

  // Assign super_admin role to all super_admin users who don't have a role yet
  const superAdminRole = await Role.findOne({ where: { code: "super_admin" } });
  if (superAdminRole) {
    const superAdmins = await User.findAll({ where: { role: "super_admin" } });
    for (const admin of superAdmins) {
      const hasRole = await UserRole.findOne({ where: { user_id: admin.id } });
      if (!hasRole) {
        await UserRole.create({ user_id: admin.id, role_id: superAdminRole.id });
      }
    }
  }

  // Assign content_reviewer role to admin users who don't have a role yet
  const reviewerRole = await Role.findOne({ where: { code: "content_reviewer" } });
  if (reviewerRole) {
    const admins = await User.findAll({ where: { role: "admin" } });
    for (const admin of admins) {
      const hasRole = await UserRole.findOne({ where: { user_id: admin.id } });
      if (!hasRole) {
        await UserRole.create({ user_id: admin.id, role_id: reviewerRole.id });
      }
    }
  }

  return { created, skipped };
};
