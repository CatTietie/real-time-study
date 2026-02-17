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
import { SyncOutlined } from "@ant-design/icons";
import * as echarts from 'echarts';
import { useRef, useEffect } from "react";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  BookOutlined,
  DownloadOutlined
} from "@ant-design/icons";
import { useState } from "react";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import CommunityFooter from "../../components/community/CommunityFooter";
import api from "../../services/api";


const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// 学习统计数据类型定义
interface StudyStat {
  date: string;
  postsCount: number; // 发帖数量
  todayPosts: number; // 今日发帖数量
  viewCount: number; // 当日总浏览量
  viewChange: number; // 相比前一天的变化量
  viewChangePercent: number; // 相比前一天的变化百分比
  viewChangeType: 'increase' | 'decrease' | 'no-change'; // 变化类型
  communityPoints: number; // 社区积分
  commentsMade: number; // 评论数
  likesReceived: number; // 获得点赞数
}

// 趋势数据类型定义
interface TrendDataPoint {
  date: string;
  postsCount: number;
}

// 帖子数据类型定义（与接口返回字段匹配）
interface PostData {
  id: number;
  user_id: number;
  title: string;
  content: string;
  created_at: string;   // 注意字段名为 created_at
  view_count: number;   // 浏览量
  like_count: number;   // 点赞数
  comment_count: number; // 评论数
  // 其他字段...
  [key: string]: unknown;
}

// 用户资料类型定义
interface UserProfile {
  todayPosts?: number;
  todayComments?: number;
  todayLikes?: number;
  hotPostsCount?: number;
  totalPosts?: number;
  points?: number;
  rank?: number;
  // 可以根据实际API响应添加更多字段
  [key: string]: number | string | boolean | undefined;
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

// 从用户帖子数据生成趋势数据（修复字段名）
const generateTrendDataFromPosts = (posts: PostData[]): TrendDataPoint[] => {
  if (!posts || posts.length === 0) {
    return [];
  }

  // 按日期聚合帖子数据
  const dateMap = new Map<string, number>();

  posts.forEach(post => {
    try {
      // 使用 created_at 字段（接口实际返回的字段）
      const dateStr = post.created_at;
      if (!dateStr) {
        console.warn('帖子缺少 created_at 字段:', post.id);
        return;
      }
      const postDate = new Date(dateStr);
      if (isNaN(postDate.getTime())) {
        console.warn('无效的日期格式:', dateStr);
        return;
      }
      const date = postDate.toISOString().split('T')[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    } catch (error) {
      console.warn('处理帖子日期时出错:', post, error);
    }
  });

  // 生成最近30天的数据
  const trendData: TrendDataPoint[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    trendData.push({
      date: dateStr,
      postsCount: dateMap.get(dateStr) || 0
    });
  }

  return trendData;
};

// 从学习统计数据生成趋势数据
const generateTrendDataFromStudyData = (studyData: StudyStat[]): TrendDataPoint[] => {
  // 取最近30天的数据用于趋势分析
  const recentData = studyData.slice(-30);

  return recentData.map(day => ({
    date: day.date,
    postsCount: day.postsCount
  }));
};

// 备用：生成趋势数据（当没有真实数据时使用）
const generateFallbackTrendData = (): TrendDataPoint[] => {
  const data: TrendDataPoint[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const basePosts = 2;
    const variation = Math.sin(i * 0.3) * 1.5;
    const randomFactor = (Math.random() - 0.5) * 2;
    const postsCount = Math.max(0, Math.round(basePosts + variation + randomFactor));

    data.push({
      date: date.toISOString().split('T')[0],
      postsCount
    });
  }

  return data;
};

// 社区参与趋势折线图组件
interface TrendChartProps {
  userPosts: PostData[];
  fallbackStudyData: StudyStat[];
}

const TrendChart = ({ userPosts, fallbackStudyData }: TrendChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // 优先使用真实的用户帖子数据，否则使用备用数据
  let trendData: TrendDataPoint[] = [];
  try {
    trendData = userPosts && userPosts.length > 0
        ? generateTrendDataFromPosts(userPosts)
        : (fallbackStudyData && fallbackStudyData.length > 0
            ? generateTrendDataFromStudyData(fallbackStudyData)
            : generateFallbackTrendData());
  } catch (error) {
    console.error('生成趋势数据时出错:', error);
    trendData = generateFallbackTrendData();
  }

  const filteredData = trendData.slice(-7); // 近7天

  const dates = filteredData.map(point =>
      new Date(point.date).toLocaleDateString('zh-CN', {
        month: 'numeric',
        day: 'numeric'
      })
  );
  const postsCounts = filteredData.map(point => point.postsCount);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option = {
      title: {
        text: '📈 发帖数量趋势 (近7天)',
        left: 'center',
        textStyle: {
          color: '#1f2937',
          fontSize: 16,
          fontWeight: 'bold'
        },
        top: 10
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: echarts.CallbackDataParams[]) => {
          const data = params[0];
          const dateIndex = data.dataIndex;
          const fullDate = new Date(filteredData[dateIndex].date).toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric',
            weekday: 'short'
          });
          return `${fullDate}<br/>发帖数量: ${data.value} 篇`;
        }
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#6b7280', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: Math.max(5, Math.max(...postsCounts) + 1),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 12 },
        splitLine: {
          lineStyle: {
            color: 'rgba(102, 126, 234, 0.1)',
            type: 'dashed'
          }
        }
      },
      series: [{
        data: postsCounts,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: {
          width: 3,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#667eea' },
              { offset: 1, color: '#764ba2' }
            ]
          }
        },
        itemStyle: {
          color: '#667eea',
          borderColor: '#fff',
          borderWidth: 2,
          shadowColor: 'rgba(0,0,0,0.1)',
          shadowBlur: 3
        },
        emphasis: {
          focus: 'series',
          itemStyle: { symbolSize: 14, borderWidth: 3 }
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(102, 126, 234, 0.2)' },
              { offset: 1, color: 'rgba(102, 126, 234, 0.05)' }
            ]
          }
        }
      }],
      grid: { left: '60', right: '20', top: '60', bottom: '40' },
      backgroundColor: '#ffffff'
    };

    chartInstance.current.setOption(option, true);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [dates, postsCounts]);

  return (
      <div style={{ height: 300, padding: '10px', borderRadius: 12, overflow: 'hidden' }}>
        <div ref={chartRef} style={{ height: '100%', width: '100%' }} />
      </div>
  );
};

