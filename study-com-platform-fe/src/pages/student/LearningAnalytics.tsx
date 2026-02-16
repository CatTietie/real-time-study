import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  DatePicker,
  Select,
  Space,
  Button,
  Progress,
  message,
  Spin
} from "antd";
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  BookOutlined,
  DownloadOutlined
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import CommunityFooter from "../../components/community/CommunityFooter";
import api from "../../services/api";
import { fetchCommunityPosts } from "../../services/community";


const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// 学习统计数据类型定义
interface StudyStat {
  date: string;
  postsCount: number; // 发帖数量
  todayPosts: number; // 今日发帖数量
  taskCompletion: number; // 任务完成率(%)
  communityPoints: number; // 社区积分
  commentsMade: number; // 评论数
  likesReceived: number; // 获得点赞数
}

interface WeeklySummary {
  totalPosts: number;
  todayPosts: number;
  taskCompletionRate: number;
  totalCommunityPoints: number;
  completedTasks: number;
  rank: number;
  hotPostsCount: number;
}

// 静态模拟数据
const generateMockData = (userProfile: any): StudyStat[] => {
  const data: StudyStat[] = [];
  const today = new Date();

  // 使用真实的用户数据
  const todayGoals = {
    posts: userProfile?.todayPosts || 0,
    comments: userProfile?.todayComments || 0,
    likes: userProfile?.todayLikes || 0,
    hotPosts: userProfile?.hotPostsCount || 0
  };

  const GOAL_CONFIG = {
    posts: 3,
    comments: 20,
    likes: 50,
    hotPosts: 3
  };

  // 计算今天完成的任务数
  const completedToday = [
    todayGoals.posts >= GOAL_CONFIG.posts,
    todayGoals.comments >= GOAL_CONFIG.comments,
    todayGoals.likes >= GOAL_CONFIG.likes,
    todayGoals.hotPosts >= GOAL_CONFIG.hotPosts
  ].filter(Boolean).length;

  const todayTaskCompletion = Math.round((completedToday / 4) * 100);

  // 累计发帖数量使用用户帖子总数
  const totalPosts = userProfile?.totalPosts || userProfile?.hotPostsCount || 0;

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // 所有日期都使用相同的真实数据，避免随机性
    data.push({
      date: date.toISOString().split('T')[0],
      postsCount: totalPosts, // 累计发帖数量
      todayPosts: userProfile?.todayPosts || 0, // 今日发帖
      taskCompletion: todayTaskCompletion, // 基于实际完成任务计算
      communityPoints: userProfile?.points || 0, // 社区积分
      commentsMade: userProfile?.todayComments || 0, // 今日评论
      likesReceived: userProfile?.todayLikes || 0 // 今日点赞
    });
  }

  return data;
};

const generateWeeklySummary = (data: StudyStat[], userProfile: any): WeeklySummary => {
  
  // 累计发帖数量使用用户帖子总数
  const totalPosts = userProfile?.totalPosts || userProfile?.hotPostsCount || 0;
  const todayPosts = userProfile?.todayPosts || 0;
  
  // 任务完成率基于实际完成的任务数计算
  const todayGoals = {
    posts: userProfile?.todayPosts || 0,
    comments: userProfile?.todayComments || 0,
    likes: userProfile?.todayLikes || 0,
    hotPosts: userProfile?.hotPostsCount || 0
  };

  const GOAL_CONFIG = {
    posts: 3,
    comments: 20,
    likes: 50,
    hotPosts: 3
  };

  const completedTasks = [
    todayGoals.posts >= GOAL_CONFIG.posts,
    todayGoals.comments >= GOAL_CONFIG.comments,
    todayGoals.likes >= GOAL_CONFIG.likes,
    todayGoals.hotPosts >= GOAL_CONFIG.hotPosts
  ].filter(Boolean).length;

  const taskCompletionRate = Math.round((completedTasks / 4) * 100);
  
  const totalCommunityPoints = userProfile?.points || 0;

  return {
    totalPosts, // 累计发帖数量
    todayPosts, // 今日发帖
    taskCompletionRate, // 基于实际完成任务的完成率
    totalCommunityPoints, // 社区积分
    completedTasks, // 已完成任务数
    rank: userProfile?.rank || 1, // 排名
    hotPostsCount: userProfile?.hotPostsCount || 0 // 热榜帖子数量
  };
};

