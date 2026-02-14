import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Timeline, 
  Avatar, 
  Space, 
  Typography,
  Progress,
  List,
  Tag,
  message,
  Spin
} from "antd";
import { 
  UserOutlined, 
  TrophyOutlined, 
  ClockCircleOutlined,
  FireOutlined,
  BookOutlined,
  TeamOutlined,
  EditOutlined
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import api from "../../services/api";

interface UserProfile {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  points: number;
  level: number;
  rank: number;
  todayPosts: number;
  todayComments: number;
  todayLikes: number;
  role: string;
  status: number;
}

const { Title, Text } = Typography;

export default function StudentDashboard() {
  console.log('=== Dashboard 组件开始执行 ===');
  
  const authState = useAppSelector((state: RootState) => state.auth);
  const { username, nickname, userId } = authState;
  
  console.log('完整的 auth state:', authState);
  console.log('提取的变量:', { username, nickname, userId });
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 调试信息
  console.log('Dashboard 组件渲染:', { username, nickname, userId, userProfile, loading });
  
  // 默认数据（用于加载失败时显示）
  const defaultStatsData = {
    totalPoints: 1280,
    level: 5,
    studyHours: 45,
    streakDays: 7,
    postsCount: 24,
    commentsCount: 156,
    todayPosts: 0,
    todayComments: 0,
    todayLikes: 0
  };

  // 使用真实数据或默认数据
  const statsData = userProfile || defaultStatsData;
  
  // 强制使用默认数据显示（临时测试）
  // const statsData = defaultStatsData;

  const recentActivities = [
    {
      activity: "发布了新帖子",
      content: "《React Hooks 学习心得》",
      time: "2小时前",
      type: "post"
    },
    {
      activity: "获得了社区积分",
      content: "+50 积分（优质内容奖励）",
      time: "昨天",
      type: "points"
    },
    {
      activity: "参与了讨论",
      content: "回复了《算法学习疑问》",
      time: "前天",
      type: "comment"
    }
  ];

  // 获取用户资料数据
  useEffect(() => {
    console.log('=== Dashboard useEffect 执行 ===');
    console.log('当前 userId:', userId);
    console.log('当前 userProfile:', userProfile);
    
    const fetchUserProfile = async () => {
      // 确保 userId 存在且有效
      if (!userId || userId <= 0) {
        console.warn('❌ 用户ID无效:', userId);
        setLoading(false);
        return;
      }
      
      try {
        console.log('🚀 开始调用 API 获取用户资料，userId:', userId);
        setLoading(true);
        const response = await api.get(`/user/profile/${userId}`);
        console.log('✅ API响应成功:', response);
        
        if (response.data.success) {
          console.log('✅ 获取用户资料成功:', response.data.data);
          setUserProfile(response.data.data);
        } else {
          throw new Error(response.data.message || '获取用户资料失败');
        }
      } catch (error) {
        console.error('❌ 获取用户资料失败:', error);
        message.error('获取用户资料失败，显示默认数据');
        // 使用默认数据
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    console.log('🔍 触发数据获取...');
    fetchUserProfile();
  }, [userId]);

  const learningGoals = [
    { subject: "前端开发", progress: 75, target: "掌握React核心概念" },
    { subject: "数据结构", progress: 60, target: "完成基础算法练习" },
    { subject: "英语学习", progress: 40, target: "通过四级考试" }
  ];

  // Displayed username and nickname
  const displayName = userProfile?.nickname || nickname || username || "学生用户";
  const displayUsername = userProfile?.username || username || "student_user";
  
  // 调试：打印实际使用的数据
  console.log('显示数据:', { displayName, displayUsername, statsData });

  // 临时移除加载状态检查进行测试
  // if (loading) {
  //   return (
  //     <div style={{ textAlign: 'center', padding: '50px' }}>
  //       <Spin size="large" />
  //       <div style={{ marginTop: 16 }}>加载中...</div>
  //     </div>
  //   );
  // }

  console.log('=== 开始渲染 Dashboard JSX ===');
  console.log('statsData 内容:', statsData);
  
  return (
    <div className="student-dashboard">
      {/* Personal Info Header */}
      {/* Personal Info Header */}
      <Card className="profile-header">
        <Row align="middle" gutter={24}>
          <Col>
            <Avatar 
              size={80} 
              icon={<UserOutlined />} 
            />
          </Col>
          <Col flex="1">
            <Space direction="vertical">
              <Title level={3} style={{ margin: 0 }}>
                {displayName}
                <EditOutlined 
                  style={{ fontSize: 16, color: '#1890ff', marginLeft: 12, cursor: 'pointer' }}
                  onClick={() => message.info('编辑功能待开发')} 
                />
              </Title>
              <Text type="secondary">@{displayUsername}</Text>
              <Text type="secondary">Lv.{statsData.level || 1} 学习者</Text>
              <Space size="large">
                <Text>社区积分：<Text strong>{statsData.points || statsData.totalPoints}</Text></Text>
                <Text>学习时长：<Text strong>{statsData.studyHours}小时</Text></Text>
                <Text>连续打卡：<Text strong>{statsData.streakDays}天</Text></Text>
              </Space>
            </Space>
          </Col>
          <Col>
            <div className="level-badge">
              <FireOutlined style={{ fontSize: 24, color: "#faad14" }} />
              <Text strong>Lv.{statsData.level || 1}</Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="社区积分"
              value={statsData.points || statsData.totalPoints}
              prefix={<TrophyOutlined />}
              suffix="分"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="学习时长"
              value={statsData.studyHours}
              prefix={<ClockCircleOutlined />}
              suffix="小时"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="发布帖子"
              value={statsData.todayPosts !== undefined ? statsData.todayPosts : statsData.postsCount}
              prefix={<TeamOutlined />}
              suffix="篇"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="参与讨论"
              value={statsData.todayComments !== undefined ? statsData.todayComments : statsData.commentsCount}
              prefix={<BookOutlined />}
              suffix="次"
            />
          </Card>
        </Col>
      </Row>

      {/* Learning Progress and Recent Activities */}
      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col span={16}>
          <Card title="学习目标进度">
            <List
              dataSource={learningGoals}
              renderItem={(goal) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>{goal.subject}</Text>
                        <Tag color="blue">{goal.progress}%</Tag>
                      </Space>
                    }
                    description={goal.target}
                  />
                  <Progress 
                    percent={goal.progress} 
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    style={{ width: 200 }}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        
        <Col span={8}>
          <Card title="近期动态">
            <Timeline>
              {recentActivities.map((activity, index) => (
                <Timeline.Item 
                  key={index}
                  dot={
                    <Avatar 
                      size="small" 
                      style={{ 
                        backgroundColor: activity.type === 'post' ? '#1890ff' : 
                                       activity.type === 'points' ? '#52c41a' : '#faad14'
                      }}
                    >
                      {activity.type === 'post' ? '📝' : 
                       activity.type === 'points' ? '🏆' : '💬'}
                    </Avatar>
                  }
                >
                  <Space direction="vertical" size={0}>
                    <Text strong>{activity.activity}</Text>
                    <Text type="secondary">{activity.content}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {activity.time}
                    </Text>
                  </Space>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Col>
      </Row>
    </div>
  );
}