// 从后端接口数据生成学习统计数据
const generateStudyDataFromApi = (posts: PostData[]): StudyStat[] => {
  if (!posts || posts.length === 0) {
    return [];
  }

  // 按日期聚合数据
  const dateMap = new Map<string, {
    postsCount: number;
    viewCount: number;
    commentsMade: number;
    likesReceived: number;
    communityPoints: number;
  }>();

  posts.forEach(post => {
    try {
      const dateStr = post.created_at;
      if (!dateStr) return;
      
      const postDate = new Date(dateStr);
      if (isNaN(postDate.getTime())) return;
      
      const date = postDate.toISOString().split('T')[0];
      
      const currentDateData = dateMap.get(date) || {
        postsCount: 0,
        viewCount: 0,
        commentsMade: 0,
        likesReceived: 0,
        communityPoints: 0
      };
      
      dateMap.set(date, {
        postsCount: currentDateData.postsCount + 1,
        viewCount: currentDateData.viewCount + (post.view_count || 0),
        commentsMade: currentDateData.commentsMade + (post.comment_count || 0),
        likesReceived: currentDateData.likesReceived + (post.like_count || 0),
        communityPoints: currentDateData.communityPoints + (post.like_count || 0) * 10 + (post.comment_count || 0) * 5 // 假设点赞10分，评论5分
      });
    } catch (error) {
      console.warn('处理帖子数据时出错:', post, error);
    }
  });

  const result: StudyStat[] = [];

  // 生成最近30天的数据
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const currentData = dateMap.get(dateStr);
    const yesterdayDate = new Date(date);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
    const yesterdayData = dateMap.get(yesterdayStr);
    
    let viewChange = 0;
    let viewChangePercent = 0;
    let viewChangeType: 'increase' | 'decrease' | 'no-change' = 'no-change';
    
    if (currentData) {
      if (yesterdayData) {
        viewChange = currentData.viewCount - yesterdayData.viewCount;
        viewChangePercent = yesterdayData.viewCount > 0 
          ? Math.round((viewChange / yesterdayData.viewCount) * 100)
          : (viewChange > 0 ? 100 : 0);
        viewChangeType = viewChange > 0 ? 'increase' : viewChange < 0 ? 'decrease' : 'no-change';
      } else {
        // 昨天没有数据，今天有数据则视为增长
        viewChange = currentData.viewCount;
        viewChangePercent = 100;
        viewChangeType = 'increase';
      }
    }
    
    result.push({
      date: dateStr,
      postsCount: currentData?.postsCount || 0,
      todayPosts: currentData?.postsCount || 0,
      viewCount: currentData?.viewCount || 0,
      viewChange,
      viewChangePercent,
      viewChangeType,
      communityPoints: currentData?.communityPoints || 0,
      commentsMade: currentData?.commentsMade || 0,
      likesReceived: currentData?.likesReceived || 0
    });
  }

  return result;
};

