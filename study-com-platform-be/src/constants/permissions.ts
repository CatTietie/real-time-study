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
  {
    name: "标签管理权限",
    code: "community.tag.manage",
    module: "内容分类",
    description: "允许创建、编辑和删除社区标签",
  },
  {
    name: "分类管理权限",
    code: "community.category.manage",
    module: "内容分类",
    description: "允许创建、编辑和删除社区分类",
  },
  {
    name: "公告管理权限",
    code: "community.announcement.manage",
    module: "社区运营",
    description: "允许发布、编辑和删除社区公告",
  },
  {
    name: "学习资源管理权限",
    code: "resource.manage",
    module: "学习资源",
    description: "允许上传、编辑和删除学习资源",
  },
  {
    name: "积分规则管理权限",
    code: "points.rule.manage",
    module: "积分系统",
    description: "允许配置和管理积分规则",
  },
  {
    name: "徽章管理权限",
    code: "badge.manage",
    module: "徽章系统",
    description: "允许创建、编辑和管理徽章",
  },
  {
    name: "题库批阅管理权限",
    code: "exercise.review.manage",
    module: "题库管理",
    description: "允许批改主观题、查看批改列表与统计",
  },
  {
    name: "学习路径管理权限",
    code: "learning_path.manage",
    module: "学习路径",
    description: "允许创建、编辑和管理学习路径技能树",
  },
  {
    name: "知识文库上传权限",
    code: "knowledge.upload",
    module: "知识文库",
    description: "允许上传文档到知识文库",
  },
  {
    name: "知识文库管理权限",
    code: "knowledge.manage",
    module: "知识文库",
    description: "允许管理知识文库分类、审核和删除文档",
  },
];

export const PERMISSION_CODES = PERMISSION_DEFINITIONS.map((item) => item.code);
