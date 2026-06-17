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
import Professional from "./professional.model";
import Category from "./category.model";
import QuestionBank from "./question-bank.model";
import Question from "./question.model";
import UserExerciseRecord from "./user-exercise-record.model";
import UserAnswerDetail from "./user-answer-detail.model";
import WrongBook from "./wrong-book.model";
import UserStats from "./user-stats.model";
import QuestionPost from "./question-post.model";
import AuditConfig from "./audit-config.model";
import DailyQuestionAnswer from "./daily-question-answer.model";
import QuestionFeedback from "./question-feedback.model";
import UserTagMastery from "./user-tag-mastery.model";
import CollaborativeNote from "./collaborative-note.model";
import NoteVersion from "./note-version.model";
import NoteComment from "./note-comment.model";
import UserRecommendation from "./user-recommendation.model";
import RecommendationFeedback from "./recommendation-feedback.model";
import LearningPath from "./learning-path.model";
import PathNode from "./path-node.model";
import PathEdge from "./path-edge.model";
import PathNodeResource from "./path-node-resource.model";
import UserLearningPath from "./user-learning-path.model";
import UserNodeProgress from "./user-node-progress.model";
import AiChatHistory from "./ai-chat-history.model";
import RoomRecording from "./room-recording.model";
import UserLoginLog from "./user-login-log.model";
import CodeExecution from "./code-execution.model";
import CodeProblem from "./code-problem.model";
import ProblemTestCase from "./problem-test-case.model";
import CodeSubmission from "./code-submission.model";
import KnowledgeCategory from "./knowledge-category.model";
import KnowledgeDocument from "./knowledge-document.model";
import DocumentVersion from "./document-version.model";
import DocumentAnnotation from "./document-annotation.model";
import DocumentPermission from "./document-permission.model";
import MallProduct from "./mall-product.model";
import MallOrder from "./mall-order.model";
import UserDecoration from "./user-decoration.model";
import MallBanner from "./mall-banner.model";