const generateWeeklySummary = (data: StudyStat[], userProfile: UserProfile | null): WeeklySummary => {
  const totalPosts = userProfile?.totalPosts || userProfile?.hotPostsCount || 0;
  const todayPosts = userProfile?.todayPosts || 0;
  const totalCommunityPoints = userProfile?.points || 0;
  
  // 计算平均浏览量作为任务完成率的替代
  const avgViewCount = data.length > 0 
    ? Math.round(data.reduce((sum, day) => sum + day.viewCount, 0) / data.length)
    : 0;

  return {
    totalPosts,
    todayPosts,
    taskCompletionRate: Math.min(100, Math.max(0, avgViewCount)), // 使用平均浏览量替代
    totalCommunityPoints,
    completedTasks: Math.floor(avgViewCount / 50), // 基于浏览量计算完成任务数
    rank: userProfile?.rank || 1,
    hotPostsCount: userProfile?.hotPostsCount || 0
  };
};

export default function LearningAnalytics() {
  const authState = useAppSelector((state: RootState) => state.auth);
  const { userId } = authState;
  const [loading, setLoading] = useState(true);
  const [studyData, setStudyData] = useState<StudyStat[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<PostData[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'custom'>('week');

  // 导出统计数据到Excel
  const exportToExcel = () => {
    try {
      // 准备详细数据
      const exportData = studyData.map(day => ({
        '日期': new Date(day.date).toLocaleDateString('zh-CN'),
        '发帖数量': day.postsCount,
        '浏览量': day.viewCount,
        '浏览量变化': `${day.viewChange > 0 ? '+' : ''}${day.viewChange} (${day.viewChange > 0 ? '+' : ''}${day.viewChangePercent}%)`,
        '社区积分': day.communityPoints,
        '评论数': day.commentsMade,
        '获赞数': day.likesReceived
      }));

      // 创建工作簿
      const wb = XLSX.utils.book_new();
      
      // 添加详细数据表
      const ws1 = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws1, '详细参与记录');

      // 添加汇总数据表
      const summaryData = [{
        '统计项目': '累计发帖',
        '数值': weeklySummary?.totalPosts || 0,
        '单位': '篇'
      }, {
        '统计项目': '任务完成率',
        '数值': weeklySummary?.taskCompletionRate || 0,
        '单位': '%'
      }, {
        '统计项目': '社区积分',
        '数值': weeklySummary?.totalCommunityPoints || 0,
        '单位': '分'
      }, {
        '统计项目': '热榜帖子',
        '数值': weeklySummary?.hotPostsCount || 0,
        '单位': '篇'
      }];
      
      const ws2 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws2, '数据汇总');

      // 生成文件并下载
      const fileName = `学习统计_${new Date().toISOString().split('T')[0]}.xlsx`;
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveAs(blob, fileName);
      
      message.success('统计数据导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  useEffect(() => {
    void loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('开始加载学习统计数据，userId:', userId);

      if (userId) {
        // 获取用户所有帖子数据
        const postsResponse = await api.get(`/community/posts?userId=${userId}&page=1&pageSize=1000`);
        
        console.log('用户帖子API响应:', postsResponse.data);

        if (postsResponse.data.success) {
          const userPostsData: PostData[] = postsResponse.data.data || [];
          console.log('用户帖子数据:', userPostsData);
          setUserPosts(userPostsData);

          // 从帖子数据生成学习统计数据
          const studyDataFromApi = generateStudyDataFromApi(userPostsData);
          setStudyData(studyDataFromApi);
          
          // 生成汇总数据
          const totalPostsCount = userPostsData.length;
          const userProfileData: UserProfile = {
            totalPosts: totalPostsCount,
            todayPosts: studyDataFromApi[studyDataFromApi.length - 1]?.todayPosts || 0,
            todayComments: studyDataFromApi[studyDataFromApi.length - 1]?.commentsMade || 0,
            todayLikes: studyDataFromApi[studyDataFromApi.length - 1]?.likesReceived || 0,
            points: studyDataFromApi.reduce((sum, day) => sum + day.communityPoints, 0),
            hotPostsCount: userPostsData.filter(post => post.view_count > 50).length // 假设浏览量>50为热门帖子
          };
          
          setUserProfile(userProfileData);
          const summary = generateWeeklySummary(studyDataFromApi, userProfileData);
          setWeeklySummary(summary);
          message.success('学习统计数据加载成功');
        } else {
          throw new Error('API返回失败');
        }
      } else {
        console.warn('未找到用户ID，使用默认数据');
        const mockData = generateStudyDataFromApi([]);
        setStudyData(mockData);
        setUserPosts([]);
        const defaultSummary = generateWeeklySummary(mockData, null);
        setWeeklySummary({ ...defaultSummary, hotPostsCount: 0 });
      }
    } catch (error) {
      console.error('数据加载失败:', error);
      message.error('数据加载失败，使用默认数据');
      const mockData = generateStudyDataFromApi([]);
      setStudyData(mockData);
      setUserPosts([]);
      const errorSummary = generateWeeklySummary(mockData, null);
      setWeeklySummary({ ...errorSummary, hotPostsCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const filteredData = studyData.slice(-7);

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
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)"
        }} />

        <div style={{ maxWidth: 1400, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* 标题区域 */}
          <div style={{ textAlign: "center", marginBottom: 24, paddingTop: 16 }}>
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
              <BarChartOutlined style={{ fontSize: 28, color: "#667eea" }} />
              <Title level={2} style={{
                margin: 0,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 800,
                fontSize: 32
              }}>
                学习成果统计
              </Title>
              <BookOutlined style={{ fontSize: 28, color: "#10B981" }} />
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

          {/* 操作按钮区域 - 右上角 */}
          <div style={{
            position: "absolute",
            top: 24,
            right: 24,
            zIndex: 10,
            display: "flex",
            gap: 12
          }}>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              size="large"
              onClick={exportToExcel}
              style={{ 
                borderRadius: 24, 
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                border: "none",
                padding: "0 16px"
              }}
            >
              导出
            </Button>
            <Button 
              onClick={loadData} 
              size="large"
              icon={<SyncOutlined />}
              style={{ 
                borderRadius: 24, 
                borderColor: "#667eea", 
                color: "#667eea",
                background: "rgba(255, 255, 255, 0.9)",
                padding: "0 16px"
              }}
            >
              刷新
            </Button>
          </div>

          <Spin spinning={loading}>
            <div>
              <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={8} lg={8}>
                  <Card style={{
                    borderRadius: 16,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    height: "100%"
                  }}>
                    <div style={{ textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <BookOutlined style={{ fontSize: 32, marginBottom: 12, color: "white" }} />
                      <Title level={4} style={{ color: "white", marginBottom: 8 }}>累计发帖</Title>
                      <Statistic value={weeklySummary?.totalPosts || 0} suffix="篇"
                                 valueStyle={{ color: "white", fontSize: 24, fontWeight: "bold" }} />
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                        热榜 {weeklySummary?.hotPostsCount || userProfile?.hotPostsCount || 0} 篇
                      </Text>
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={8}>
                  <Card style={{
                    borderRadius: 16,
                    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    color: "white",
                    height: "100%"
                  }}>
                    <div style={{ textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <CheckCircleOutlined style={{ fontSize: 32, marginBottom: 12, color: "white" }} />
                      <Title level={4} style={{ color: "white", marginBottom: 8 }}>任务完成率</Title>
                      <Statistic value={weeklySummary?.taskCompletionRate || 0} suffix="%"
                                 valueStyle={{ color: "white", fontSize: 24, fontWeight: "bold" }} />
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 8 }}>
                        已完成 {weeklySummary?.completedTasks || 0}/4 项任务
                      </Text>
                      <Progress percent={weeklySummary?.taskCompletionRate || 0} showInfo={false}
                                strokeColor="white" trailColor="rgba(255,255,255,0.3)" />
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={8}>
                  <Card style={{
                    borderRadius: 16,
                    background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                    color: "white",
                    height: "100%"
                  }}>
                    <div style={{ textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <TrophyOutlined style={{ fontSize: 32, marginBottom: 12, color: "white" }} />
                      <Title level={4} style={{ color: "white", marginBottom: 8 }}>社区积分</Title>
                      <Statistic value={weeklySummary?.totalCommunityPoints || 0} suffix="分"
                                 valueStyle={{ color: "white", fontSize: 24, fontWeight: "bold" }} />
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                        当前排名 第{weeklySummary?.rank || 0}名
                      </Text>
                    </div>
                  </Card>
                </Col>
              </Row>

              <Card
                  title={<Space><BarChartOutlined /><span>社区参与趋势</span></Space>}
                  extra={
                    <Space>
                      <Select defaultValue="week" style={{ width: 120 }} onChange={setTimeRange}>
                        <Option value="week">近一周</Option>
                        <Option value="month">近一月</Option>
                        <Option value="custom">自定义</Option>
                      </Select>
                      {timeRange === 'custom' && <RangePicker />}
                    </Space>
                  }
                  style={{ marginBottom: 24, borderRadius: 16 }}
              >
                <TrendChart userPosts={userPosts} fallbackStudyData={studyData} />
              </Card>

              <Card title={<Space><CalendarOutlined /><span>详细参与记录</span></Space>} style={{ borderRadius: 16 }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                    <tr style={{ background: "#fafafa" }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "2px solid #f0f0f0" }}>日期</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>发帖数量</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>浏览量变化</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>社区积分</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>评论数</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #f0f0f0" }}>获赞数</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredData.map((day) => (
                        <tr key={day.date} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <td style={{ padding: "12px 16px" }}>
                            {new Date(day.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <Text strong>{day.postsCount}</Text><Text type="secondary" style={{ fontSize: 12 }}> 篇</Text>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                              <Text strong>{day.viewCount}</Text>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                {day.viewChangeType === 'increase' ? (
                                  <span style={{ color: "#52c41a", fontSize: "16px" }}>↑</span>
                                ) : day.viewChangeType === 'decrease' ? (
                                  <span style={{ color: "#ff4d4f", fontSize: "16px" }}>↓</span>
                                ) : (
                                  <span style={{ color: "#faad14", fontSize: "16px" }}>-</span>
                                )}
                                <Text 
                                  style={{ 
                                    color: day.viewChangeType === 'increase' ? "#52c41a" : 
                                           day.viewChangeType === 'decrease' ? "#ff4d4f" : "#faad14",
                                    fontSize: "12px" 
                                  }}
                                >
                                  {day.viewChange > 0 ? '+' : ''}{day.viewChange} ({day.viewChange > 0 ? '+' : ''}{day.viewChangePercent}%)
                                </Text>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <Text strong style={{ color: "#1890ff" }}>+{day.communityPoints}</Text>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}><Text>{day.commentsMade}</Text></td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}><Text>{day.likesReceived}</Text></td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </Spin>


        </div>

        <CommunityFooter style={{
          marginTop: 48,
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: 16,
          padding: 24,
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }} />
      </div>
  );
}