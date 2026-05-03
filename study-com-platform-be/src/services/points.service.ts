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
  return 5 + Math.floor((points - 300) / 100);
};

export interface LevelConfig {
  level: number;
  minPoints: number;
  maxPoints: number;
  name: string;
  description: string;
  color: string;
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, minPoints: 0, maxPoints: 10, name: "新手", description: "刚加入社区", color: "#999" },
  { level: 2, minPoints: 11, maxPoints: 30, name: "探索者", description: "开始探索社区", color: "#52c41a" },
  { level: 3, minPoints: 31, maxPoints: 100, name: "活跃者", description: "活跃的社区成员", color: "#1890ff" },
  { level: 4, minPoints: 101, maxPoints: 200, name: "贡献者", description: "为社区做出贡献", color: "#722ed1" },
  { level: 5, minPoints: 201, maxPoints: 300, name: "达人", description: "社区知名达人", color: "#fa8c16" },
  { level: 6, minPoints: 301, maxPoints: 500, name: "大师", description: "社区大师级成员", color: "#eb2f96" },
  { level: 7, minPoints: 501, maxPoints: 800, name: "宗师", description: "社区宗师级成员", color: "#f5222d" },
  { level: 8, minPoints: 801, maxPoints: 1200, name: "传奇", description: "社区传奇人物", color: "#faad14" },
  { level: 9, minPoints: 1201, maxPoints: 2000, name: "神话", description: "社区神话级存在", color: "#13c2c2" },
];

export interface LevelDetail {
  currentLevel: number;
  currentLevelName: string;
  currentLevelDesc: string;
  currentLevelColor: string;
  minPoints: number;
  maxPoints: number;
  nextLevel: number | null;
  nextLevelName: string | null;
  nextLevelPoints: number | null;
  pointsToNext: number;
  progress: number;
  isMaxLevel: boolean;
}

export const calculateLevelDetail = (points: number): LevelDetail => {
  const currentLevel = calculateLevel(points);
  
  let currentConfig = LEVEL_CONFIGS.find(c => c.level === currentLevel);
  
  if (!currentConfig) {
    const maxConfig = LEVEL_CONFIGS[LEVEL_CONFIGS.length - 1];
    const additionalLevels = currentLevel - maxConfig.level;
    const newMin = maxConfig.maxPoints + 1 + additionalLevels * 100;
    const newMax = newMin + 99;
    
    return {
      currentLevel,
      currentLevelName: `Lv.${currentLevel}`,
      currentLevelDesc: "社区资深成员",
      currentLevelColor: "#13c2c2",
      minPoints: newMin,
      maxPoints: newMax,
      nextLevel: currentLevel + 1,
      nextLevelName: `Lv.${currentLevel + 1}`,
      nextLevelPoints: newMax + 1,
      pointsToNext: Math.max(0, newMax + 1 - points),
      progress: Math.min(100, Math.round(((points - newMin) / (newMax - newMin + 1)) * 100)),
      isMaxLevel: false,
    };
  }

  const nextConfig = LEVEL_CONFIGS.find(c => c.level === currentLevel + 1);
  
  const pointsInLevel = points - currentConfig.minPoints;
  const levelRange = currentConfig.maxPoints - currentConfig.minPoints + 1;
  const progress = levelRange > 0 ? Math.min(100, Math.round((pointsInLevel / levelRange) * 100)) : 100;

  return {
    currentLevel,
    currentLevelName: currentConfig.name,
    currentLevelDesc: currentConfig.description,
    currentLevelColor: currentConfig.color,
    minPoints: currentConfig.minPoints,
    maxPoints: currentConfig.maxPoints,
    nextLevel: nextConfig ? nextConfig.level : null,
    nextLevelName: nextConfig ? nextConfig.name : null,
    nextLevelPoints: nextConfig ? nextConfig.minPoints : null,
    pointsToNext: nextConfig ? Math.max(0, nextConfig.minPoints - points) : 0,
    progress,
    isMaxLevel: !nextConfig,
  };
};

export type BadgeNewCategory = "learning" | "community" | "challenge";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "achievement" | "activity" | "quality" | "special";
  newCategory: BadgeNewCategory;
  target: number;
  requirement: string;
  sortOrder: number;
}