export const initAssociations = () => {
  // 用户与登录日志
  User.hasMany(UserLoginLog, { foreignKey: "user_id" });
  UserLoginLog.belongsTo(User, { foreignKey: "user_id" });

  // 用户与帖子/评论/点赞
  User.hasMany(Post, { foreignKey: "user_id" });
  Post.belongsTo(User, { foreignKey: "user_id" });

  // 转发关联：帖子自关联（原帖）
  Post.belongsTo(Post, { foreignKey: "forward_post_id", as: "ForwardPost" });
  Post.hasMany(Post, { foreignKey: "forward_post_id", as: "ForwardedPosts" });

  // 转发关联：被转发的原作者
  Post.belongsTo(User, { foreignKey: "forward_user_id", as: "ForwardUser" });

  // 帖子关联题目（题库讨论帖）
  Post.belongsTo(Question, { foreignKey: "question_id", as: "LinkedQuestion" });
  Question.hasMany(Post, { foreignKey: "question_id", as: "DiscussionPosts" });

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

  // 视频自习室房主
  StudyRoom.belongsTo(User, { foreignKey: "owner_id", as: "Owner" });
  User.hasMany(StudyRoom, { foreignKey: "owner_id", as: "OwnedVideoRooms" });
  
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

  // ===== 题库系统关联 =====

  // 专业 -> 分类
  Professional.hasMany(Category, { foreignKey: "professional_id" });
  Category.belongsTo(Professional, { foreignKey: "professional_id" });

  // 分类自关联（树形结构）
  Category.belongsTo(Category, { foreignKey: "parent_id", as: "Parent" });
  Category.hasMany(Category, { foreignKey: "parent_id", as: "Children" });

  // 分类 -> 题库
  Category.hasMany(QuestionBank, { foreignKey: "category_id" });
  QuestionBank.belongsTo(Category, { foreignKey: "category_id" });

  // 题库 -> 题目
  QuestionBank.hasMany(Question, { foreignKey: "bank_id" });
  Question.belongsTo(QuestionBank, { foreignKey: "bank_id" });

  // 用户 -> 练习记录
  User.hasMany(UserExerciseRecord, { foreignKey: "user_id" });
  UserExerciseRecord.belongsTo(User, { foreignKey: "user_id" });

  // 题库 -> 练习记录
  QuestionBank.hasMany(UserExerciseRecord, { foreignKey: "bank_id" });
  UserExerciseRecord.belongsTo(QuestionBank, { foreignKey: "bank_id" });

  // 练习记录 -> 答题详情
  UserExerciseRecord.hasMany(UserAnswerDetail, { foreignKey: "record_id" });
  UserAnswerDetail.belongsTo(UserExerciseRecord, { foreignKey: "record_id" });

  // 题目 -> 答题详情
  Question.hasMany(UserAnswerDetail, { foreignKey: "question_id" });
  UserAnswerDetail.belongsTo(Question, { foreignKey: "question_id" });

  // 批改人 -> 答题详情
  User.hasMany(UserAnswerDetail, { foreignKey: "reviewer_id", as: "ReviewedAnswers" });
  UserAnswerDetail.belongsTo(User, { foreignKey: "reviewer_id", as: "Reviewer" });

  // 用户 -> 错题本
  User.hasMany(WrongBook, { foreignKey: "user_id" });
  WrongBook.belongsTo(User, { foreignKey: "user_id" });

  // 题目 -> 错题本
  Question.hasMany(WrongBook, { foreignKey: "question_id" });
  WrongBook.belongsTo(Question, { foreignKey: "question_id" });

  // 用户 -> 统计
  User.hasOne(UserStats, { foreignKey: "user_id" });
  UserStats.belongsTo(User, { foreignKey: "user_id" });

  // 题目 -> 讨论帖
  Question.hasMany(QuestionPost, { foreignKey: "question_id" });
  QuestionPost.belongsTo(Question, { foreignKey: "question_id" });

  // 用户 -> 讨论帖
  User.hasMany(QuestionPost, { foreignKey: "user_id" });
  QuestionPost.belongsTo(User, { foreignKey: "user_id" });

  // 题目反馈（点赞/点踩）
  User.hasMany(QuestionFeedback, { foreignKey: "user_id" });
  QuestionFeedback.belongsTo(User, { foreignKey: "user_id" });
  Question.hasMany(QuestionFeedback, { foreignKey: "question_id" });
  QuestionFeedback.belongsTo(Question, { foreignKey: "question_id" });

  // 用户 -> 知识点掌握度
  User.hasMany(UserTagMastery, { foreignKey: "user_id" });
  UserTagMastery.belongsTo(User, { foreignKey: "user_id" });

  // ===== 每日一题 =====
  User.hasMany(DailyQuestionAnswer, { foreignKey: "user_id" });
  DailyQuestionAnswer.belongsTo(User, { foreignKey: "user_id" });
  Question.hasMany(DailyQuestionAnswer, { foreignKey: "question_id" });
  DailyQuestionAnswer.belongsTo(Question, { foreignKey: "question_id" });

  // ===== 协作笔记版本与评论 =====
  CollaborativeNote.hasMany(NoteVersion, { foreignKey: "note_id" });
  NoteVersion.belongsTo(CollaborativeNote, { foreignKey: "note_id" });
  User.hasMany(NoteVersion, { foreignKey: "creator_id" });
  NoteVersion.belongsTo(User, { foreignKey: "creator_id" });

  CollaborativeNote.hasMany(NoteComment, { foreignKey: "note_id" });
  NoteComment.belongsTo(CollaborativeNote, { foreignKey: "note_id" });
  User.hasMany(NoteComment, { foreignKey: "user_id" });
  NoteComment.belongsTo(User, { foreignKey: "user_id" });
  NoteComment.belongsTo(NoteComment, { foreignKey: "parent_id", as: "ParentComment" });
  NoteComment.hasMany(NoteComment, { foreignKey: "parent_id", as: "Replies" });

  // ===== 个性化推荐 =====
  User.hasMany(UserRecommendation, { foreignKey: "user_id", as: "Recommendations" });
  UserRecommendation.belongsTo(User, { foreignKey: "user_id" });
  UserRecommendation.belongsTo(Post, { foreignKey: "target_id", constraints: false, as: "Post" });
  UserRecommendation.belongsTo(StudyRoom, { foreignKey: "target_id", constraints: false, as: "StudyRoom" });
  UserRecommendation.hasMany(RecommendationFeedback, { foreignKey: "recommendation_id", as: "Feedbacks" });
  RecommendationFeedback.belongsTo(UserRecommendation, { foreignKey: "recommendation_id" });
  RecommendationFeedback.belongsTo(User, { foreignKey: "user_id" });

  // ===== 学习路径技能树 =====
  LearningPath.hasMany(PathNode, { foreignKey: "path_id", as: "Nodes" });
  PathNode.belongsTo(LearningPath, { foreignKey: "path_id" });

  LearningPath.hasMany(PathEdge, { foreignKey: "path_id", as: "Edges" });
  PathEdge.belongsTo(LearningPath, { foreignKey: "path_id" });

  PathNode.hasMany(PathNodeResource, { foreignKey: "node_id", as: "Resources" });
  PathNodeResource.belongsTo(PathNode, { foreignKey: "node_id" });

  PathEdge.belongsTo(PathNode, { foreignKey: "source_node_id", as: "SourceNode" });
  PathEdge.belongsTo(PathNode, { foreignKey: "target_node_id", as: "TargetNode" });

  User.hasMany(UserLearningPath, { foreignKey: "user_id" });
  UserLearningPath.belongsTo(User, { foreignKey: "user_id" });
  LearningPath.hasMany(UserLearningPath, { foreignKey: "path_id" });
  UserLearningPath.belongsTo(LearningPath, { foreignKey: "path_id" });

  User.hasMany(UserNodeProgress, { foreignKey: "user_id" });
  UserNodeProgress.belongsTo(User, { foreignKey: "user_id" });
  PathNode.hasMany(UserNodeProgress, { foreignKey: "node_id" });
  UserNodeProgress.belongsTo(PathNode, { foreignKey: "node_id" });

  LearningPath.belongsTo(User, { foreignKey: "created_by", as: "Creator" });

  // AI 问答历史
  User.hasMany(AiChatHistory, { foreignKey: "user_id" });
  AiChatHistory.belongsTo(User, { foreignKey: "user_id" });
  Post.hasMany(AiChatHistory, { foreignKey: "post_id" });
  AiChatHistory.belongsTo(Post, { foreignKey: "post_id" });

  // ===== 房间录制 =====
  StudyRoom.hasMany(RoomRecording, { foreignKey: "room_id", as: "Recordings" });
  RoomRecording.belongsTo(StudyRoom, { foreignKey: "room_id" });
  User.hasMany(RoomRecording, { foreignKey: "recorder_user_id", as: "Recordings" });
  RoomRecording.belongsTo(User, { foreignKey: "recorder_user_id", as: "Recorder" });

  // ===== 代码执行记录 =====
  User.hasMany(CodeExecution, { foreignKey: "user_id", as: "CodeExecutions" });
  CodeExecution.belongsTo(User, { foreignKey: "user_id" });
  Question.hasMany(CodeExecution, { foreignKey: "question_id", as: "CodeExecutions" });
  CodeExecution.belongsTo(Question, { foreignKey: "question_id" });

  // ===== 编程题库系统 =====
  User.hasMany(CodeProblem, { foreignKey: "created_by", as: "CreatedProblems" });
  CodeProblem.belongsTo(User, { foreignKey: "created_by", as: "Creator" });

  CodeProblem.hasMany(ProblemTestCase, { foreignKey: "problem_id", as: "TestCases" });
  ProblemTestCase.belongsTo(CodeProblem, { foreignKey: "problem_id" });

  User.hasMany(CodeSubmission, { foreignKey: "user_id", as: "CodeSubmissions" });
  CodeSubmission.belongsTo(User, { foreignKey: "user_id" });

  CodeProblem.hasMany(CodeSubmission, { foreignKey: "problem_id", as: "Submissions" });
  CodeSubmission.belongsTo(CodeProblem, { foreignKey: "problem_id" });

  // ===== 知识文库系统 =====
  // 分类树形结构
  KnowledgeCategory.belongsTo(KnowledgeCategory, { foreignKey: "parent_id", as: "Parent" });
  KnowledgeCategory.hasMany(KnowledgeCategory, { foreignKey: "parent_id", as: "Children" });

  // 文档 -> 分类
  KnowledgeCategory.hasMany(KnowledgeDocument, { foreignKey: "category_id", as: "Documents" });
  KnowledgeDocument.belongsTo(KnowledgeCategory, { foreignKey: "category_id", as: "Category" });

  // 文档 -> 上传者
  User.hasMany(KnowledgeDocument, { foreignKey: "uploader_id", as: "UploadedDocuments" });
  KnowledgeDocument.belongsTo(User, { foreignKey: "uploader_id", as: "Uploader" });

  // 文档 -> 版本
  KnowledgeDocument.hasMany(DocumentVersion, { foreignKey: "document_id", as: "Versions" });
  DocumentVersion.belongsTo(KnowledgeDocument, { foreignKey: "document_id" });
  User.hasMany(DocumentVersion, { foreignKey: "creator_id", as: "DocumentVersions" });
  DocumentVersion.belongsTo(User, { foreignKey: "creator_id", as: "Creator" });

  // 文档 -> 批注
  KnowledgeDocument.hasMany(DocumentAnnotation, { foreignKey: "document_id", as: "Annotations" });
  DocumentAnnotation.belongsTo(KnowledgeDocument, { foreignKey: "document_id" });
  User.hasMany(DocumentAnnotation, { foreignKey: "user_id", as: "DocumentAnnotations" });
  DocumentAnnotation.belongsTo(User, { foreignKey: "user_id", as: "Author" });
  DocumentAnnotation.belongsTo(DocumentAnnotation, { foreignKey: "parent_id", as: "ParentAnnotation" });
  DocumentAnnotation.hasMany(DocumentAnnotation, { foreignKey: "parent_id", as: "Replies" });

  // 文档 -> 权限
  KnowledgeDocument.hasMany(DocumentPermission, { foreignKey: "document_id", as: "Permissions" });
  DocumentPermission.belongsTo(KnowledgeDocument, { foreignKey: "document_id" });
  DocumentPermission.belongsTo(User, { foreignKey: "granted_by", as: "GrantedByUser" });
  DocumentPermission.belongsTo(User, { foreignKey: "target_id", as: "TargetUser", constraints: false });

  // ===== 积分商城 =====
  User.hasMany(MallOrder, { foreignKey: "user_id", as: "MallOrders" });
  MallOrder.belongsTo(User, { foreignKey: "user_id" });

  MallProduct.hasMany(MallOrder, { foreignKey: "product_id" });
  MallOrder.belongsTo(MallProduct, { foreignKey: "product_id" });

  User.hasMany(UserDecoration, { foreignKey: "user_id", as: "Decorations" });
  UserDecoration.belongsTo(User, { foreignKey: "user_id" });

  MallProduct.hasMany(UserDecoration, { foreignKey: "product_id" });
  UserDecoration.belongsTo(MallProduct, { foreignKey: "product_id" });

  User.hasMany(MallProduct, { foreignKey: "created_by", as: "CreatedProducts" });
  MallProduct.belongsTo(User, { foreignKey: "created_by", as: "Creator" });
};
