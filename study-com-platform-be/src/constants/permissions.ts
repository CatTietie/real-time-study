export type PermissionDefinition = {
  name: string;
  code: string;
  module: string;
  description: string;
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    name: "用户管理权限",
    code: "admin.users.manage",
    module: "用户管理",
    description: "允许访问并管理用户列表与用户信息",
  },
  {
    name: "社区帖子审核权限",
    code: "community.post.review",
    module: "社区审核",
    description: "允许审核社区帖子内容",
  },
  {
    name: "社区评论审核权限",
    code: "community.comment.review",
    module: "社区审核",
    description: "允许审核社区评论内容",
  },
  {
    name: "社区举报处理权限",
    code: "community.report.handle",
    module: "社区审核",
    description: "允许处理社区举报记录",
  },
  {
    name: "社区帖子管理权限",
    code: "community.post.manage",
    module: "社区管理",
    description: "允许管理社区帖子列表与相关操作",
  },
  {
    name: "社区评论管理权限",
    code: "community.comment.manage",
    module: "社区管理",
    description: "允许管理社区评论列表与相关操作",
  },
  {
    name: "敏感词库管理权限",
    code: "community.sensitiveword.manage",
    module: "内容安全",
    description: "允许维护敏感词库",
  },
  {
    name: "管理员管理权限",
    code: "admin.admins.manage",
    module: "管理员管理",
    description: "允许管理管理员账号与角色",
  },
];

export const PERMISSION_CODES = PERMISSION_DEFINITIONS.map((item) => item.code);
