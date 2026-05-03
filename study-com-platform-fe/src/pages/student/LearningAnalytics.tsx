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
  Spin,
  Drawer,
  List,
  Tag,
  Divider,
  Tooltip
} from "antd";
import { SyncOutlined } from "@ant-design/icons";
import * as echarts from 'echarts';
import { useRef, useEffect, useState, useCallback } from "react";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  BarChartOutlined,
  CalendarOutlined,
  TrophyOutlined,
  BookOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  FireOutlined,
  StarOutlined,
  LineChartOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import CommunityFooter from "../../components/community/CommunityFooter";
import api from "../../services/api";
import {
  fetchLearningStatsCards,
  fetchStudyDurationDetail,
  fetchLoginStreakDetail,
  fetchContentQualityDetail,
  fetchDailyStudyRecords,
  type LearningStatsCardsData,
  type DailyStudyRecord
} from "../../services/communityPublic";
import {
  fetchCommunityProfileSummary,
  fetchUserTodayStats
} from "../../services/communityPublic";

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// 学习统计数据类型定义
interface StudyStat {
  date: string;
  postsCount: number;
  todayPosts: number;
  viewCount: number;
  viewChange: number;
  viewChangePercent: number;
  viewChangeType: 'increase' | 'decrease' | 'no-change';
  communityPoints: number;
  commentsMade: number;
  likesReceived: number;
}

// 趋势数据类型定义
interface TrendDataPoint {
  date: string;
  postsCount: number;
}

// 帖子数据类型定义
interface PostData {
  id: number;
  user_id: number;
  title: string;
  content: string;
  created_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
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

// 抽屉详情类型
type DrawerType = 'duration' | 'streak' | 'quality' | 'posts' | 'completion' | 'points' | null;

// 从用户帖子数据生成趋势数据
const generateTrendDataFromPosts = (posts: PostData[]): TrendDataPoint[] => {
  if (!posts || posts.length === 0) {
    return [];
  }

  const dateMap = new Map<string, number>();

  posts.forEach(post => {
    try {
      const dateStr = post.created_at;
      if (!dateStr) {
        return;
      }
      const postDate = new Date(dateStr);
      if (isNaN(postDate.getTime())) {
        return;
      }
      const date = postDate.toISOString().split('T')[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    } catch (error) {
      console.warn('处理帖子日期时出错:', post, error);
    }
  });

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
  const recentData = studyData.slice(-30);

  return recentData.map(day => ({
    date: day.date,
    postsCount: day.postsCount
  }));
};

// 备用：生成趋势数据
const generateFallbackTrendData = (): TrendDataPoint[] => {
  const data: TrendDataPoint[] = [];
  const today = new Date();

  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      postsCount: 0
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

  const filteredData = trendData.slice(-7);

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
        text: postsCounts.every(count => count === 0) 
          ? '📈 发帖数量趋势 (暂无发帖记录)' 
          : '📈 发帖数量趋势 (近7天)',
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
        max: postsCounts.every(count => count === 0) ? 1 : Math.max(5, Math.max(...postsCounts) + 1),
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

// 学习目标类型定义
interface LearningGoals {
  goal_posts: number;
  goal_comments: number;
  goal_hot_posts: number;
  goal_points: number;
}

// 从后端接口数据生成学习统计数据
const generateStudyDataFromApi = (posts: PostData[]): StudyStat[] => {
  if (!posts || posts.length === 0) {
    return [];
  }

  const dateMap = new Map<string, {
    postsCount: number;
    viewCount: number;
    commentsMade: number;
    likesReceived: number;
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
        likesReceived: 0
      };
      
      dateMap.set(date, {
        postsCount: currentDateData.postsCount + 1,
        viewCount: currentDateData.viewCount + (post.view_count || 0),
        commentsMade: currentDateData.commentsMade + (post.comment_count || 0),
        likesReceived: currentDateData.likesReceived + (post.like_count || 0)
      });
    } catch (error) {
      console.warn('处理帖子数据时出错:', post, error);
    }
  });

  const result: StudyStat[] = [];

