import {
  Card,
  Col,
  List,
  Row,
  Statistic,
  Typography,
  message,
  Tooltip,
  Radio,
  Tag,
  Button,
  Space,
  Divider,
  Badge,
  Progress,
  Modal,
  Tabs,
  ProgressProps,
} from "antd";
import {
  TrophyOutlined,
  FireOutlined,
  StarOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  CalendarOutlined,
  EditOutlined,
  MessageOutlined,
  LikeOutlined,
  BookOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  GiftOutlined,
  UpOutlined,
  CrownOutlined,
  TeamOutlined,
  HeartOutlined,
  LockOutlined,
  UnlockOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  fetchPointsLogs,
  fetchPointsOverviewPlus,
  fetchPointsActions,
  fetchPointsBadges,
} from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";
import { useNavigate } from "react-router-dom";

const { Title, Text, Paragraph } = Typography;
const { Group: RadioGroup } = Radio;
const { TabPane } = Tabs;

type TrendDataType = "points" | "duration" | "activity";

interface TrendDataItem {
  date: string;
  posts: number;
  views: number;
  points: number;
  duration: number;
  activity: number;
}

interface PointsLogRow {
  id: number;
  change: number;
  reason: string;
  source_type: string;
  createdAt?: string;
  created_at?: string;
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  points: number;
  sourceType: string;
  dailyCap: number;
  icon?: string;
  route?: string;
  buttonText?: string;
  note?: string;
}

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "achievement" | "activity" | "quality" | "special";
  target: number;
  requirement: string;
  sortOrder: number;
  current: number;
  isUnlocked: boolean;
  progress: number;
}

interface LevelDetail {
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

const getSourceTypeConfig = (sourceType: string): {
  label: string;
  color: string;
  icon: React.ReactNode;
} => {
  const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    post: { label: "发帖", color: "blue", icon: <EditOutlined /> },
    comment: { label: "评论", color: "green", icon: <MessageOutlined /> },
    like: { label: "点赞", color: "red", icon: <LikeOutlined /> },
    task: { label: "任务", color: "purple", icon: <CheckCircleOutlined /> },
    study: { label: "学习", color: "cyan", icon: <BookOutlined /> },
    report: { label: "举报", color: "orange", icon: <RocketOutlined /> },
    admin: { label: "管理员", color: "gold", icon: <TrophyOutlined /> },
    system: { label: "系统", color: "default", icon: <CalendarOutlined /> },
    remark: { label: "其他", color: "default", icon: <StarOutlined /> },
  };
  return configs[sourceType] || { label: sourceType, color: "default", icon: <StarOutlined /> };
};

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getReasonText = (reason: string): string => {
  const reasonMap: Record<string, string> = {
    post_created: "发布帖子",
    comment_created: "发表评论",
    post_liked: "帖子被点赞",
    comment_liked: "评论被点赞",
    community_daily_login: "每日签到",
    community_streak_3: "连续签到3天奖励",
    community_streak_7: "连续签到7天奖励",
    community_streak_30: "连续签到30天奖励",
    post_quality: "优质内容奖励",
  };
  return reasonMap[reason] || reason;
};

const getBadgeIcon = (iconName: string, isUnlocked: boolean): React.ReactNode => {
  const iconMap: Record<string, React.ReactNode> = {
    EditOutlined: <EditOutlined />,
    EditFilled: <EditOutlined />,
    TrophyOutlined: <TrophyOutlined />,
    MessageOutlined: <MessageOutlined />,
    TeamOutlined: <TeamOutlined />,
    FireOutlined: <FireOutlined />,
    CalendarOutlined: <CalendarOutlined />,
    RocketOutlined: <RocketOutlined />,
    RiseOutlined: <RiseOutlined />,
    StarOutlined: <StarOutlined />,
    CrownOutlined: <CrownOutlined />,
    LikeOutlined: <LikeOutlined />,
    HeartOutlined: <HeartOutlined />,
  };
  return iconMap[iconName] || <StarOutlined />;
};

