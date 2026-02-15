import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Tabs,
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
  LineChartOutlined,
  PieChartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  FireOutlined,
  BookOutlined,
  UserOutlined,
  DownloadOutlined
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import CommunityFooter from "../../components/community/CommunityFooter";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// 学习统计数据类型定义
interface StudyStat {
  date: string;
  studyTime: number; // 学习时长(分钟)
  taskCompletion: number; // 任务完成率(%)
  pointsEarned: number; // 获得积分
  postsCreated: number; // 发帖数
  commentsMade: number; // 评论数
  viewsReceived: number; // 获得浏览量
}

interface WeeklySummary {
  totalStudyTime: number;
  avgDailyTime: number;
  taskCompletionRate: number;
  totalPoints: number;
  streakDays: number;
  rank: number;
}

// 静态模拟数据
const generateMockData = (): StudyStat[] => {
  const data: StudyStat[] = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      studyTime: Math.floor(Math.random() * 180) + 30, // 30-210分钟
      taskCompletion: Math.floor(Math.random() * 40) + 60, // 60-100%
      pointsEarned: Math.floor(Math.random() * 50) + 10, // 10-60积分
      postsCreated: Math.floor(Math.random() * 3), // 0-2篇
      commentsMade: Math.floor(Math.random() * 5), // 0-4条
      viewsReceived: Math.floor(Math.random() * 20) // 0-19次
    });
  }
  
  return data;
};

const generateWeeklySummary = (data: StudyStat[]): WeeklySummary => {
  const last7Days = data.slice(-7);
  const totalStudyTime = last7Days.reduce((sum, day) => sum + day.studyTime, 0);
  const avgDailyTime = Math.round(totalStudyTime / 7);
  const taskCompletionRate = Math.round(last7Days.reduce((sum, day) => sum + day.taskCompletion, 0) / 7);
  const totalPoints = last7Days.reduce((sum, day) => sum + day.pointsEarned, 0);
  
  // 计算连续打卡天数
  let streakDays = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].studyTime > 0) {
      streakDays++;
    } else {
      break;
    }
  }
  
  return {
    totalStudyTime,
    avgDailyTime,
    taskCompletionRate,
    totalPoints,
    streakDays,
    rank: Math.floor(Math.random() * 100) + 1 // 随机排名1-100
  };
};