  const today = new Date();
  for (let i = 29; i >= 0; i -= 1) {
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
      communityPoints: 0,
      commentsMade: currentData?.commentsMade || 0,
      likesReceived: currentData?.likesReceived || 0
    });
  }

  return result;
};

const generateWeeklySummary = (data: StudyStat[], userProfile: UserProfile | null, learningGoals: LearningGoals | null): WeeklySummary => {
  const totalPosts = userProfile?.totalPosts || userProfile?.hotPostsCount || 0;
  const todayPosts = userProfile?.todayPosts || 0;
  const totalCommunityPoints = userProfile?.points || 0;
  
  const goalPosts = learningGoals?.goal_posts || 3;
  const goalComments = learningGoals?.goal_comments || 20;
  const goalHotPosts = learningGoals?.goal_hot_posts || 1;
  const goalPoints = learningGoals?.goal_points || 500;
  
  const postsCompletion = Math.min(100, Math.round((todayPosts / goalPosts) * 100));
  const commentsCompletion = userProfile?.todayComments !== undefined 
    ? Math.min(100, Math.round((userProfile.todayComments / goalComments) * 100))
    : 0;
  const hotPostsCompletion = userProfile?.hotPostsCount !== undefined
    ? Math.min(100, Math.round((userProfile.hotPostsCount / goalHotPosts) * 100))
    : 0;
  const pointsCompletion = totalCommunityPoints !== undefined
    ? Math.min(100, Math.round((totalCommunityPoints / goalPoints) * 100))
    : 0;
  
  const taskCompletionRate = Math.round((postsCompletion + commentsCompletion + hotPostsCompletion + pointsCompletion) / 4);
  
  const completedTasks = [
    postsCompletion >= 80 ? 1 : 0,
    commentsCompletion >= 80 ? 1 : 0,
    hotPostsCompletion >= 80 ? 1 : 0,
    pointsCompletion >= 80 ? 1 : 0
  ].reduce((sum, val) => sum + val, 0);

  return {
    totalPosts,
    todayPosts,
    taskCompletionRate: Math.max(0, Math.min(100, taskCompletionRate)),
    totalCommunityPoints,
    completedTasks,
    rank: userProfile?.rank || 1,
    hotPostsCount: userProfile?.hotPostsCount || 0
  };
};

// 数字跳动动画 Hook
const useCountUp = (end: number, duration: number = 1000, start: boolean = true) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!start) {
      setCount(0);
      return;
    }
    
    let startTime: number | null = null;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, start]);
  
  return count;
};

