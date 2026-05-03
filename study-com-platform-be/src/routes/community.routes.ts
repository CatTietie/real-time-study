// 社区公共路由
import { Router } from "express";
import {
  createCommunityComment,
  createCommunityPost,
  createCommunityReport,
  deleteCommunityComment,
  deleteCommunityPost,
  deleteCommunityDraft,
  deleteFavorite,
  deleteFavoriteFolder,
  getCommunityComments,
  getCommunityDrafts,
  getCommunityDraftDetail,
  getCommunityLeaderboard,
  getCommunityPostComments,
  getCommunityPostDetail,
  getCommunityPosts,
  getMyLikedPosts,
  recordCommunityVisit,
  getFavoriteFolders,
  getFavoriteStatus,
  getFavorites,
  createFavorite,
  createFavoriteFolder,
  moveFavorites,
  exportFavorites,
  toggleCommentLike,
  togglePostLike,
  updateCommunityPost,
  updateFavoriteFolder,
  getPointsSummary,
  getPointsLogs,
  getCommunityProfileSummary,
  getCommunityTagSuggestions,
  streamCommunityEvents,
  getUserTodayStats,
} from "../controllers/community-public.controller";
import {
  getLearningStatsCards,
  getStudyDurationDetail,
  getLoginStreakDetail,
  getContentQualityDetail,
  getDailyStudyRecords,
  getMultiDimTrend,
  getWeeklyComparison,
  getActivityHeatmap,
  getActionRecommendationsHandler,
  getRankingSnapshotHandler,
} from "../controllers/study-stats.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { conditionalPostImages } from "../middlewares/upload.middleware";

const router = Router();

router.get("/posts", getCommunityPosts);
router.get("/posts/:id", getCommunityPostDetail);
router.post(
  "/posts",
  authMiddleware,
  conditionalPostImages,
  createCommunityPost,
);
router.put("/posts/:id", authMiddleware, updateCommunityPost);
router.delete("/posts/:id", authMiddleware, deleteCommunityPost);
router.post("/posts/:id/like", authMiddleware, togglePostLike);
router.get("/posts/:id/comments", getCommunityPostComments);
router.post("/posts/:id/comments", authMiddleware, createCommunityComment);
router.post("/posts/:id/report", authMiddleware, createCommunityReport);
router.get("/comments", getCommunityComments);
router.get("/likes", authMiddleware, getMyLikedPosts);
router.delete("/comments/:id", authMiddleware, deleteCommunityComment);
router.post("/comments/:id/like", authMiddleware, toggleCommentLike);
router.get("/leaderboard", getCommunityLeaderboard);

// 标签联想
router.get("/tags/suggest", getCommunityTagSuggestions);

// 社区实时事件流
router.get("/stream", streamCommunityEvents);

// 收藏夹/收藏
router.get("/favorite-folders", authMiddleware, getFavoriteFolders);
router.post("/favorite-folders", authMiddleware, createFavoriteFolder);
router.put("/favorite-folders/:id", authMiddleware, updateFavoriteFolder);
router.delete("/favorite-folders/:id", authMiddleware, deleteFavoriteFolder);

router.get("/favorites", authMiddleware, getFavorites);
router.post("/favorites", authMiddleware, createFavorite);
router.delete("/favorites/:id", authMiddleware, deleteFavorite);
router.post("/favorites/move", authMiddleware, moveFavorites);
router.get("/favorites/export", authMiddleware, exportFavorites);
router.get("/favorites/status/:postId", authMiddleware, getFavoriteStatus);

// 进入社区首页记录
router.post("/visit", authMiddleware, recordCommunityVisit);

// 积分
router.get("/points/summary", authMiddleware, getPointsSummary);
router.get("/points/logs", authMiddleware, getPointsLogs);

// 个人信息汇总
router.get("/profile/summary", authMiddleware, getCommunityProfileSummary);

// 用户今日统计
router.get("/user/today-stats", authMiddleware, getUserTodayStats);

// 草稿相关路由
router.get("/drafts", authMiddleware, getCommunityDrafts);
router.get("/drafts/:id", authMiddleware, getCommunityDraftDetail);
router.delete("/drafts/:id", authMiddleware, deleteCommunityDraft);

// 学习统计相关路由
router.get("/learning-stats", authMiddleware, getLearningStatsCards);
router.get("/learning-stats/duration", authMiddleware, getStudyDurationDetail);
router.get("/learning-stats/streak", authMiddleware, getLoginStreakDetail);
router.get("/learning-stats/quality", authMiddleware, getContentQualityDetail);
router.get("/learning-stats/daily", authMiddleware, getDailyStudyRecords);

// 增强学习统计API - 多维趋势、对比、热力图
router.get("/learning-stats/trend", authMiddleware, getMultiDimTrend);
router.get("/learning-stats/comparison", authMiddleware, getWeeklyComparison);
router.get("/learning-stats/heatmap", authMiddleware, getActivityHeatmap);

// 行为驱动API - 行动推荐、排行榜快照
router.get("/learning-stats/actions", authMiddleware, getActionRecommendationsHandler);
router.get("/learning-stats/ranking", authMiddleware, getRankingSnapshotHandler);

export default router;