export default function LearningAnalytics() {
  const authState = useAppSelector((state: RootState) => state.auth);
  const { userId } = authState;
  const [loading, setLoading] = useState(true);
  const [studyData, setStudyData] = useState<StudyStat[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'custom'>('week');

  useEffect(() => {
    void loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('开始加载学习统计数据，userId:', userId);
      
      // 获取用户资料数据
      if (userId) {
        // 并行获取用户资料和帖子总数
        const [profileResponse, postsResponse] = await Promise.all([
          api.get(`/user/profile/${userId}`),
          fetchCommunityPosts({ userId, page: 1, pageSize: 1 }) // 只需要总数，不需要具体内容
        ]);
        
        console.log('用户资料API响应:', profileResponse.data);
        console.log('用户帖子API响应:', postsResponse);
        
        if (profileResponse.data.success) {
          const userData = profileResponse.data.data;
          console.log('用户数据:', userData);
          
          // 获取用户帖子总数
          const totalPostsCount = postsResponse?.pagination?.total || 0;
          console.log('用户帖子总数:', totalPostsCount);
          
          // 将帖子总数添加到用户数据中
          const enhancedUserData = {
            ...userData,
            totalPosts: totalPostsCount
          };
          
          setUserProfile(enhancedUserData);
          
          // 生成基于真实数据的统计信息
          const mockData = generateMockData(enhancedUserData);
          console.log('生成的统计数据:', mockData[0]); // 显示第一条数据作为示例
          setStudyData(mockData);
          
          const summary = generateWeeklySummary(mockData, enhancedUserData);
          console.log('周度总结:', summary);
          setWeeklySummary(summary);
          
          message.success('学习统计数据加载成功');
        } else {
          throw new Error('API返回失败');
        }
      } else {
        console.warn('未找到用户ID，使用默认数据');
        // 如果没有userId，使用纯模拟数据
        const mockData = generateMockData(null);
        setStudyData(mockData);
        const defaultSummary = generateWeeklySummary(mockData, null);
        setWeeklySummary({
          ...defaultSummary,
          hotPostsCount: 0
        });
      }
    } catch (error) {
      console.error('数据加载失败:', error);
      message.error('数据加载失败，使用默认数据');
      // 出错时也使用模拟数据
      const mockData = generateMockData(null);
      setStudyData(mockData);
      const errorSummary = generateWeeklySummary(mockData, null);
      setWeeklySummary({
        ...errorSummary,
        hotPostsCount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // 时间段筛选
  const filteredData = studyData.slice(-7); // 默认显示最近7天

  return (
      <div
          className="page-container"
          style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "24px 16px",
            position: "relative"
          }}
      >
        {/* 装饰背景 */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)"
        }} />

        <div style={{
          maxWidth: 1400,
          margin: "0 auto",
          position: "relative",
          zIndex: 1
        }}>
          {/* 标题区域 */}
          <div style={{
            textAlign: "center",
            marginBottom: 32,
            paddingTop: 16
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(255, 255, 255, 0.95)",
              padding: "16px 32px",
              borderRadius: 20,
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              marginBottom: 16,
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.3)"
            }}>
              <BarChartOutlined style={{
                fontSize: 28,
                color: "#667eea",
                filter: "drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3))"
              }} />
              <Title
                  level={2}
                  style={{
                    margin: 0,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 800,
                    fontSize: 32
                  }}
              >
                学习成果统计
              </Title>
              <BookOutlined style={{
                fontSize: 28,
                color: "#10B981",
                filter: "drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3))"
              }} />
            </div>

            <Text type="secondary" style={{
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: 15,
              maxWidth: 600,
              margin: "0 auto",
              display: "block"
            }}>
              全面了解你的社区参与情况，追踪任务完成进度，提升学习活跃度
            </Text>
          </div>

          {/* 主要内容区域 - 数据概览 */}
          <Spin spinning={loading}>
            <div>
              {/* 周度概览卡片 */}
              <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={8} lg={8}>
                  <Card
                      style={{
                        borderRadius: 16,
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        height: "100%"
                      }}
                  >
                    <div style={{ textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <BookOutlined style={{ fontSize: 32, marginBottom: 12, color: "white" }} />
                      <Title level={4} style={{ color: "white", marginBottom: 8 }}>
                        累计发帖
                      </Title>
                      <Statistic
                          value={weeklySummary?.totalPosts || 0}
                          suffix="篇"
                          style={{ color: "white" }}
                          valueStyle={{ color: "white", fontSize: 24, fontWeight: "bold" }}
                      />
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                        热榜 {weeklySummary?.hotPostsCount || userProfile?.hotPostsCount || 0} 篇
                      </Text>
                    </div>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8} lg={8}>
                  <Card
                      style={{
                        borderRadius: 16,
                        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        color: "white",
                        height: "100%"
                      }}
                  >
                    <div style={{ textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <CheckCircleOutlined style={{ fontSize: 32, marginBottom: 12, color: "white" }} />
                      <Title level={4} style={{ color: "white", marginBottom: 8 }}>
                        任务完成率
                      </Title>
                      <Statistic
                          value={weeklySummary?.taskCompletionRate || 0}
                          suffix="%"
                          style={{ color: "white" }}
                          valueStyle={{ color: "white", fontSize: 24, fontWeight: "bold" }}
                      />
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 8 }}>
                        已完成 {weeklySummary?.completedTasks || 0}/4 项任务
                      </Text>
                      <Progress
                          percent={weeklySummary?.taskCompletionRate || 0}
                          showInfo={false}
                          strokeColor="white"
                          trailColor="rgba(255,255,255,0.3)"
                      />
                    </div>
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8} lg={8}>
                  <Card
                      style={{
                        borderRadius: 16,
                        background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                        color: "white",
                        height: "100%"
                      }}
                  >
                    <div style={{ textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <TrophyOutlined style={{ fontSize: 32, marginBottom: 12, color: "white" }} />
                      <Title level={4} style={{ color: "white", marginBottom: 8 }}>
                        社区积分
                      </Title>
                      <Statistic
                          value={weeklySummary?.totalCommunityPoints || 0}
                          suffix="分"
                          style={{ color: "white" }}
                          valueStyle={{ color: "white", fontSize: 24, fontWeight: "bold" }}
                      />
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                        当前排名 第{weeklySummary?.rank || 0}名
                      </Text>
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* 学习趋势图表 */}
              <Card
                  title={
                    <Space>
                      <BarChartOutlined />
                      <span>社区参与趋势</span>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Select
                          defaultValue="week"
                          style={{ width: 120 }}
                          onChange={setTimeRange}
                      >
                        <Option value="week">近一周</Option>
                        <Option value="month">近一月</Option>
                        <Option value="custom">自定义</Option>
                      </Select>
                      {timeRange === 'custom' && (
                          <RangePicker />
                      )}
                    </Space>
                  }
                  style={{ marginBottom: 24, borderRadius: 16 }}
              >
                <div style={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fafafa",
                  borderRadius: 8,
                  border: "1px dashed #d9d9d9"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <BarChartOutlined style={{ fontSize: 48, color: "#1890ff", marginBottom: 16 }} />
                    <Title level={4} style={{ color: "#666" }}>发帖数量趋势图</Title>
                    <Text type="secondary">此处将显示折线图展示发帖数量变化趋势</Text>
                  </div>
                </div>
              </Card>

              {/* 详细数据表格 */}
              <Card
                  title={
                    <Space>
                      <CalendarOutlined />
                      <span>详细参与记录</span>
                    </Space>
                  }
                  style={{ borderRadius: 16 }}
              >
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                    <tr style={{ background: "#fafafa" }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "2px solid #f0f0f0" }}>日期</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>发帖数量</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>任务完成率</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>社区积分</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>评论数</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>获赞数</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredData.map((day) => (
                        <tr key={day.date} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <td style={{ padding: "12px 16px" }}>
                            {new Date(day.date).toLocaleDateString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <Text strong>{day.postsCount}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}> 篇</Text>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <Progress
                                percent={day.taskCompletion}
                                size="small"
                                showInfo={false}
                                strokeColor={day.taskCompletion > 80 ? "#52c41a" : day.taskCompletion > 60 ? "#faad14" : "#ff4d4f"}
                                style={{ width: 80, display: "inline-block" }}
                            />
                            <Text style={{ marginLeft: 8 }}>{day.taskCompletion}%</Text>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <Text strong style={{ color: "#1890ff" }}>+{day.communityPoints}</Text>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <Text>{day.commentsMade}</Text>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <Text>{day.likesReceived}</Text>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </Spin>

          {/* 底部操作栏 */}
          <div style={{
            textAlign: "center",
            marginTop: 24,
            padding: "20px",
            background: "rgba(255, 255, 255, 0.9)",
            borderRadius: 16,
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.3)"
          }}>
            <Space size="large">
              <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  size="large"
                  style={{
                    borderRadius: 24,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    border: "none"
                  }}
              >
                导出统计
              </Button>
              <Button
                  onClick={loadData}
                  size="large"
                  style={{
                    borderRadius: 24,
                    borderColor: "#667eea",
                    color: "#667eea"
                  }}
              >
                刷新数据
              </Button>
            </Space>
          </div>
        </div>

        <CommunityFooter
            style={{
              marginTop: 48,
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              borderRadius: 16,
              padding: 24,
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }}
        />
      </div>
  );
}