export default function LearningAnalytics() {
  const { /* userId, username */ } = useAppSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [studyData, setStudyData] = useState<StudyStat[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'custom'>('week');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    try {
      // 模拟API调用延迟
      setTimeout(() => {
        const mockData = generateMockData();
        setStudyData(mockData);
        setWeeklySummary(generateWeeklySummary(mockData));
        setLoading(false);
        message.success('学习统计数据加载成功');
      }, 800);
    } catch (_error) {
      message.error('数据加载失败');
      setLoading(false);
    }
  };

  // 图表数据处理函数
  /* const getChartData = (dataType: keyof StudyStat) => {
    return studyData.map(item => ({
      date: item.date,
      value: item[dataType]
    }));
  }; */

  // 时间段筛选
  const filteredData = studyData.slice(-7); // 默认显示最近7天

  const OverviewTab = () => (
    <div>
      {/* 周度概览卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card 
            style={{ 
              borderRadius: 16,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white"
            }}
          >
            <div style={{ textAlign: "center" }}>
              <ClockCircleOutlined style={{ fontSize: 32, marginBottom: 12, color: "white" }} />
              <Title level={4} style={{ color: "white", marginBottom: 8 }}>
                总学习时长
              </Title>
              <Statistic 
                value={weeklySummary?.totalStudyTime || 0} 
                suffix="分钟" 
                style={{ color: "white" }}
                valueStyle={{ color: "white", fontSize: 24, fontWeight: "bold" }}
              />
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                日均 {weeklySummary?.avgDailyTime || 0} 分钟
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card 
            style={{ 
              borderRadius: 16,
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              color: "white"
            }}
          >
            <div style={{ textAlign: "center" }}>
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
              <Progress 
                percent={weeklySummary?.taskCompletionRate || 0} 
                showInfo={false} 
                strokeColor="white"
                trailColor="rgba(255,255,255,0.3)"
                style={{ marginTop: 8 }}
              />
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card 
            style={{ 
              borderRadius: 16,
              background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
              color: "white"
            }}
          >
            <div style={{ textAlign: "center" }}>
              <TrophyOutlined style={{ fontSize: 32, marginBottom: 12, color: "white" }} />
              <Title level={4} style={{ color: "white", marginBottom: 8 }}>
                获得积分
              </Title>
              <Statistic 
                value={weeklySummary?.totalPoints || 0} 
                suffix="分" 
                style={{ color: "white" }}
                valueStyle={{ color: "white", fontSize: 24, fontWeight: "bold" }}
              />
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                连续打卡 {weeklySummary?.streakDays || 0} 天
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 学习趋势图表 */}
      <Card 
        title={
          <Space>
            <LineChartOutlined />
            <span>学习趋势分析</span>
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
            <Title level={4} style={{ color: "#666" }}>学习时长趋势图</Title>
            <Text type="secondary">此处将显示折线图展示学习时长变化趋势</Text>
          </div>
        </div>
      </Card>

      {/* 详细数据表格 */}
      <Card 
        title={
          <Space>
            <CalendarOutlined />
            <span>详细学习记录</span>
          </Space>
        }
        style={{ borderRadius: 16 }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "2px solid #f0f0f0" }}>日期</th>
                <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>学习时长</th>
                <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>任务完成率</th>
                <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>获得积分</th>
                <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>发帖数</th>
                <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>评论数</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((day /* , index */) => (
                <tr key={day.date} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "12px 16px" }}>
                    {new Date(day.date).toLocaleDateString('zh-CN', { 
                      month: 'short', 
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <Text strong>{day.studyTime}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}> 分钟</Text>
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
                    <Text strong style={{ color: "#1890ff" }}>+{day.pointsEarned}</Text>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <Text>{day.postsCreated}</Text>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <Text>{day.commentsMade}</Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const ChartsTab = () => (
    <div>
      <Row gutter={[24, 24]}>
        <Col span={12}>
          <Card 
            title={
              <Space>
                <BarChartOutlined />
                <span>学习时长分布</span>
              </Space>
            }
            style={{ borderRadius: 16 }}
          >
            <div style={{ 
              height: 300, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              background: "#fafafa",
              borderRadius: 8
            }}>
              <PieChartOutlined style={{ fontSize: 48, color: "#52c41a", marginBottom: 16 }} />
              <div>
                <Title level={4} style={{ color: "#666", textAlign: "center" }}>学习时段分析</Title>
                <Text type="secondary">此处将显示饼图展示不同时段的学习时长占比</Text>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card 
            title={
              <Space>
                <LineChartOutlined />
                <span>积分增长趋势</span>
              </Space>
            }
            style={{ borderRadius: 16 }}
          >
            <div style={{ 
              height: 300, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              background: "#fafafa",
              borderRadius: 8
            }}>
              <FireOutlined style={{ fontSize: 48, color: "#fa8c16", marginBottom: 16 }} />
              <div>
                <Title level={4} style={{ color: "#666", textAlign: "center" }}>积分累积曲线</Title>
                <Text type="secondary">此处将显示折线图展示积分增长趋势</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      
      <Card 
        title={
          <Space>
            <BookOutlined />
            <span>社区互动统计</span>
          </Space>
        }
        style={{ marginTop: 24, borderRadius: 16 }}
      >
        <div style={{ 
          height: 300, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          background: "#fafafa",
          borderRadius: 8
        }}>
          <UserOutlined style={{ fontSize: 48, color: "#722ed1", marginBottom: 16 }} />
          <div>
            <Title level={4} style={{ color: "#666", textAlign: "center" }}>互动活跃度分析</Title>
            <Text type="secondary">此处将显示柱状图展示发帖、评论、获赞等互动数据</Text>
          </div>
        </div>
      </Card>
    </div>
  );

  const AchievementsTab = () => (
    <div>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card 
            title={
              <Space>
                <TrophyOutlined />
                <span>学习成就</span>
              </Space>
            }
            style={{ borderRadius: 16 }}
          >
            <Row gutter={[16, 16]}>
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Col xs={12} sm={8} md={6} key={item}>
                  <div style={{
                    textAlign: "center",
                    padding: "24px 16px",
                    background: item <= 3 ? "linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)" : "#fafafa",
                    borderRadius: 12,
                    border: item <= 3 ? "2px solid #ffd700" : "1px solid #d9d9d9",
                    transition: "all 0.3s ease"
                  }}>
                    <div style={{
                      width: 64,
                      height: 64,
                      background: item <= 3 ? "linear-gradient(135deg, #ffd700 0%, #ffb700 100%)" : "#d9d9d9",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                      color: "white",
                      fontSize: 24,
                      fontWeight: "bold"
                    }}>
                      {item <= 3 ? "🏆" : "🔒"}
                    </div>
                    <Title level={5} style={{ margin: "0 0 8px 0" }}>
                      {item <= 3 ? `成就 ${item}` : "未解锁"}
                    </Title>
                    <Text type={item <= 3 ? "success" : "secondary"}>
                      {item <= 3 ? "已达成" : "条件：连续学习7天"}
                    </Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );

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
              学习统计分析
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
            全面了解你的学习情况，发现进步空间，制定更好的学习计划
          </Text>
        </div>

        {/* 主要内容区域 */}
        <Spin spinning={loading}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'overview',
                label: (
                  <Space>
                    <BarChartOutlined />
                    数据概览
                  </Space>
                ),
                children: <OverviewTab />
              },
              {
                key: 'charts',
                label: (
                  <Space>
                    <LineChartOutlined />
                    图表分析
                  </Space>
                ),
                children: <ChartsTab />
              },
              {
                key: 'achievements',
                label: (
                  <Space>
                    <TrophyOutlined />
                    学习成就
                  </Space>
                ),
                children: <AchievementsTab />
              }
            ]}
            style={{ borderRadius: 16 }}
            tabBarStyle={{
              background: "white",
              borderRadius: "16px 16px 0 0",
              padding: "0 24px",
              marginBottom: 0
            }}
          />
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
              导出报告
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