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
import ChatRoom from "./chat-room.model";
import ChatMessage from "./chat-message.model";
import Whiteboard from "./whiteboard.model";
import WhiteboardAction from "./whiteboard-action.model";
import WhiteboardSnapshot from "./whiteboard-snapshot.model";
import Notification from "./notification.model";

export const initAssociations = () => {
  // 用户与帖子/评论/点赞
  User.hasMany(Post, { foreignKey: "user_id" });
  Post.belongsTo(User, { foreignKey: "user_id" });

  // 转发关联：帖子自关联（原帖）
  Post.belongsTo(Post, { foreignKey: "forward_post_id", as: "ForwardPost" });
  Post.hasMany(Post, { foreignKey: "forward_post_id", as: "ForwardedPosts" });

  // 转发关联：被转发的原作者
  Post.belongsTo(User, { foreignKey: "forward_user_id", as: "ForwardUser" });

  User.hasMany(Comment, { foreignKey: "user_id" });
  Comment.belongsTo(User, { foreignKey: "user_id" });

  Post.hasMany(Comment, { foreignKey: "post_id" });
  Comment.belongsTo(Post, { foreignKey: "post_id" });

  // 评论自关联（楼中楼）
  Comment.belongsTo(Comment, { foreignKey: "parent_id", as: "ParentComment" });
  Comment.hasMany(Comment, { foreignKey: "parent_id", as: "Replies" });

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
  
  // 聊天相关关联
  // 聊天房间与用户关联
  User.hasMany(ChatRoom, { foreignKey: "created_by" });
  ChatRoom.belongsTo(User, { foreignKey: "created_by", as: "createdBy" });

  // 聊天消息关联
  ChatRoom.hasMany(ChatMessage, { foreignKey: "room_id" });
  ChatMessage.belongsTo(ChatRoom, { foreignKey: "room_id" });
  User.hasMany(ChatMessage, { foreignKey: "user_id" });
  ChatMessage.belongsTo(User, { foreignKey: "user_id" });

  // 白板关联
  ChatRoom.hasOne(Whiteboard, { foreignKey: "room_id" });
  Whiteboard.belongsTo(ChatRoom, { foreignKey: "room_id" });
  Whiteboard.hasMany(WhiteboardAction, { foreignKey: "whiteboard_id" });
  WhiteboardAction.belongsTo(Whiteboard, { foreignKey: "whiteboard_id" });
  User.hasMany(WhiteboardAction, { foreignKey: "user_id" });
  WhiteboardAction.belongsTo(User, { foreignKey: "user_id" });
  
  // 白板快照关联
  Whiteboard.hasMany(WhiteboardSnapshot, { foreignKey: "whiteboard_id" });
  WhiteboardSnapshot.belongsTo(Whiteboard, { foreignKey: "whiteboard_id" });
  User.hasMany(WhiteboardSnapshot, { foreignKey: "user_id" });
  WhiteboardSnapshot.belongsTo(User, { foreignKey: "user_id" });
  
  // 通知关联
  User.hasMany(Notification, { foreignKey: "user_id" });
  Notification.belongsTo(User, { foreignKey: "user_id" });
  
  RoomReservation.hasMany(Notification, { foreignKey: "reservation_id", constraints: false });
  Notification.belongsTo(RoomReservation, { foreignKey: "reservation_id", as: "Reservation", constraints: false });
  
  ChatRoom.hasMany(Notification, { foreignKey: "chat_room_id", constraints: false });
  Notification.belongsTo(ChatRoom, { foreignKey: "chat_room_id", as: "ChatRoom", constraints: false });
};
