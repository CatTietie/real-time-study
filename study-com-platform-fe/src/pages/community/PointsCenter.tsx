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
} from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import {
  fetchPointsLogs,
  fetchPointsOverviewPlus,
  fetchPointsActions,
} from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const { Group: RadioGroup } = Radio;

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

const cardTooltips: Record<string, string> = {
  totalPoints: "您在社区累计获得的全部积分，是您社区活跃度和贡献的综合体现",
  todayPoints: "今日通过发帖、评论、签到等行为获得的积分总和",
  level: "根据总积分自动计算的等级，积分越多等级越高，解锁更多特权",
  streakDays: "连续访问社区并签到的天数，连续签到可获得额外奖励",
  qualityScore: "综合评估您发布内容的质量，基于点赞数与浏览量的比例计算",
  studyDuration: "通过自习室预约学习记录的累计时长（分钟）",
};

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

export default function PointsCenter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [trendType, setTrendType] = useState<TrendDataType>("points");
  const [overview, setOverview] = useState({
    totalPoints: 0,
    todayPoints: 0,
    level: 1,
    streakDays: 0,
    studyDuration: 0,
    todayStudyDuration: 0,
    qualityScore: 0,
  });
  const [trendData, setTrendData] = useState<TrendDataItem[]>([]);
  const [logs, setLogs] = useState<PointsLogRow[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, logsRes, actionsRes] = await Promise.all([
        fetchPointsOverviewPlus(),
        fetchPointsLogs({ page: 1, pageSize: 20 }),
        fetchPointsActions(),
      ]);

      if (overviewRes?.data) {
        const { trendData: rawTrendData, ...rest } = overviewRes.data;
        setOverview(rest);
        if (rawTrendData && Array.isArray(rawTrendData)) {
          const enhanced = rawTrendData.map((item: any) => ({
            ...item,
            activity: (item.posts || 0) * 3 + (item.views || 0) * 0.5 + (item.points || 0) * 0.2,
          }));
          setTrendData(enhanced);
        }
      }
      if (logsRes?.data) {
        setLogs(logsRes.data);
      }
      if (actionsRes?.data?.actions) {
        setActions(actionsRes.data.actions);
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

  return (
    <div className="page-container">
      <Title level={3} style={{ marginBottom: 24 }}>
        <Space>
          <TrophyOutlined style={{ color: "#1890ff" }} />
          积分成长中心 Lite
        </Space>
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} md={8} lg={4}>
          <Tooltip title={cardTooltips.totalPoints}>
            <Card loading={loading} hoverable>
              <Statistic
                title={
                  <Space>
                    <TrophyOutlined style={{ color: "#faad14" }} />
                    总积分
                  </Space>
                }
                value={overview.totalPoints}
                valueStyle={{ color: "#faad14" }}
                prefix={<RiseOutlined />}
              />
            </Card>
          </Tooltip>
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <Tooltip title={cardTooltips.todayPoints}>
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
                prefix={<Badge status="processing" />}
              />
            </Card>
          </Tooltip>
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <Tooltip title={cardTooltips.level}>
            <Card loading={loading} hoverable>
              <Statistic
                title={
                  <Space>
                    <StarOutlined style={{ color: "#722ed1" }} />
                    当前等级
                  </Space>
                }
                value={overview.level}
                valueStyle={{ color: "#722ed1" }}
                suffix="级"
              />
            </Card>
          </Tooltip>
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <Tooltip title={cardTooltips.streakDays}>
            <Card loading={loading} hoverable>
              <Statistic
                title={
                  <Space>
                    <FireOutlined style={{ color: "#ff4d4f" }} />
                    🔥 连续签到
                  </Space>
                }
                value={overview.streakDays}
                valueStyle={{ color: "#ff4d4f" }}
                suffix="天"
              />
            </Card>
          </Tooltip>
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <Tooltip title={cardTooltips.qualityScore}>
            <Card loading={loading} hoverable>
              <Statistic
                title={
                  <Space>
                    <StarOutlined style={{ color: "#13c2c2" }} />
                    📈 质量分
                  </Space>
                }
                value={overview.qualityScore}
                valueStyle={{ color: "#13c2c2" }}
              />
            </Card>
          </Tooltip>
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <Tooltip title={cardTooltips.studyDuration}>
            <Card loading={loading} hoverable>
              <Statistic
                title={
                  <Space>
                    <ClockCircleOutlined style={{ color: "#52c41a" }} />
                    ⏱ 学习时长
                  </Space>
                }
                value={formatDuration(overview.studyDuration)}
                valueStyle={{ color: "#52c41a", fontSize: 18 }}
              />
            </Card>
          </Tooltip>
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
                <Card size="small" style={{ textAlign: "center", borderRadius: 8 }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>🔥</div>
                  <Text strong>连续3天</Text>
                  <div>
                    <Tag color="gold">+3分</Tag>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: "center", borderRadius: 8 }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>⭐</div>
                  <Text strong>连续7天</Text>
                  <div>
                    <Tag color="orange">+10分</Tag>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ textAlign: "center", borderRadius: 8 }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>👑</div>
                  <Text strong>连续30天</Text>
                  <div>
                    <Tag color="red">+50分</Tag>
                  </div>
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
            <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: 12, padding: 16, color: "white" }}>
              <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
                帖子获赞 ≥ 50
              </div>
              <div style={{ fontSize: 28, fontWeight: "bold" }}>
                +30分
              </div>
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

      <CommunityFooter />
    </div>
  );
}
