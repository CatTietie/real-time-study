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
  Tooltip,
  Radio,
  Switch,
  Empty,
  ConfigProvider,
  theme
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
  CheckCircleOutlined,
  HeatMapOutlined,
  PlusOutlined,
  RiseOutlined,
  PlayCircleOutlined
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
  fetchMultiDimTrend,
  fetchWeeklyComparison,
  fetchActivityHeatmap,
  type LearningStatsCardsData,
  type DailyStudyRecord,
  type MultiDimTrendData,
  type ComparisonData,
  type HeatmapData,
  type TrendDataType
} from "../../services/communityPublic";
import {
  fetchCommunityProfileSummary,
  fetchUserTodayStats
} from "../../services/communityPublic";

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { RadioGroup, RadioButton } = Radio;

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

interface TrendDataPoint {
  date: string;
  postsCount: number;
}

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

type DrawerType = 'duration' | 'streak' | 'quality' | 'posts' | 'completion' | 'points' | null;

const trendTabConfig: Record<TrendDataType, { label: string; icon: React.ReactNode; color: string }> = {
  posts: { label: '发帖数量', icon: <BookOutlined />, color: '#667eea' },
  views: { label: '浏览量', icon: <LineChartOutlined />, color: '#4facfe' },
  points: { label: '积分', icon: <TrophyOutlined />, color: '#f59e0b' },
  duration: { label: '学习时长', icon: <ClockCircleOutlined />, color: '#10b981' }
};

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

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionText,
  onAction
}) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 16
    }}>
      <div style={{
        fontSize: 64,
        marginBottom: 16,
        opacity: 0.6
      }}>
        {icon || <BarChartOutlined />}
      </div>
      <Title level={4} style={{
        color: '#374151',
        marginBottom: 8
      }}>
        {title}
      </Title>
      <Text type="secondary" style={{
        fontSize: 14,
        display: 'block',
        marginBottom: 24
      }}>
        {description}
      </Text>
      {actionText && onAction && (
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={onAction}
          style={{
            borderRadius: 24,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none'
          }}
        >
          {actionText}
        </Button>
      )}
    </div>
  );
};

interface MultiDimTrendChartProps {
  data: MultiDimTrendData[];
  comparisonData?: ComparisonData;
  dataType: TrendDataType;
  showComparison: boolean;
  hasData: boolean;
}

