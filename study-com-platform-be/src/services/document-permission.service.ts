import DocumentPermission from "../models/document-permission.model";
import KnowledgeDocument from "../models/knowledge-document.model";
import User from "../models/user.model";
import UserRole from "../models/user-role.model";
import { sequelize } from "../config/sequelize";
import { Op } from "sequelize";

export type PermissionLevel = "view" | "comment" | "edit" | "manage";

const PERMISSION_RANK: Record<PermissionLevel, number> = {
  view: 1,
  comment: 2,
  edit: 3,
  manage: 4,
};

export class DocumentPermissionService {
  static getHigherLevel(a: PermissionLevel | null, b: PermissionLevel): PermissionLevel {
    if (!a) return b;
    return PERMISSION_RANK[a] >= PERMISSION_RANK[b] ? a : b;
  }

  static meetsMinimum(level: PermissionLevel | null, minLevel: PermissionLevel): boolean {
    if (!level) return false;
    return PERMISSION_RANK[level] >= PERMISSION_RANK[minLevel];
  }

  static async getEffectivePermission(
    documentId: number,
    userId: number,
    userRole: string
  ): Promise<PermissionLevel | null> {
    if (userRole === "admin" || userRole === "super_admin") {
      return "manage";
    }

    const document = await KnowledgeDocument.findByPk(documentId, {
      attributes: ["uploader_id"],
    });
    if (!document) return null;

    if (document.uploader_id === userId) {
      return "manage";
    }

    const permissions = await DocumentPermission.findAll({
      where: { document_id: documentId },
    });

    if (permissions.length === 0) {
      return "comment";
    }

    let effective: PermissionLevel | null = null;

    for (const perm of permissions) {
      if (perm.target_type === "all") {
        effective = this.getHigherLevel(effective, perm.permission_level);
      }
    }

    const userRoles = await UserRole.findAll({
      where: { user_id: userId },
      attributes: ["role_id"],
    });
    const userRoleIds = userRoles.map((ur: any) => ur.role_id);

    for (const perm of permissions) {
      if (perm.target_type === "role" && perm.target_id && userRoleIds.includes(perm.target_id)) {
        effective = this.getHigherLevel(effective, perm.permission_level);
      }
    }

    for (const perm of permissions) {
      if (perm.target_type === "user" && perm.target_id === userId) {
        effective = this.getHigherLevel(effective, perm.permission_level);
      }
    }

    return effective;
  }

  static async listPermissions(documentId: number) {
    return DocumentPermission.findAll({
      where: { document_id: documentId },
      include: [
        { model: User, as: "GrantedByUser", attributes: ["id", "username", "nickname"] },
        { model: User, as: "TargetUser", attributes: ["id", "username", "nickname"], required: false },
      ],
      order: [["created_at", "DESC"]],
    });
  }

  static async grantPermission(
    documentId: number,
    targetType: "all" | "role" | "user",
    targetId: number | null,
    permissionLevel: PermissionLevel,
    grantedBy: number
  ) {
    const where: any = {
      document_id: documentId,
      target_type: targetType,
    };
    if (targetType === "all") {
      where.target_id = null;
    } else {
      where.target_id = targetId;
    }

    const [permission, created] = await DocumentPermission.findOrCreate({
      where,
      defaults: {
        document_id: documentId,
        target_type: targetType,
        target_id: targetType === "all" ? null : targetId,
        permission_level: permissionLevel,
        granted_by: grantedBy,
      },
    });

    if (!created) {
      await permission.update({ permission_level: permissionLevel, granted_by: grantedBy });
    }

    return permission;
  }

  static async revokePermission(permissionId: number) {
    const perm = await DocumentPermission.findByPk(permissionId);
    if (!perm) return false;
    await perm.destroy();
    return true;
  }

  static async batchSetPermissions(
    documentId: number,
    permissions: Array<{
      target_type: "all" | "role" | "user";
      target_id: number | null;
      permission_level: PermissionLevel;
    }>,
    grantedBy: number
  ) {
    return sequelize.transaction(async (t) => {
      await DocumentPermission.destroy({
        where: { document_id: documentId },
        transaction: t,
      });

      if (permissions.length === 0) return [];

      const records = permissions.map((p) => ({
        document_id: documentId,
        target_type: p.target_type,
        target_id: p.target_type === "all" ? null : p.target_id,
        permission_level: p.permission_level,
        granted_by: grantedBy,
      }));

      return DocumentPermission.bulkCreate(records, { transaction: t });
    });
  }
}

export default DocumentPermissionService;
