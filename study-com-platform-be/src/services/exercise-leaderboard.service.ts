import { Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import { PointsLog } from "../models/points-log.model";
import UserStats from "../models/user-stats.model";
import User from "../models/user.model";
import { getStartOfWeek } from "../utils/helper";

interface LeaderboardEntry {
  id: number;
  nickname: string;
  username: string;
  avatar: string | null;
  rank_change: number | null;
}

interface WeeklyScoreEntry extends LeaderboardEntry {
  weekly_score: number;
}

interface AccuracyEntry extends LeaderboardEntry {
  accuracy_rate: number;
  total_questions: number;
  correct_count: number;
}

function getLastWeekRange(): { start: Date; end: Date } {
  const start = getStartOfWeek();
  start.setDate(start.getDate() - 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function getWeeklyScoreLeaderboard(): Promise<WeeklyScoreEntry[]> {
  const weekStart = getStartOfWeek();

  const thisWeekRows: any[] = await PointsLog.findAll({
    attributes: [
      "user_id",
      [sequelize.fn("SUM", sequelize.col("change")), "weekly_score"],
    ],
    where: {
      source_type: "study",
      created_at: { [Op.gte]: weekStart },
    },
    group: ["user_id"],
    order: [[sequelize.literal("weekly_score"), "DESC"]],
    limit: 50,
    raw: true,
  });

  if (thisWeekRows.length === 0) return [];

  const { start: lastWeekStart, end: lastWeekEnd } = getLastWeekRange();
  const lastWeekRows: any[] = await PointsLog.findAll({
    attributes: [
      "user_id",
      [sequelize.fn("SUM", sequelize.col("change")), "weekly_score"],
    ],
    where: {
      source_type: "study",
      created_at: { [Op.gte]: lastWeekStart, [Op.lte]: lastWeekEnd },
    },
    group: ["user_id"],
    order: [[sequelize.literal("weekly_score"), "DESC"]],
    raw: true,
  });

  const lastWeekRankMap = new Map<number, number>();
  lastWeekRows.forEach((row, index) => {
    lastWeekRankMap.set(Number(row.user_id), index + 1);
  });

  const userIds = thisWeekRows.map((r) => Number(r.user_id));
  const users = await User.findAll({
    where: { id: { [Op.in]: userIds } },
    attributes: ["id", "nickname", "username", "avatar"],
    raw: true,
  });
  const userMap = new Map(users.map((u: any) => [u.id, u]));

  return thisWeekRows.map((row, index) => {
    const userId = Number(row.user_id);
    const currentRank = index + 1;
    const lastRank = lastWeekRankMap.get(userId);
    const rankChange = lastRank != null ? lastRank - currentRank : 1;
    const user = userMap.get(userId) || {} as any;

    return {
      id: userId,
      nickname: user.nickname || "未知用户",
      username: user.username || "",
      avatar: user.avatar || null,
      weekly_score: Number(row.weekly_score) || 0,
      rank_change: rankChange,
    };
  });
}

export async function getAccuracyLeaderboard(): Promise<AccuracyEntry[]> {
  const statsRows: any[] = await UserStats.findAll({
    where: { total_questions: { [Op.gte]: 50 } },
    order: [
      ["accuracy_rate", "DESC"],
      ["total_questions", "DESC"],
    ],
    limit: 50,
    raw: true,
  });

  if (statsRows.length === 0) return [];

  const userIds = statsRows.map((r) => Number(r.user_id));

  const weekStart = getStartOfWeek();
  const thisWeekAnswers: any[] = await sequelize.query(
    `SELECT uer.user_id,
            COUNT(*) as week_total,
            SUM(uad.is_correct) as week_correct
     FROM user_answer_details uad
     JOIN user_exercise_records uer ON uad.record_id = uer.id
     WHERE uad.created_at >= :weekStart
       AND uer.user_id IN (:userIds)
     GROUP BY uer.user_id`,
    {
      replacements: { weekStart, userIds },
      type: "SELECT" as any,
    },
  );

  const weekDataMap = new Map<number, { total: number; correct: number }>();
  thisWeekAnswers.forEach((row: any) => {
    weekDataMap.set(Number(row.user_id), {
      total: Number(row.week_total) || 0,
      correct: Number(row.week_correct) || 0,
    });
  });

  const prevAccuracyList: { userId: number; prevAccuracy: number }[] = statsRows.map((row) => {
    const userId = Number(row.user_id);
    const weekData = weekDataMap.get(userId);
    if (!weekData || weekData.total === 0) {
      return { userId, prevAccuracy: Number(row.accuracy_rate) };
    }
    const prevTotal = Number(row.total_questions) - weekData.total;
    const prevCorrect = Number(row.correct_count) - weekData.correct;
    const prevAccuracy = prevTotal > 0 ? (prevCorrect / prevTotal) * 100 : 0;
    return { userId, prevAccuracy };
  });

  const prevSorted = [...prevAccuracyList].sort((a, b) => b.prevAccuracy - a.prevAccuracy);
  const prevRankMap = new Map<number, number>();
  prevSorted.forEach((item, index) => {
    prevRankMap.set(item.userId, index + 1);
  });

  const users = await User.findAll({
    where: { id: { [Op.in]: userIds } },
    attributes: ["id", "nickname", "username", "avatar"],
    raw: true,
  });
  const userMap = new Map(users.map((u: any) => [u.id, u]));

  return statsRows.map((row, index) => {
    const userId = Number(row.user_id);
    const currentRank = index + 1;
    const prevRank = prevRankMap.get(userId);
    const rankChange = prevRank != null ? prevRank - currentRank : 1;
    const user = userMap.get(userId) || {} as any;

    return {
      id: userId,
      nickname: user.nickname || "未知用户",
      username: user.username || "",
      avatar: user.avatar || null,
      accuracy_rate: Number(row.accuracy_rate) || 0,
      total_questions: Number(row.total_questions) || 0,
      correct_count: Number(row.correct_count) || 0,
      rank_change: rankChange,
    };
  });
}
