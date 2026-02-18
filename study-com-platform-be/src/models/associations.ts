// 统一定义模型关联关系（集中管理，避免循环依赖）
import User from "./user.model";
import Post from "./post.model";
import Comment from "./comment.model";
import PostLike from "./post-like.model";
import CommentLike from "./comment-like.model";
import Favorite from "./favorite.model";
import FavoriteFolder from "./favorite-folder.model";
import Report from "./report.model";
import AdminLog from "./admin-log.model";
import PointsLog from "./points-log.model";
import PointsRule from "./points-rule.model";
import ContentAudit from "./content-audit.model";
import Role from "./role.model";
import Permission from "./permission.model";
import UserRole from "./user-role.model";
import RolePermission from "./role-permission.model";
import ViewRecord from "./view-record.model";
import StudyRoom from "./study-room.model";
import RoomReservation from "./room-reservation.model";
import RoomOccupancy from "./room-occupancy.model";

export const initAssociations = () => {
  // 用户与帖子/评论/点赞
  User.hasMany(Post, { foreignKey: "user_id" });
  Post.belongsTo(User, { foreignKey: "user_id" });

  User.hasMany(Comment, { foreignKey: "user_id" });
  Comment.belongsTo(User, { foreignKey: "user_id" });

  Post.hasMany(Comment, { foreignKey: "post_id" });
  Comment.belongsTo(Post, { foreignKey: "post_id" });

  User.hasMany(PostLike, { foreignKey: "user_id" });
  PostLike.belongsTo(User, { foreignKey: "user_id" });

  Post.hasMany(PostLike, { foreignKey: "post_id" });
  PostLike.belongsTo(Post, { foreignKey: "post_id" });

  // 评论点赞
  User.hasMany(CommentLike, { foreignKey: "user_id" });
  CommentLike.belongsTo(User, { foreignKey: "user_id" });

  Comment.hasMany(CommentLike, { foreignKey: "comment_id" });
  CommentLike.belongsTo(Comment, { foreignKey: "comment_id" });

  // 收藏夹与收藏
  User.hasMany(FavoriteFolder, { foreignKey: "user_id" });
  FavoriteFolder.belongsTo(User, { foreignKey: "user_id" });

  User.hasMany(Favorite, { foreignKey: "user_id" });
  Favorite.belongsTo(User, { foreignKey: "user_id" });

  Post.hasMany(Favorite, { foreignKey: "post_id" });
  Favorite.belongsTo(Post, { foreignKey: "post_id" });

  FavoriteFolder.hasMany(Favorite, { foreignKey: "folder_id" });
  Favorite.belongsTo(FavoriteFolder, { foreignKey: "folder_id" });

  // 管理操作日志
  User.hasMany(AdminLog, { foreignKey: "admin_id" });
  AdminLog.belongsTo(User, { foreignKey: "admin_id" });

  // 举报（举报人与处理人）
  User.hasMany(Report, { foreignKey: "reporter_id" });
  Report.belongsTo(User, { foreignKey: "reporter_id" });
  User.hasMany(Report, {
    foreignKey: "handler_admin_id",
    as: "handled_reports",
  });
  Report.belongsTo(User, { foreignKey: "handler_admin_id", as: "handler" });

  // 积分流水
  User.hasMany(PointsLog, { foreignKey: "user_id" });
  PointsLog.belongsTo(User, { foreignKey: "user_id" });
  User.hasMany(PointsLog, { foreignKey: "admin_id", as: "admin_points_logs" });
  PointsLog.belongsTo(User, { foreignKey: "admin_id", as: "admin" });

  // 内容审核记录
  User.hasMany(ContentAudit, { foreignKey: "admin_id" });
  ContentAudit.belongsTo(User, { foreignKey: "admin_id" });

  // 积分规则（当前为配置表，无直接关联）

  // RBAC
  User.belongsToMany(Role, { through: UserRole, foreignKey: "user_id" });
  Role.belongsToMany(User, { through: UserRole, foreignKey: "role_id" });
  Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: "role_id",
  });
  Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: "permission_id",
  });

  // 浏览记录关联
  User.hasMany(ViewRecord, { foreignKey: "user_id" });
  ViewRecord.belongsTo(User, { foreignKey: "user_id" });
  
  Post.hasMany(ViewRecord, { foreignKey: "post_id" });
  ViewRecord.belongsTo(Post, { foreignKey: "post_id" });
  
  // 自习室相关关联
  User.hasMany(RoomReservation, { foreignKey: "user_id" });
  RoomReservation.belongsTo(User, { foreignKey: "user_id" });
  
  StudyRoom.hasMany(RoomReservation, { foreignKey: "room_id" });
  RoomReservation.belongsTo(StudyRoom, { foreignKey: "room_id" });
  
  User.hasMany(RoomOccupancy, { foreignKey: "user_id" });
  RoomOccupancy.belongsTo(User, { foreignKey: "user_id" });
  
  StudyRoom.hasMany(RoomOccupancy, { foreignKey: "room_id" });
  RoomOccupancy.belongsTo(StudyRoom, { foreignKey: "room_id" });
};