export interface UserBadgeProgress {
  badge: BadgeDefinition;
  isUnlocked: boolean;
  current: number;
  progress: number;
  unlockedAt?: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "first_post",
    name: "初次发文",
    description: "发布你的第一篇帖子",
    icon: "EditOutlined",
    category: "achievement",
    newCategory: "community",
    target: 1,
    requirement: "累计发帖 ≥ 1",
    sortOrder: 1,
  },
  {
    id: "regular_poster",
    name: "积极创作者",
    description: "累计发布10篇帖子",
    icon: "EditFilled",
    category: "activity",
    newCategory: "community",
    target: 10,
    requirement: "累计发帖 ≥ 10",
    sortOrder: 2,
  },
  {
    id: "content_master",
    name: "内容大师",
    description: "累计发布50篇帖子",
    icon: "TrophyOutlined",
    category: "achievement",
    newCategory: "community",
    target: 50,
    requirement: "累计发帖 ≥ 50",
    sortOrder: 3,
  },
  {
    id: "first_comment",
    name: "初次互动",
    description: "发表第一条评论",
    icon: "MessageOutlined",
    category: "activity",
    newCategory: "community",
    target: 1,
    requirement: "累计评论 ≥ 1",
    sortOrder: 4,
  },
  {
    id: "social_butterfly",
    name: "社交达人",
    description: "累计发表30条评论",
    icon: "TeamOutlined",
    category: "activity",
    newCategory: "community",
    target: 30,
    requirement: "累计评论 ≥ 30",
    sortOrder: 5,
  },
  {
    id: "streak_3",
    name: "三天连续",
    description: "连续3天都获得积分",
    icon: "FireOutlined",
    category: "activity",
    newCategory: "challenge",
    target: 3,
    requirement: "连续3天有积分记录",
    sortOrder: 6,
  },
  {
    id: "streak_7",
    name: "周周坚持",
    description: "连续7天都获得积分",
    icon: "CalendarOutlined",
    category: "activity",
    newCategory: "challenge",
    target: 7,
    requirement: "连续7天有积分记录",
    sortOrder: 7,
  },
  {
    id: "streak_30",
    name: "月度达人",
    description: "连续30天都获得积分",
    icon: "RocketOutlined",
    category: "achievement",
    newCategory: "challenge",
    target: 30,
    requirement: "连续30天有积分记录",
    sortOrder: 8,
  },
  {
    id: "daily_high",
    name: "高产日",
    description: "单日获得积分≥20",
    icon: "RiseOutlined",
    category: "quality",
    newCategory: "challenge",
    target: 20,
    requirement: "单日积分 ≥ 20",
    sortOrder: 9,
  },
  {
    id: "centurion",
    name: "百分达人",
    description: "累计获得100积分",
    icon: "StarOutlined",
    category: "achievement",
    newCategory: "learning",
    target: 100,
    requirement: "累计积分 ≥ 100",
    sortOrder: 10,
  },
  {
    id: "thousandaire",
    name: "千分精英",
    description: "累计获得1000积分",
    icon: "CrownOutlined",
    category: "achievement",
    newCategory: "learning",
    target: 1000,
    requirement: "累计积分 ≥ 1000",
    sortOrder: 11,
  },
  {
    id: "first_like_received",
    name: "初获认可",
    description: "获得第一个点赞",
    icon: "LikeOutlined",
    category: "quality",
    newCategory: "community",
    target: 1,
    requirement: "获得点赞 ≥ 1",
    sortOrder: 12,
  },
  {
    id: "popular_author",
    name: "人气作者",
    description: "累计获得50个点赞",
    icon: "HeartOutlined",
    category: "quality",
    newCategory: "community",
    target: 50,
    requirement: "获得点赞 ≥ 50",
    sortOrder: 13,
  },
];

export const getGrowthTip = (
  levelDetail: LevelDetail,
  todayPoints: number,
  totalPosts: number,
  totalComments: number,
  currentStreak: number,
  totalPoints: number
): string => {
  if (levelDetail.pointsToNext > 0 && levelDetail.pointsToNext <= 10) {
    return `再获得 ${levelDetail.pointsToNext} 积分即可升级为「${levelDetail.nextLevelName}」！`;
  }
  
  if (todayPoints === 0) {
    return "今日还没有获得积分，去发布一篇帖子或评论互动一下吧！";
  }
  
  if (currentStreak >= 2 && currentStreak < 7) {
    return `🔥 已连续${currentStreak}天获得积分，再接再厉，冲击7天签到奖励！`;
  }
  
  if (totalPosts === 0) {
    return "还没有发布过帖子？去分享你的学习心得吧，每篇帖子可获得10积分！";
  }
  
  if (levelDetail.pointsToNext <= 50 && levelDetail.pointsToNext > 0) {
    return `距离升级到「${levelDetail.nextLevelName}」还需要 ${levelDetail.pointsToNext} 积分，再加把劲！`;
  }
  
  if (totalPoints >= 100 && totalPoints < 200) {
    return "💪 你已经是「贡献者」了，继续活跃，向「达人」迈进！";
  }
  
  if (levelDetail.isMaxLevel) {
    return "🎉 恭喜！你已达到最高等级，继续保持优秀表现！";
  }
  
  return "每日访问、发帖、评论都能获得积分，坚持每日学习成长！";
};

export interface BadgeProgress {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeNewCategory;
  threshold: number;
  current: number;
  progress: number;
  isUnlocked: boolean;
  requirement: string;
  sortOrder: number;
}

export interface BadgeCategoryGroup {
  category: BadgeNewCategory;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  badges: BadgeProgress[];
  unlockedCount: number;
  totalCount: number;
}

export interface BadgesOverview {
  summary: {
    unlockedCount: number;
    totalCount: number;
    completionRate: number;
  };
  categories: BadgeCategoryGroup[];
}

export const BADGE_CATEGORY_CONFIG: Record<BadgeNewCategory, {
  name: string;
  icon: string;
  color: string;
}> = {
  learning: {
    name: "学习类",
    icon: "BookOutlined",
    color: "#1890ff",
  },
  community: {
    name: "社区类",
    icon: "TeamOutlined",
    color: "#52c41a",
  },
  challenge: {
    name: "挑战类",
    icon: "TrophyOutlined",
    color: "#722ed1",
  },
};