// 统计卡片组件
interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  gradient: string;
  value: number | string;
  suffix?: string;
  subtitle?: string;
  onClick?: () => void;
  isActive?: boolean;
  showCountUp?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  icon,
  gradient,
  value,
  suffix,
  subtitle,
  onClick,
  isActive = true,
  showCountUp = false
}) => {
  const animatedValue = useCountUp(
    typeof value === 'number' ? value : 0,
    1500,
    showCountUp && typeof value === 'number'
  );
  
  const displayValue = showCountUp && typeof value === 'number' ? animatedValue : value;

  return (
    <div
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        borderRadius: 16,
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        background: gradient,
        opacity: isActive ? 1 : 0.6,
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        height: '100%'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-8px)';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.1)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: 24,
        textAlign: 'center',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{
          fontSize: 32,
          marginBottom: 12,
          color: isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.5)'
        }}>
          {icon}
        </div>
        <Title level={5} style={{
          color: isActive ? 'white' : 'rgba(255, 255, 255, 0.6)',
          marginBottom: 8,
          fontSize: 14,
          fontWeight: 500
        }}>
          {title}
        </Title>
        <div style={{
          color: isActive ? 'white' : 'rgba(255, 255, 255, 0.6)',
          fontSize: 28,
          fontWeight: 'bold',
          marginBottom: 4
        }}>
          {displayValue}
          {suffix && <span style={{ fontSize: 14, fontWeight: 'normal', marginLeft: 4 }}>{suffix}</span>}
        </div>
        {subtitle && (
          <Text style={{
            color: isActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)',
            fontSize: 13
          }}>
            {subtitle}
          </Text>
        )}
      </div>
    </div>
  );
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
  
  // 新的学习统计数据
  const [learningStats, setLearningStats] = useState<LearningStatsCardsData | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyStudyRecord[]>([]);
  
  // 抽屉状态
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerType>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // 导出统计数据到Excel
  const exportToExcel = () => {
    try {
      const exportData = studyData.map(day => ({
        '日期': new Date(day.date).toLocaleDateString('zh-CN'),
        '发帖数量': day.postsCount,
        '浏览量': day.viewCount,
        '浏览量变化': `${day.viewChange > 0 ? '+' : ''}${day.viewChange} (${day.viewChange > 0 ? '+' : ''}${day.viewChangePercent}%)`,
        '社区积分': day.communityPoints,
        '评论数': day.commentsMade,
        '获赞数': day.likesReceived
      }));

      const wb = XLSX.utils.book_new();
      
      const ws1 = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws1, '详细参与记录');

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

  // 获取学习目标数据
  const fetchLearningGoals = async () => {
    if (!userId) return null;
    
    try {
      const response = await api.get('/learning-goals/me');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('获取学习目标失败:', error);
    }
    return null;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('开始加载学习统计数据，userId:', userId);

      if (userId) {
        // 并行获取所有数据
        const [profileResponse, goalsData, learningStatsResponse] = await Promise.all([
          api.get(`/user/profile/${userId}`),
          fetchLearningGoals(),
          fetchLearningStatsCards()
        ]);
        
        // 获取用户所有帖子数据
        const postsResponse = await api.get(`/community/posts?userId=${userId}&page=1&pageSize=1000`);
        
        console.log('用户帖子API响应:', postsResponse.data);

        if (postsResponse.data.success) {
          const userPostsData: PostData[] = postsResponse.data.data || [];
          console.log('用户帖子数据:', userPostsData);
          setUserPosts(userPostsData);

          // 设置用户资料
          if (profileResponse.data.success) {
            const profileData = profileResponse.data.data;
            const userProfileData: UserProfile = {
              totalPosts: profileData.totalPosts || userPostsData.length,
              todayPosts: profileData.todayPosts || 0,
              todayComments: profileData.todayComments || 0,
              todayLikes: profileData.todayLikes || 0,
              points: profileData.points || 0,
              rank: profileData.rank || 1,
              hotPostsCount: profileData.hotPostsCount || 0
            };
            
            setUserProfile(userProfileData);
            
            // 从帖子数据生成学习统计数据
            const studyDataFromApi = generateStudyDataFromApi(userPostsData);
            setStudyData(studyDataFromApi);
            
            // 生成汇总数据
            const summary = generateWeeklySummary(studyDataFromApi, userProfileData, goalsData);
            setWeeklySummary(summary);
            
            // 设置新的学习统计数据
            if (learningStatsResponse.success && learningStatsResponse.data) {
              setLearningStats(learningStatsResponse.data);
            }
          }
          
          message.success('学习统计数据加载成功');
        } else {
          throw new Error('API返回失败');
        }
      } else {
        console.warn('未找到用户ID，使用默认数据');
        const mockData = generateStudyDataFromApi([]);
        setStudyData(mockData);
        setUserPosts([]);
        const defaultSummary = generateWeeklySummary(mockData, null, null);
        setWeeklySummary({ ...defaultSummary, hotPostsCount: 0 });
      }
    } catch (error) {
      console.error('数据加载失败:', error);
      message.error('数据加载失败，使用默认数据');
      const mockData = generateStudyDataFromApi([]);
      setStudyData(mockData);
      setUserPosts([]);
      const errorSummary = generateWeeklySummary(mockData, null, null);
      setWeeklySummary({ ...errorSummary, hotPostsCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  // 打开抽屉
  const openDrawer = async (type: DrawerType) => {
    setDrawerType(type);
    setDrawerVisible(true);
    setDrawerLoading(true);
    
    try {
      if (type === 'duration') {
        const res = await fetchStudyDurationDetail();
        if (res.success && res.data) {
          // 可以在这里处理数据
        }
      } else if (type === 'streak') {
        const res = await fetchLoginStreakDetail();
        if (res.success && res.data) {
          // 可以在这里处理数据
        }
      } else if (type === 'quality') {
        const res = await fetchContentQualityDetail();
        if (res.success && res.data) {
          // 可以在这里处理数据
        }
      } else if (type === 'posts' || type === 'completion' || type === 'points') {
        const res = await fetchDailyStudyRecords(7);
        if (res.success && res.data) {
          setDailyRecords(res.data);
        }
      }
    } catch (error) {
      console.error('获取详情失败:', error);
    } finally {
      setDrawerLoading(false);
    }
  };

  // 关闭抽屉
  const closeDrawer = () => {
    setDrawerVisible(false);
    setDrawerType(null);
  };

  // 获取抽屉标题
  const getDrawerTitle = () => {
    switch (drawerType) {
      case 'duration': return '学习时长详情';
      case 'streak': return '连续活跃天数';
      case 'quality': return '内容质量分析';
      case 'posts': return '发帖统计详情';
      case 'completion': return '任务完成详情';
      case 'points': return '社区积分详情';
      default: return '详情';
    }
  };

  const filteredData = studyData.slice(-7);

  // 卡片渐变配置
  const cardGradients = {
    blue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    orange: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    purple: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    cyan: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    pink: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    green: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)'
  };

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
              {/* 统计卡片区域 - 6个指标 */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {/* 1. 学习时长 */}
                <Col xs={24} sm={12} md={8} lg={4}>
                  <StatCard
                    title="学习时长"
                    icon={<ClockCircleOutlined />}
                    gradient={cardGradients.blue}
                    value={learningStats?.studyDuration?.today || 0}
                    suffix="分钟"
                    subtitle={`累计 ${learningStats?.studyDuration?.total || 0} 分钟`}
                    onClick={() => openDrawer('duration')}
                    showCountUp
                  />
                </Col>

                {/* 2. 连续活跃天数 */}
                <Col xs={24} sm={12} md={8} lg={4}>
                  <StatCard
                    title="连续活跃"
                    icon={
                      <Tooltip title={learningStats?.loginStreak?.isActive ? "持续活跃中！" : "已中断，快回来继续学习吧"}>
                        <FireOutlined style={{ 
                          color: learningStats?.loginStreak?.isActive ? '#ff6b6b' : '#999',
                          filter: learningStats?.loginStreak?.isActive ? 'drop-shadow(0 0 8px rgba(255, 107, 107, 0.6))' : 'none'
                        }} />
                      </Tooltip>
                    }
                    gradient={cardGradients.orange}
                    value={learningStats?.loginStreak?.current || 0}
                    suffix="天"
                    subtitle={learningStats?.loginStreak?.isActive ? "🔥 持续活跃中" : "💔 已中断"}
                    onClick={() => openDrawer('streak')}
                    isActive={learningStats?.loginStreak?.isActive !== false}
                    showCountUp
                  />
                </Col>

                {/* 3. 内容质量分 */}
                <Col xs={24} sm={12} md={8} lg={4}>
                  <StatCard
                    title="内容质量分"
                    icon={<StarOutlined />}
                    gradient={cardGradients.purple}
                    value={learningStats?.contentQuality?.score || 0}
                    subtitle={`点赞 ${learningStats?.contentQuality?.totalLikes || 0} 次，评论 ${learningStats?.contentQuality?.totalComments || 0} 条`}
                    onClick={() => openDrawer('quality')}
                    showCountUp
                  />
                </Col>

                {/* 4. 发帖统计 */}
                <Col xs={24} sm={12} md={8} lg={4}>
                  <StatCard
                    title="发帖统计"
                    icon={<BookOutlined />}
                    gradient={cardGradients.cyan}
                    value={learningStats?.postsStats?.today || 0}
                    suffix="篇"
                    subtitle={`累计 ${learningStats?.postsStats?.total || 0} 篇，热榜 ${learningStats?.postsStats?.hotPosts || 0} 篇`}
                    onClick={() => openDrawer('posts')}
                    showCountUp
                  />
                </Col>

                {/* 5. 任务完成率 */}
                <Col xs={24} sm={12} md={8} lg={4}>
                  <StatCard
                    title="任务完成率"
                    icon={<CheckCircleOutlined />}
                    gradient={cardGradients.pink}
                    value={learningStats?.taskCompletion?.rate || 0}
                    suffix="%"
                    subtitle={`已完成 ${learningStats?.taskCompletion?.completedTasks || 0}/${learningStats?.taskCompletion?.totalTasks || 4} 项`}
                    onClick={() => openDrawer('completion')}
                    showCountUp
                  />
                </Col>

                {/* 6. 社区积分 */}
                <Col xs={24} sm={12} md={8} lg={4}>
                  <StatCard
                    title="社区积分"
                    icon={<TrophyOutlined />}
                    gradient={cardGradients.green}
                    value={learningStats?.communityPoints?.total || 0}
                    suffix="分"
                    subtitle={`当前排名 第${learningStats?.communityPoints?.rank || 0}名`}
                    onClick={() => openDrawer('points')}
                    showCountUp
                  />
                </Col>
              </Row>

              {/* 任务完成进度条 */}
              {learningStats?.taskCompletion && (
                <Card style={{ 
                  marginBottom: 24, 
                  borderRadius: 16,
                  backdropFilter: 'blur(10px)',
                  background: 'rgba(255, 255, 255, 0.95)'
                }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Title level={5}>今日任务进度</Title>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12}>
                        <div style={{ marginBottom: 8 }}>
                          <Space>
                            <Text strong>发帖目标</Text>
                            <Tag color={learningStats.postsStats.today >= 3 ? 'success' : 'processing'}>
                              {learningStats.postsStats.today}/3 篇
                            </Tag>
                          </Space>
                        </div>
                        <Progress 
                          percent={Math.min(100, (learningStats.postsStats.today / 3) * 100)} 
                          strokeColor="#667eea"
                          size="small"
                        />
                      </Col>
                      <Col xs={24} sm={12}>
                        <div style={{ marginBottom: 8 }}>
                          <Space>
                            <Text strong>积分目标</Text>
                            <Tag color={learningStats.communityPoints.total >= 500 ? 'success' : 'processing'}>
                              {learningStats.communityPoints.total}/500 分
                            </Tag>
                          </Space>
                        </div>
                        <Progress 
                          percent={Math.min(100, (learningStats.communityPoints.total / 500) * 100)} 
                          strokeColor="#52c41a"
                          size="small"
                        />
                      </Col>
                    </Row>
                  </Space>
                </Card>
              )}

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
                  style={{ 
                    marginBottom: 24, 
                    borderRadius: 16,
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(255, 255, 255, 0.95)'
                  }}
              >
                <TrendChart userPosts={userPosts} fallbackStudyData={studyData} />
              </Card>

              <Card 
                title={<Space><CalendarOutlined /><span>详细参与记录</span></Space>} 
                style={{ 
                  borderRadius: 16,
                  backdropFilter: 'blur(10px)',
                  background: 'rgba(255, 255, 255, 0.95)'
                }}
              >
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

        {/* 抽屉组件 */}
        <Drawer
          title={getDrawerTitle()}
          placement="right"
          onClose={closeDrawer}
          open={drawerVisible}
          width={400}
          maskClosable={true}
        >
          <Spin spinning={drawerLoading}>
            {drawerType === 'duration' && learningStats?.studyDuration && (
              <div>
                <Title level={5}>学习时长统计</Title>
                <Statistic 
                  title="今日学习时长" 
                  value={learningStats.studyDuration.today} 
                  suffix="分钟"
                  valueStyle={{ color: '#667eea' }}
                />
                <Divider />
                <Statistic 
                  title="累计学习时长" 
                  value={learningStats.studyDuration.total} 
                  suffix="分钟"
                  valueStyle={{ color: '#52c41a' }}
                />
                <Divider />
                <Title level={5}>近30天记录</Title>
                <List
                  dataSource={learningStats.studyDuration.dailyRecords?.slice(-10) || []}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Space>
                        <Text>{item.date}</Text>
                        <Tag color={item.duration > 0 ? 'blue' : 'default'}>
                          {item.duration > 0 ? `${item.duration} 分钟` : '无记录'}
                        </Tag>
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {drawerType === 'streak' && learningStats?.loginStreak && (
              <div>
                <Title level={5}>连续活跃天数</Title>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <FireOutlined style={{ 
                    fontSize: 64, 
                    color: learningStats.loginStreak.isActive ? '#ff6b6b' : '#999',
                    filter: learningStats.loginStreak.isActive ? 'drop-shadow(0 0 12px rgba(255, 107, 107, 0.8))' : 'none'
                  }} />
                  <div style={{ marginTop: 16 }}>
                    <Statistic 
                      value={learningStats.loginStreak.current} 
                      suffix="天"
                      valueStyle={{ 
                        color: learningStats.loginStreak.isActive ? '#ff6b6b' : '#999',
                        fontSize: 48 
                      }}
                    />
                  </div>
                  <Tag 
                    color={learningStats.loginStreak.isActive ? 'success' : 'default'}
                    style={{ fontSize: 16, padding: '8px 16px', marginTop: 16 }}
                  >
                    {learningStats.loginStreak.isActive ? '🔥 持续活跃中！继续保持！' : '💔 已中断，快回来继续学习吧'}
                  </Tag>
                </div>
                <Divider />
                <Title level={5}>近7天记录</Title>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {learningStats.loginStreak.history?.slice(-7).map((item: any, index: number) => (
                    <Tooltip 
                      key={index} 
                      title={item.loggedIn ? '当天已登录' : '当天未登录'}
                    >
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 8,
                        background: item.loggedIn 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                          : '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.loggedIn ? 'white' : '#999',
                        fontWeight: 'bold'
                      }}>
                        {new Date(item.date).getDate()}
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}

            {drawerType === 'quality' && learningStats?.contentQuality && (
              <div>
                <Title level={5}>内容质量分析</Title>
                <Statistic 
                  title="综合质量分" 
                  value={learningStats.contentQuality.score} 
                  valueStyle={{ color: '#a8edea' }}
                />
                <Divider />
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic 
                      title="获赞总数" 
                      value={learningStats.contentQuality.totalLikes}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="评论总数" 
                      value={learningStats.contentQuality.totalComments}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                </Row>
                <Divider />
                <Statistic 
                  title="热榜帖子" 
                  value={learningStats.contentQuality.hotPostsCount}
                  suffix="篇"
                  valueStyle={{ color: '#faad14' }}
                />
                <Divider />
                <Title level={5}>分类质量分布</Title>
                <List
                  dataSource={learningStats.contentQuality.qualityBreakdown || []}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Tag color="blue">{item.category}</Tag>
                        <Space>
                          <Text>质量分: <Text strong>{item.score}</Text></Text>
                          <Text type="secondary">({item.count} 篇)</Text>
                        </Space>
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {(drawerType === 'posts' || drawerType === 'completion' || drawerType === 'points') && (
              <div>
                <Title level={5}>
                  {drawerType === 'posts' && '发帖统计详情'}
                  {drawerType === 'completion' && '任务完成详情'}
                  {drawerType === 'points' && '社区积分详情'}
                </Title>
                <List
                  dataSource={dailyRecords || []}
                  renderItem={(item) => (
                    <List.Item>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text strong>{item.date}</Text>
                        <Space>
                          {drawerType === 'posts' && (
                            <Tag color="blue">发帖 {item.posts} 篇</Tag>
                          )}
                          {drawerType === 'completion' && (
                            <Space>
                              <Tag color="blue">发帖 {item.posts}</Tag>
                              <Tag color="green">评论 {item.comments}</Tag>
                            </Space>
                          )}
                          {drawerType === 'points' && (
                            <Tag color="orange">学习时长 {item.studyDuration} 分钟</Tag>
                          )}
                        </Space>
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </Spin>
        </Drawer>
      </div>
  );
}
