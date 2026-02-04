import { sequelize } from "../config/sequelize";
import PointsRule from "../models/points-rule.model";

const defaultRules = [
  {
    code: "post_created",
    title: "发帖",
    change: 10,
    status: 1,
    description: "帖子发布成功后奖励积分",
  },
  {
    code: "post_approved",
    title: "帖子审核通过",
    change: 5,
    status: 1,
    description: "帖子审核通过后奖励积分",
  },
  {
    code: "comment_created",
    title: "评论",
    change: 1,
    status: 1,
    description: "评论发布成功后奖励积分（每日上限10次）",
  },
  {
    code: "post_liked",
    title: "帖子被点赞",
    change: 2,
    status: 1,
    description: "帖子被点赞后奖励作者积分（每日上限20次）",
  },
  {
    code: "post_quality",
    title: "优质帖子奖励",
    change: 30,
    status: 1,
    description: "帖子点赞达到阈值后奖励积分",
  },
  {
    code: "comment_liked",
    title: "评论被点赞",
    change: 1,
    status: 1,
    description: "评论被点赞后奖励作者积分（每日上限10次）",
  },
  {
    code: "community_daily_login",
    title: "每日签到",
    change: 1,
    status: 1,
    description: "每日进入社区签到奖励积分",
  },
  {
    code: "community_streak_3",
    title: "连续签到3天",
    change: 3,
    status: 1,
    description: "连续签到3天奖励",
  },
  {
    code: "community_streak_7",
    title: "连续签到7天",
    change: 10,
    status: 1,
    description: "连续签到7天奖励",
  },
  {
    code: "community_streak_30",
    title: "连续签到30天",
    change: 50,
    status: 1,
    description: "连续签到30天奖励",
  },
];

const run = async () => {
  try {
    await sequelize.authenticate();
    for (const rule of defaultRules) {
      const existing = await PointsRule.findOne({
        where: { code: rule.code },
      });
      if (existing) {
        await existing.update({
          title: rule.title,
          change: rule.change,
          status: rule.status,
          description: rule.description,
        });
      } else {
        await PointsRule.create(rule as any);
      }
    }
    console.log("积分规则初始化完成");
  } catch (error) {
    console.error("积分规则初始化失败:", error);
  } finally {
    await sequelize.close();
  }
};

run();