const getBadgeCategoryColor = (category: string): { label: string; color: string } => {
  const categoryMap: Record<string, { label: string; color: string }> = {
    achievement: { label: "成就徽章", color: "purple" },
    activity: { label: "活跃徽章", color: "blue" },
    quality: { label: "质量徽章", color: "green" },
    special: { label: "特殊徽章", color: "gold" },
  };
  return categoryMap[category] || { label: category, color: "default" };
};

export default function PointsCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [trendType, setTrendType] = useState<TrendDataType>("points");
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [overview, setOverview] = useState({
    totalPoints: 0,
    todayPoints: 0,
    level: 1,
    streakDays: 0,
    studyDuration: 0,
    todayStudyDuration: 0,
    qualityScore: 0,
    achievementProgress: 0,
    unlockedCount: 0,
    totalBadges: 0,
    growthTip: "",
  });
  const [levelDetail, setLevelDetail] = useState<LevelDetail | null>(null);
  const [trendData, setTrendData] = useState<TrendDataItem[]>([]);
  const [logs, setLogs] = useState<PointsLogRow[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [badgesByCategory, setBadgesByCategory] = useState<Record<string, BadgeItem[]>>({});
  const [animateProgress, setAnimateProgress] = useState(0);
  const [showGrowthTip, setShowGrowthTip] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, logsRes, actionsRes, badgesRes] = await Promise.all([
        fetchPointsOverviewPlus(),
        fetchPointsLogs({ page: 1, pageSize: 20 }),
        fetchPointsActions(),
        fetchPointsBadges(),
      ]);

      if (overviewRes?.data) {
        const { trendData: rawTrendData, levelDetail: rawLevelDetail, ...rest } = overviewRes.data;
        setOverview(rest);
        setLevelDetail(rawLevelDetail || null);
        if (rawLevelDetail) {
          setTimeout(() => setAnimateProgress(rawLevelDetail.progress), 300);
        }
        if (rawTrendData && Array.isArray(rawTrendData)) {
          const enhanced = rawTrendData.map((item: any) => ({
            ...item,
            activity: (item.posts || 0) * 3 + (item.views || 0) * 0.5 + (item.points || 0) * 0.2,
          }));
          setTrendData(enhanced);
        }
        if (rest.growthTip) {
          setTimeout(() => setShowGrowthTip(true), 800);
        }
      }
      if (logsRes?.data) {
        setLogs(logsRes.data);
      }
      if (actionsRes?.data?.actions) {
        setActions(actionsRes.data.actions);
      }
      if (badgesRes?.data) {
        setBadges(badgesRes.data.badges || []);
        setBadgesByCategory(badgesRes.data.badgesByCategory || {});
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getChartTitle = () => {
    switch (trendType) {
      case "points":
        return "近7天积分趋势";
      case "duration":
        return "近7天学习时长趋势（分钟）";
      case "activity":
        return "近7天活跃指数趋势";
      default:
        return "趋势图";
    }
  };

  const getChartDataKey = () => {
    switch (trendType) {
      case "points":
        return "points";
      case "duration":
        return "duration";
      case "activity":
        return "activity";
      default:
        return "points";
    }
  };

  const getChartColor = () => {
    switch (trendType) {
      case "points":
        return "#1890ff";
      case "duration":
        return "#52c41a";
      case "activity":
        return "#722ed1";
      default:
        return "#1890ff";
    }
  };

  const handleActionClick = (action: ActionItem) => {
    if (action.route) {
      navigate(action.route);
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  const getFilteredBadges = (): BadgeItem[] => {
    if (activeTab === "all") return badges;
    return badgesByCategory[activeTab] || [];
  };

  const renderLevelProgressCard = () => {
    if (!levelDetail) return null;

    const isMaxLevel = levelDetail.isMaxLevel;
    const pointsInLevel = overview.totalPoints - levelDetail.minPoints;
    const levelRange = levelDetail.maxPoints - levelDetail.minPoints + 1;

    return (
      <Card
        loading={loading}
        style={{
          marginBottom: 16,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
          borderRadius: 16,
          border: "none",
          boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)",
        }}
        bodyStyle={{ padding: "24px 32px" }}
      >
        <Row gutter={24} align="middle">
          <Col xs={24} sm={6} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #fff 0%, #f5f5f5 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                position: "relative",
              }}
            >
              <div style={{ fontSize: 42, fontWeight: "bold", color: "#722ed1" }}>
                Lv.{levelDetail.currentLevel}
              </div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                {levelDetail.currentLevelName}
              </div>
              {!isMaxLevel && (
                <Badge
                  count={
                    <span style={{ color: "#52c41a" }}>
                      <UpOutlined />
                    </span>
                  }
                  style={{ position: "absolute", top: 5, right: 5 }}
                />
              )}
            </div>
          </Col>

          <Col xs={24} sm={14}>
            <div style={{ color: "white", marginBottom: 16 }}>
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <div>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                    总积分
                  </Text>
                  <Text
                    style={{
                      color: "white",
                      fontSize: 36,
                      fontWeight: "bold",
                      marginLeft: 12,
                    }}
                  >
                    {overview.totalPoints}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.6)", marginLeft: 8 }}>
                    分
                  </Text>
                </div>

                {!isMaxLevel && (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      padding: "12px 20px",
                    }}
                  >
                    <Row align="middle" gutter={16}>
                      <Col flex="auto">
                        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, marginBottom: 4 }}>
                          升级进度
                        </div>
                        <Progress
                          percent={animateProgress}
                          strokeColor={{
                            "0%": "#f093fb,
                            "100%": "#f5576c",
                          }}
                          trailColor="rgba(255,255,255,0.2)"
                          showInfo={false}
                          style={{ width: "100%", width: 200 }}
                        />
                      </Col>
                      <Col flex="none">
                        <div
                          style={{
                            textAlign: "right",
                          }}
                        >
                          <div
                            style={{
                              color: "white",
                              fontSize: 20,
                              fontWeight: "bold",
                            }}
                          >
                            {levelDetail.progress}%
                          </div>
                          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                            {pointsInLevel}/{levelRange} 分
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}

                {!isMaxLevel && levelDetail.nextLevelName && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <GiftOutlined style={{ color: "#ffd700", fontSize: 18 }} />
                    <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}>
                      再获得
                    </Text>
                    <Text
                      style={{
                        color: "#ffd700",
                        fontSize: 20,
                        fontWeight: "bold",
                      }}
                    >
                      {levelDetail.pointsToNext}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}>
                      积分即可升级为「{levelDetail.nextLevelName}」
                    </Text>
                  </div>
                )}

                {isMaxLevel && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CrownOutlined style={{ color: "#ffd700", fontSize: 20 }} />
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.95)",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      🎉 恭喜！已达到最高等级
                    </Text>
                  </div>
                )}
              </Space>
            </div>
          </Col>

          <Col xs={24} sm={4} style={{ textAlign: "center" }}>
            <Tooltip title="查看成就徽章">
              <Button
                type="text"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  transition: "all 0.3s",
                }}
                onClick={() => setBadgeModalVisible(true)}
              >
                <TrophyOutlined style={{ fontSize: 28, marginBottom: 4 }} />
                <Text style={{ color: "white", fontSize: 12 }}>
                  {overview.unlockedCount}/{overview.totalBadges}
                </Text>
              </Button>
            </Tooltip>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, display: "block", marginTop: 8 }}>
              成就徽章
            </Text>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderGrowthTipBar = () => {
    if (!showGrowthTip || !overview.growthTip) return null;

    return (
      <Card
        loading={loading}
        style={{
          marginBottom: 16,
          background: "linear-gradient(90deg, #e3ffe7 0%, #d9e7ff 100%)",
          borderRadius: 12,
          border: "none",
        }}
        bodyStyle={{ padding: "16px 24px" }}
      >
        <Row align="middle" gutter={16}>
          <Col flex="none">
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 20,
              }}
            >
              <BulbOutlined />
            </div>
          </Col>
          <Col flex="auto">
            <Paragraph
              style={{
                margin: 0,
                fontSize: 15,
                color: "#333",
                fontWeight: 500,
              }}
            >
              {overview.growthTip}
            </Paragraph>
          </Col>
          <Col flex="none">
            <Button
              type="primary"
              size="small"
              onClick={() => navigate("/community")}
            >
              去行动
            </Button>
          </Col>
        </Row>
      </Card>
    );
  };

  const renderBadgeModal = () => {
    const filteredBadges = getFilteredBadges();
    const unlockedBadges = badges.filter((b) => b.isUnlocked);
    const lockedBadges = badges.filter((b) => !b.isUnlocked);

    return (
      <Modal
        title={
          <Space>
            <TrophyOutlined style={{ color: "#722ed1" }} />
            <span>成就徽章 ({overview.unlockedCount}/{overview.totalBadges})</span>
          </Space>
        }
        open={badgeModalVisible}
        onCancel={() => setBadgeModalVisible(false)}
        footer={null}
        width={720}
      >
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" style={{ textAlign: "center" }}>
                <Statistic
                  title="已解锁"
                  value={overview.unlockedCount}
                  valueStyle={{ color: "#52c41a" }}
                  prefix={<UnlockOutlined />}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ textAlign: "center" }}>
                <Statistic
                  title="待解锁"
                  value={overview.totalBadges - overview.unlockedCount}
                  valueStyle={{ color: "#999" }}
                  prefix={<LockOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="全部" key="all" />
          <TabPane tab="成就徽章" key="achievement" />
          <TabPane tab="活跃徽章" key="activity" />
          <TabPane tab="质量徽章" key="quality" />
        </Tabs>

        <Row gutter={[16, 16]}>
          {filteredBadges.map((badge) => {
            const categoryConfig = getBadgeCategoryColor(badge.category);

            return (
              <Col xs={12} sm={8} key={badge.id}>
                <Tooltip
                  title={
                    <div style={{ padding: 4 }}>
                      <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                        {badge.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>
                        {badge.description}
                      </div>
                      <div style={{ fontSize: 12 }}>
                        <Tag color={badge.isUnlocked ? "green" : "orange"}>
                          {badge.isUnlocked ? "已解锁" : badge.requirement}
                        </Tag>
                      </div>
                      {!badge.isUnlocked && (
                        <div style={{ fontSize: 12, marginTop: 4, color: "#666" }}>
                          进度: {badge.current}/{badge.target} ({badge.progress}%)
                        </div>
                      )}
                    </div>
                  }
                >
                  <Card
                    size="small"
                    hoverable
                    style={{
                      opacity: badge.isUnlocked ? 1 : 0.6,
                      transition: "all 0.3s",
                      border: badge.isUnlocked
                        ? "2px solid #52c41a"
                        : "2px solid #e8e8e8",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 36,
                          marginBottom: 8,
                          color: badge.isUnlocked ? "#722ed1" : "#bbb",
                          transition: "all 0.3s",
                        }}
                      >
                        {getBadgeIcon(badge.icon, badge.isUnlocked)}
                      </div>
                      <div
                        style={{
                          fontWeight: "bold",
                          marginBottom: 4,
                          color: badge.isUnlocked ? "#333" : "#999",
                        }}
                      >
                        {badge.name}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Tag color={categoryConfig.color}>{categoryConfig.label}</Tag>
                        {badge.isUnlocked ? (
                          <Tag color="green">
                            <UnlockOutlined /> 已解锁
                          </Tag>
                        ) : (
                          <Tag color="default">
                            <LockOutlined /> 未解锁
                          </Tag>
                        )}
                      </div>
                      {!badge.isUnlocked && (
                        <Progress
                          percent={badge.progress}
                          size="small"
                          strokeColor={badge.progress >= 50 ? "#52c41a" : "#1890ff"}
                        />
                      )}
                    </div>
                  </Card>
                </Tooltip>
              </Col>
            );
          })}
        </Row>

        {filteredBadges.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
            <LockOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>暂无该分类的徽章</div>
          </div>
        )}
      </Modal>
    );
  };

  return (
    <div className="page-container">
      <Title level={3} style={{ marginBottom: 24 }}>
        <Space>
          <TrophyOutlined style={{ color: "#1890ff" }} />
          积分成长中心
        </Space>
      </Title>

      {renderLevelProgressCard()}

      {renderGrowthTipBar()}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} md={8} lg={4}>
          <Card loading={loading} hoverable>
            <Statistic
              title={
                <Space>
                  <CalendarOutlined style={{ color: "#1890ff" }} />
                  今日积分
                </Space>
              }
              value={overview.todayPoints}
              valueStyle={{ color: "#1890ff" }}
              suffix="分"
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <Card loading={loading} hoverable>
            <Statistic
              title={
                <Space>
                  <FireOutlined style={{ color: "#ff4d4f" }} />
                  连续签到
                </Space>
              }
              value={overview.streakDays}
              valueStyle={{ color: "#ff4d4f" }}
              suffix="天"
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <Card loading={loading} hoverable>
            <Statistic
              title={
                <Space>
                  <StarOutlined style={{ color: "#13c2c2" }} />
                  质量分
                </Space>
              }
              value={overview.qualityScore}
              valueStyle={{ color: "#13c2c2" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <Card loading={loading} hoverable>
            <Statistic
              title={
                <Space>
                  <ClockCircleOutlined style={{ color: "#52c41a" }} />
                  学习时长
                </Space>
              }
              value={formatDuration(overview.studyDuration)}
              valueStyle={{ color: "#52c41a", fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <Card loading={loading} hoverable>
            <Statistic
              title={
                <Space>
                  <TrophyOutlined style={{ color: "#722ed1" }} />
                  成就进度
                </Space>
              }
              value={overview.achievementProgress}
              valueStyle={{ color: "#722ed1" }}
              suffix="%"
            />
            <Progress
              percent={overview.achievementProgress}
              size="small"
              showInfo={false}
              strokeColor="#722ed1"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <Card
            loading={loading}
            hoverable
            onClick={() => setBadgeModalVisible(true)}
            style={{ cursor: "pointer" }}
          >
            <Statistic
              title={
                <Space>
                  <UnlockOutlined style={{ color: "#faad14" }} />
                  成就徽章
                </Space>
              }
              value={overview.unlockedCount}
              valueStyle={{ color: "#faad14" }}
              suffix={`/${overview.totalBadges}`}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            loading={loading}
            title={
              <Space>
                <RiseOutlined />
                {getChartTitle()}
              </Space>
            }
            extra={
              <RadioGroup value={trendType} onChange={(e) => setTrendType(e.target.value)}>
                <Radio.Button value="points">积分</Radio.Button>
                <Radio.Button value="duration">学习时长</Radio.Button>
                <Radio.Button value="activity">活跃指数</Radio.Button>
              </RadioGroup>
            }
            style={{ marginBottom: 16 }}
          >
            <div style={{ height: 300 }}>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={getChartColor()} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={getChartColor()} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const parts = value.split("-");
                        return `${parts[1]}/${parts[2]}`;
                      }}
                      axisLine={{ stroke: "#e0e0e0" }}
                      tick={{ fill: "#666", fontSize: 11 }}
                    />
                    <YAxis axisLine={{ stroke: "#e0e0e0" }} tick={{ fill: "#666" }} />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={getChartDataKey()}
                      stroke={getChartColor()}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "#999",
                  }}
                >
                  暂无趋势数据
                </div>
              )}
            </div>
          </Card>

          <Card
            loading={loading}
            title={
              <Space>
                <EditOutlined />
                积分明细
              </Space>
            }
          >
            <List
              dataSource={logs}
              locale={{ emptyText: "暂无积分记录" }}
              renderItem={(item) => {
                const config = getSourceTypeConfig(item.source_type);
                const actualDate = item.createdAt || item.created_at;
                return (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Tag color={config.color} style={{ padding: "4px 8px", fontSize: 12 }}>
                          <Space size={4}>
                            {config.icon}
                            {config.label}
                          </Space>
                        </Tag>
                      }
                      title={
                        <Text strong style={{ fontSize: 14 }}>
                          {getReasonText(item.reason)}
                        </Text>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatDate(actualDate)}
                        </Text>
                      }
                    />
                    <div style={{ fontSize: 16, fontWeight: "bold" }}>
                      <Text style={{ color: item.change > 0 ? "#52c41a" : "#ff4d4f" }}>
                        {item.change > 0 ? `+${item.change}` : item.change}
                      </Text>
                      <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
                        积分
                      </Text>
                    </div>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            loading={loading}
            title={
              <Space>
                <RocketOutlined style={{ color: "#ff4d4f" }} />
                今日可得积分
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <List
              dataSource={actions}
              renderItem={(item) => (
                <List.Item style={{ padding: "12px 0" }}>
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: 18,
                        }}
                      >
                        {getSourceTypeConfig(item.sourceType).icon}
                      </div>
                    }
                    title={
                      <Space>
                        <Text strong>{item.title}</Text>
                        {item.points > 0 && (
                          <Tag color="green">+{item.points}分</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.description}
                        </Text>
                        {item.note && (
                          <div>
                            <Text type="warning" style={{ fontSize: 11 }}>
                              💡 {item.note}
                            </Text>
                          </div>
                        )}
                        {item.dailyCap > 0 && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              每日上限: {item.dailyCap}分
                            </Text>
                          </div>
                        )}
                      </div>
                    }
                  />
                  <Button
                    type="primary"
                    size="small"
                    ghost
                    onClick={() => handleActionClick(item)}
                  >
                    {item.buttonText || "去完成"}
                  </Button>
                </List.Item>
              )}
            />
          </Card>

          <Card
            title={
              <Space>
                <FireOutlined style={{ color: "#ff7a45" }} />
                签到奖励
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[8, 8]}>
              <Col span={8}>
                <Card
                  size="small"
                  style={{
                    textAlign: "center",
                    borderRadius: 8,
                    background: overview.streakDays >= 3 ? "#fff7e6" : "#fff",
                    border: overview.streakDays >= 3 ? "1px solid #ffd591" : undefined,
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>🔥</div>
                  <Text strong>连续3天</Text>
                  <div>
                    <Tag color={overview.streakDays >= 3 ? "success" : "default"}>
                      +3分
                    </Tag>
                  </div>
                  {overview.streakDays >= 3 && (
                    <div>
                      <Tag color="green">已达成</Tag>
                    </div>
                  )}
                </Card>
              </Col>
              <Col span={8}>
                <Card
                  size="small"
                  style={{
                    textAlign: "center",
                    borderRadius: 8,
                    background: overview.streakDays >= 7 ? "#fff7e6" : "#fff",
                    border: overview.streakDays >= 7 ? "1px solid #ffd591" : undefined,
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>⭐</div>
                  <Text strong>连续7天</Text>
                  <div>
                    <Tag color={overview.streakDays >= 7 ? "success" : "default"}>
                      +10分
                    </Tag>
                  </div>
                  {overview.streakDays >= 7 && (
                    <div>
                      <Tag color="green">已达成</Tag>
                    </div>
                  )}
                </Card>
              </Col>
              <Col span={8}>
                <Card
                  size="small"
                  style={{
                    textAlign: "center",
                    borderRadius: 8,
                    background: overview.streakDays >= 30 ? "#fff7e6" : "#fff",
                    border: overview.streakDays >= 30 ? "1px solid #ffd591" : undefined,
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>👑</div>
                  <Text strong>连续30天</Text>
                  <div>
                    <Tag color={overview.streakDays >= 30 ? "success" : "default"}>
                      +50分
                    </Tag>
                  </div>
                  {overview.streakDays >= 30 && (
                    <div>
                      <Tag color="green">已达成</Tag>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </Card>

          <Card
            title={
              <Space>
                <StarOutlined style={{ color: "#1890ff" }} />
                优质内容奖励
              </Space>
            }
          >
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: 12,
                padding: 16,
                color: "white",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
                帖子获赞 ≥ 50
              </div>
              <div style={{ fontSize: 28, fontWeight: "bold" }}>+30分</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                发布高质量内容，获得社区认可
              </div>
              <Button
                type="default"
                size="small"
                style={{ marginTop: 12 }}
                onClick={() => navigate("/community/post/create")}
              >
                去创作
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {renderBadgeModal()}

      <CommunityFooter />
    </div>
  );
}
