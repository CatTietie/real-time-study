// 积分服务
import { Op, Sequelize } from "sequelize";
import PointsLog from "../models/points-log.model";
import User from "../models/user.model";

export const getStartOfDay = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
};

export type SourceType = "post" | "comment" | "like" | "task" | "study" | "report" | "admin" | "system" | "remark";

export const addPoints = async (options: {
  userId: number;
  change: number;
  reason: string;
  sourceType: SourceType;
  sourceId?: number;
  dailyCap?: number;
}) => {
  const { userId, change, reason, sourceType, sourceId, dailyCap } = options;

  if (change === 0) return null;

  if (dailyCap !== undefined) {
    const startOfDay = getStartOfDay();
    const used = await PointsLog.sum("change", {
      where: {
        user_id: userId,
        reason,
        [Op.and]: [
          Sequelize.where(Sequelize.col("created_at"), {
            [Op.gte]: startOfDay,
          }),
        ],
      },
    });
    const current = Number(used || 0);
    if (current >= dailyCap) {
      return null;
    }
    const remain = dailyCap - current;
    if (change > remain) {
      options.change = remain;
    }
  }

  await PointsLog.create({
    user_id: userId,
    change: options.change,
    reason,
    source_type: sourceType,
    source_id: sourceId,
  });

  await User.increment({ points: options.change }, { where: { id: userId } });

  return options.change;
};

export const calculateLevel = (points: number) => {
  if (points <= 10) return 1;
  if (points <= 30) return 2;
  if (points <= 100) return 3;
  if (points <= 200) return 4;
  if (points <= 300) return 5;
  return 5 + Math.floor((points - 201) / 100);
};
