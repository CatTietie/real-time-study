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
  message
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
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";

const { Title, Text } = Typography;

export default function StudentDashboard() {
  const { username, nickname } = useAppSelector((state: RootState) => state.auth);
  
  // Simplified version - using mock data directly
  const statsData = {
    totalPoints: 1280,
    level: 5,
    studyHours: 45,
    streakDays: 7,
    postsCount: 24,
    commentsCount: 156
  };

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

  // Simplified version - removed API calls and complex state management

  const learningGoals = [
    { subject: "前端开发", progress: 75, target: "掌握React核心概念" },
    { subject: "数据结构", progress: 60, target: "完成基础算法练习" },
    { subject: "英语学习", progress: 40, target: "通过四级考试" }
  ];

  // Displayed username and nickname
  const displayName = nickname || username || "学生用户";
  const displayUsername = username || "student_user";

  return (
    <div className="student-dashboard">
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
              <Text type="secondary">Lv.{statsData.level} 学习者</Text>
              <Space size="large">
                <Text>社区积分：<Text strong>{statsData.totalPoints}</Text></Text>
                <Text>学习时长：<Text strong>{statsData.studyHours}小时</Text></Text>
                <Text>连续打卡：<Text strong>{statsData.streakDays}天</Text></Text>
              </Space>
            </Space>
          </Col>
          <Col>
            <div className="level-badge">
              <FireOutlined style={{ fontSize: 24, color: "#faad14" }} />
              <Text strong>Lv.{statsData.level}</Text>
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
              value={statsData.totalPoints}
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
              value={statsData.postsCount}
              prefix={<TeamOutlined />}
              suffix="篇"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="参与讨论"
              value={statsData.commentsCount}
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