const MultiDimTrendChart: React.FC<MultiDimTrendChartProps> = ({
  data,
  comparisonData,
  dataType,
  showComparison,
  hasData
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const config = trendTabConfig[dataType];

  const getDataValue = (item: MultiDimTrendData): number => {
    switch (dataType) {
      case 'posts': return item.posts;
      case 'views': return item.views;
      case 'points': return item.points;
      case 'duration': return item.duration;
      default: return 0;
    }
  };

  const getFormattedValue = (value: number): string => {
    if (dataType === 'duration') {
      if (value >= 60) {
        const hours = Math.floor(value / 60);
        const mins = value % 60;
        return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
      }
      return `${value}分钟`;
    }
    if (dataType === 'points') {
      return `${value}分`;
    }
    if (dataType === 'views') {
      return `${value}次`;
    }
    return `${value}篇`;
  };

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const dates = data.map(item =>
      new Date(item.date).toLocaleDateString('zh-CN', {
        month: 'numeric',
        day: 'numeric'
      })
    );

    const values = data.map(getDataValue);

    const series: echarts.SeriesOption[] = [{
      name: trendTabConfig[dataType].label,
      data: values,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 10,
      lineStyle: {
        width: 3,
        color: config.color
      },
      itemStyle: {
        color: config.color,
        borderColor: '#fff',
        borderWidth: 2
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
            { offset: 0, color: `${config.color}33` },
            { offset: 1, color: `${config.color}08` }
          ]
        }
      }
    }];

    if (showComparison && comparisonData) {
      const prevWeekValues = comparisonData.previousWeek.map(getDataValue);
      
      series.push({
        name: '上周数据',
        data: prevWeekValues,
        type: 'line',
        smooth: true,
        symbol: 'diamond',
        symbolSize: 8,
        lineStyle: {
          width: 2,
          color: '#94a3b8',
          type: 'dashed'
        },
        itemStyle: {
          color: '#94a3b8',
          borderColor: '#fff',
          borderWidth: 2
        }
      });
    }

    const maxValue = Math.max(...values, 1);
    
    const option: echarts.EChartsOption = {
      title: {
        text: hasData ? `${trendTabConfig[dataType].label}趋势` : `暂无${trendTabConfig[dataType].label}数据`,
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
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: '#374151',
          fontSize: 13
        },
        formatter: (params: any[]) => {
          const data = params[0];
          const dateIndex = data.dataIndex;
          const fullDate = new Date(data.date || dates[dateIndex]).toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric',
            weekday: 'short'
          });
          
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${fullDate}</div>`;
          
          params.forEach((param) => {
            const value = param.value as number;
            const formattedValue = getFormattedValue(value);
            const color = param.color;
            
            result += `<div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 4px;">
              <span><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color}; margin-right: 6px;"></span>${param.seriesName}</span>
              <span style="font-weight: 600;">${formattedValue}</span>
            </div>`;
          });
          
          return result;
        }
      },
      legend: showComparison ? {
        data: [trendTabConfig[dataType].label, '上周数据'],
        top: 50,
        textStyle: { color: '#6b7280' }
      } : undefined,
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#6b7280', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: Math.max(5, maxValue + Math.ceil(maxValue * 0.2)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#6b7280',
          fontSize: 12,
          formatter: (value: number) => {
            if (dataType === 'duration' && value >= 60) {
              return `${Math.floor(value / 60)}h`;
            }
            return value.toString();
          }
        },
        splitLine: {
          lineStyle: {
            color: `${config.color}11`,
            type: 'dashed'
          }
        }
      },
      series,
      grid: { left: '60', right: '40', top: showComparison ? '100' : '60', bottom: '40' },
      backgroundColor: 'transparent'
    };

    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, comparisonData, dataType, showComparison, hasData, config]);

  return (
    <div style={{ height: 320, padding: '10px', borderRadius: 12, overflow: 'hidden' }}>
      <div ref={chartRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

interface ActivityHeatmapProps {
  data: HeatmapData[];
  hasData: boolean;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data, hasData }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const weeks: { date: string; level: number; count: number }[][] = [];
    const daysInWeek = 7;
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    
    const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
    
    let currentWeek: typeof weeks[0] = [];
    
    sortedData.forEach((item) => {
      const d = new Date(item.date);
      const dayOfWeek = d.getDay();
      
      if (currentWeek.length === 0 && dayOfWeek !== 0) {
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push({ date: '', level: 0, count: 0 });
        }
      }
      
      currentWeek.push(item);
      
      if (dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < daysInWeek) {
        currentWeek.push({ date: '', level: 0, count: 0 });
      }
      weeks.push(currentWeek);
    }

    const heatmapData: [number, number, number][] = [];
    const dateMap = new Map<string, { level: number; count: number }>();
    
    weeks.forEach((week, weekIndex) => {
      week.forEach((item, dayIndex) => {
        if (item.date) {
          heatmapData.push([weekIndex, dayIndex, item.level]);
          dateMap.set(`${weekIndex}-${dayIndex}`, { level: item.level, count: item.count });
        }
      });
    });

    const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

    const option: echarts.EChartsOption = {
      title: {
        text: hasData ? '活跃时间热力图' : '暂无活跃数据',
        left: 'center',
        textStyle: {
          color: '#1f2937',
          fontSize: 16,
          fontWeight: 'bold'
        },
        top: 10
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: [12, 16],
        formatter: (params: any) => {
          const { data } = params;
          const weekIndex = data[0] as number;
          const dayIndex = data[1] as number;
          const level = data[2] as number;
          
          const weekData = weeks[weekIndex];
          const dayData = weekData?.[dayIndex];
          
          if (!dayData || !dayData.date) {
            return '暂无数据';
          }
          
          const fullDate = new Date(dayData.date).toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          });
          
          const levelDesc = level === 0 ? '暂无活跃度' :
                           level === 1 ? '低活跃度' :
                           level === 2 ? '中活跃度' :
                           level === 3 ? '高活跃度' : '非常活跃';
          
          return `<div style="font-weight: bold; margin-bottom: 8px;">${fullDate}</div>
            <div>活跃等级: <span style="color: ${level === 0 ? '#999' : colors[level]}; font-weight: 600;">${levelDesc}</span></div>
            ${dayData.count > 0 ? `<div>活跃计数: <span style="font-weight: 600;">${dayData.count}</span></div>` : ''}`;
        }
      },
      grid: {
        left: '15%',
        right: '10%',
        top: '20%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: weeks.map((_, i) => `第${i + 1}周`),
        splitArea: { show: true },
        axisLabel: {
          fontSize: 10,
          color: '#6b7280'
        },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'category',
        data: dayNames,
        splitArea: { show: true },
        axisLabel: {
          fontSize: 12,
          color: '#6b7280'
        },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      visualMap: {
        show: true,
        min: 0,
        max: 4,
        left: 'center',
        bottom: '2%',
        orient: 'horizontal',
        inRange: {
          color: colors
        },
        text: ['非常活跃', '低'],
        textStyle: {
          color: '#6b7280'
        }
      },
      series: [{
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: false
        },
        itemStyle: {
          borderRadius: 4
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }]
    };

    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, hasData]);

  return (
    <div style={{ height: 350, padding: '10px', borderRadius: 12, overflow: 'hidden' }}>
      <div ref={chartRef} style={{ height: '100%', width: '100%' }} />
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
  
  const [learningStats, setLearningStats] = useState<LearningStatsCardsData | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyStudyRecord[]>([]);
  
  const [multiDimTrendData, setMultiDimTrendData] = useState<MultiDimTrendData[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  
  const [currentTrendType, setCurrentTrendType] = useState<TrendDataType>('posts');
  const [showComparison, setShowComparison] = useState(false);
  
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerType>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const hasTrendData = multiDimTrendData.some(item => 
    item.posts > 0 || item.views > 0 || item.points > 0 || item.duration > 0
  );
  
  const hasHeatmapData = heatmapData.some(item => item.level > 0);

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

  const generateWeeklySummary = (data: StudyStat[], userProfile: UserProfile | null, learningGoals: any | null): WeeklySummary => {
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

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('开始加载学习统计数据，userId:', userId);

      if (userId) {
        const [profileResponse, goalsData, learningStatsResponse] = await Promise.all([
          api.get(`/user/profile/${userId}`),
          fetchLearningGoals(),
          fetchLearningStatsCards()
        ]);
        
        const postsResponse = await api.get(`/community/posts?userId=${userId}&page=1&pageSize=1000`);
        
        const [trendResponse, comparisonResponse, heatmapResponse] = await Promise.all([
          fetchMultiDimTrend(14),
          fetchWeeklyComparison(),
          fetchActivityHeatmap(12)
        ]);

        if (postsResponse.data.success) {
          const userPostsData: PostData[] = postsResponse.data.data || [];
          console.log('用户帖子数据:', userPostsData);
          setUserPosts(userPostsData);

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
            
            const studyDataFromApi = generateStudyDataFromApi(userPostsData);
            setStudyData(studyDataFromApi);
            
            const summary = generateWeeklySummary(studyDataFromApi, userProfileData, goalsData);
            setWeeklySummary(summary);
            
            if (learningStatsResponse.success && learningStatsResponse.data) {
              setLearningStats(learningStatsResponse.data);
            }
            
            if (trendResponse.success && trendResponse.data) {
              setMultiDimTrendData(trendResponse.data);
            }
            
            if (comparisonResponse.success && comparisonResponse.data) {
              setComparisonData(comparisonResponse.data);
            }
            
            if (heatmapResponse.success && heatmapResponse.data) {
              setHeatmapData(heatmapResponse.data);
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

  const openDrawer = async (type: DrawerType) => {
    setDrawerType(type);
    setDrawerVisible(true);
    setDrawerLoading(true);
    
    try {
      if (type === 'duration') {
        const res = await fetchStudyDurationDetail();
        if (res.success && res.data) {
        }
      } else if (type === 'streak') {
        const res = await fetchLoginStreakDetail();
        if (res.success && res.data) {
        }
      } else if (type === 'quality') {
        const res = await fetchContentQualityDetail();
        if (res.success && res.data) {
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

  const closeDrawer = () => {
    setDrawerVisible(false);
    setDrawerType(null);
  };

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

  const cardGradients = {
    blue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    orange: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    purple: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    cyan: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    pink: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    green: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)'
  };

  const handleCreatePost = () => {
    message.info('正在跳转到发帖页面...');
  };

  const handleStartLearning = () => {
    message.info('正在跳转到自习室...');
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
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
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
                  extra={
                    <Space style={{ alignItems: 'center' }}>
                      <RadioGroup
                        value={currentTrendType}
                        onChange={(e) => setCurrentTrendType(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                      >
                        {(Object.keys(trendTabConfig) as TrendDataType[]).map((type) => (
                          <RadioButton key={type} value={type}>
                            <Space size={4}>
                              {trendTabConfig[type].icon}
                              <span>{trendTabConfig[type].label}</span>
                            </Space>
                          </RadioButton>
                        ))}
                      </RadioGroup>
                      <Divider type="vertical" style={{ height: 32 }} />
                      <Space>
                        <Text type="secondary" style={{ fontSize: 13 }}>对比上周</Text>
                        <Switch
                          checked={showComparison}
                          onChange={setShowComparison}
                          checkedChildren="开"
                          unCheckedChildren="关"
                        />
                      </Space>
                    </Space>
                  }
                  style={{ 
                    marginBottom: 24, 
                    borderRadius: 16,
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(255, 255, 255, 0.95)'
                  }}
              >
                {hasTrendData ? (
                  <MultiDimTrendChart
                    data={multiDimTrendData}
                    comparisonData={comparisonData || undefined}
                    dataType={currentTrendType}
                    showComparison={showComparison}
                    hasData={hasTrendData}
                  />
                ) : (
                  <EmptyState
                    title={`暂无${trendTabConfig[currentTrendType].label}数据`}
                    description="开始你的学习之旅，记录每一次进步"
                    icon={<LineChartOutlined />}
                    actionText="去发帖"
                    onAction={handleCreatePost}
                  />
                )}
              </Card>

              <Card
                  extra={
                    <Space>
                      <Tag color="green"><RiseOutlined /> 活跃度越高，颜色越深</Tag>
                    </Space>
                  }
                  style={{ 
                    marginBottom: 24, 
                    borderRadius: 16,
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(255, 255, 255, 0.95)'
                  }}
              >
                {hasHeatmapData ? (
                  <ActivityHeatmap
                    data={heatmapData}
                    hasData={hasHeatmapData}
                  />
                ) : (
                  <EmptyState
                    title="暂无活跃数据"
                    description="开始学习并参与社区互动，积累你的活跃记录"
                    icon={<HeatMapOutlined />}
                    actionText="去学习"
                    onAction={handleStartLearning}
                  />
                )}
              </Card>

              <Card 
                title={<Space><CalendarOutlined /><span>详细参与记录</span></Space>} 
                style={{ 
                  borderRadius: 16,
                  backdropFilter: 'blur(10px)',
                  background: 'rgba(255, 255, 255, 0.95)'
                }}
              >
                {filteredData.some(d => d.postsCount > 0) ? (
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
                ) : (
                  <EmptyState
                    title="暂无参与记录"
                    description="在社区发帖、评论、点赞，开始记录你的学习之旅"
                    icon={<BookOutlined />}
                    actionText="去发帖"
                    onAction={handleCreatePost}
                  />
                )}
              </Card>
            </div>
          </Spin>


        </div>

        <div style={{
          marginTop: 48,
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: 16,
          padding: 24,
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}>
          <CommunityFooter />
        </div>

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
                  title="热榜帖子数" 
                  value={learningStats.contentQuality.hotPostsCount}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<TrophyOutlined />}
                />
                {learningStats.contentQuality.qualityBreakdown && learningStats.contentQuality.qualityBreakdown.length > 0 && (
                  <>
                    <Divider />
                    <Title level={5}>分类质量分析</Title>
                    <List
                      dataSource={learningStats.contentQuality.qualityBreakdown}
                      renderItem={(item: any) => (
                        <List.Item>
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Text strong>{item.category}</Text>
                            <Space>
                              <Tag color="blue">{item.count} 篇</Tag>
                              <Tag color="green">{item.score} 分</Tag>
                            </Space>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </>
                )}
              </div>
            )}

            {drawerType === 'posts' && learningStats?.postsStats && (
              <div>
                <Title level={5}>发帖统计详情</Title>
                <Statistic 
                  title="今日发帖" 
                  value={learningStats.postsStats.today}
                  suffix="篇"
                  valueStyle={{ color: '#667eea' }}
                />
                <Divider />
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic 
                      title="累计发帖" 
                      value={learningStats.postsStats.total}
                      suffix="篇"
                      valueStyle={{ color: '#4facfe' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="热榜帖子" 
                      value={learningStats.postsStats.hotPosts}
                      suffix="篇"
                      valueStyle={{ color: '#faad14' }}
                      prefix={<TrophyOutlined />}
                    />
                  </Col>
                </Row>
                {dailyRecords && dailyRecords.length > 0 && (
                  <>
                    <Divider />
                    <Title level={5}>近7天记录</Title>
                    <List
                      dataSource={dailyRecords}
                      renderItem={(item) => (
                        <List.Item>
                          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Text>{new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}</Text>
                            <Space>
                              <Tag color={item.posts > 0 ? 'blue' : 'default'}>
                                {item.posts} 篇
                              </Tag>
                              <Tag color={item.comments > 0 ? 'green' : 'default'}>
                                {item.comments} 评论
                              </Tag>
                              {item.studyDuration > 0 && (
                                <Tag color="purple">
                                  {item.studyDuration} 分钟
                                </Tag>
                              )}
                            </Space>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </>
                )}
              </div>
            )}

            {drawerType === 'completion' && learningStats?.taskCompletion && (
              <div>
                <Title level={5}>任务完成详情</Title>
                <Statistic 
                  title="任务完成率" 
                  value={learningStats.taskCompletion.rate}
                  suffix="%"
                  valueStyle={{ color: '#10b981' }}
                />
                <Divider />
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic 
                      title="已完成任务" 
                      value={learningStats.taskCompletion.completedTasks}
                      valueStyle={{ color: '#52c41a' }}
                      prefix={<CheckCircleOutlined />}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="总任务数" 
                      value={learningStats.taskCompletion.totalTasks}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                </Row>
                <Divider />
                <Title level={5}>任务进度</Title>
                <Progress 
                  percent={learningStats.taskCompletion.rate} 
                  strokeColor={{
                    '0%': '#10b981',
                    '100%': '#059669',
                  }}
                  status={learningStats.taskCompletion.rate >= 100 ? 'success' : 'active'}
                />
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Tag color={learningStats.taskCompletion.rate >= 80 ? 'success' : 'warning'}>
                    {learningStats.taskCompletion.rate >= 80 ? '🎉 任务完成良好！' : '💪 继续加油！'}
                  </Tag>
                </div>
              </div>
            )}

            {drawerType === 'points' && learningStats?.communityPoints && (
              <div>
                <Title level={5}>社区积分详情</Title>
                <Statistic 
                  title="当前积分" 
                  value={learningStats.communityPoints.total}
                  suffix="分"
                  valueStyle={{ color: '#f59e0b' }}
                  prefix={<TrophyOutlined />}
                />
                <Divider />
                <Statistic 
                  title="当前排名" 
                  value={learningStats.communityPoints.rank}
                  suffix="名"
                  valueStyle={{ color: '#8b5cf6' }}
                  prefix={<RiseOutlined />}
                />
                <Divider />
                <div style={{ 
                  padding: 16, 
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                  borderRadius: 12,
                  textAlign: 'center'
                }}>
                  <Text strong style={{ color: '#92400e' }}>
                    {learningStats.communityPoints.rank <= 10 ? '🏆 恭喜进入前10名！' : 
                     learningStats.communityPoints.rank <= 50 ? '⭐ 表现不错，继续保持！' : 
                     '💪 多参与社区互动，提升排名！'}
                  </Text>
                </div>
              </div>
            )}
          </Spin>
        </Drawer>
      </div>
    );
  } 
