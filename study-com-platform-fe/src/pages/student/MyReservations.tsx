import { useState, useEffect } from "react";
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  message,
  Space,
  Tabs,
  Row,
  Col,
  Statistic,
  Select,
  Spin,
  Typography
} from "antd";
import { 
  CalendarOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  LogoutOutlined,
  BarChartOutlined,
  PieChartOutlined,
  ClockCircleFilled
} from "@ant-design/icons";
import { 
  getMyReservations, 
  cancelReservation, 
  leaveAndEndReservation, 
  forceUpdateExpired, 
  earlyExitReservation,
  getStudyStats,
  getOverallStudyStats,
  type StudyStats,
  type OverallStudyStats
} from "../../services/studyRoom";
import type { RoomReservation } from "../../types/study-room";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Rectangle
} from "recharts";

const { TabPane } = Tabs;
const { Title, Text } = Typography;

const COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
  '#43e97b', '#38f9d7', '#fa709a', '#fee140', '#f09819'
];

const statusMap: Record<string, { text: string; color: string }> = {
  confirmed: { text: '已确认', color: 'blue' },
  in_progress: { text: '已进入', color: 'green' },
  cancelled: { text: '已取消', color: 'red' },
  ended: { text: '已结束', color: 'gray' }
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} 小时`;
  }
  return `${hours} 小时 ${mins} 分钟`;
};

function ReservationsTab() {
  const [reservations, setReservations] = useState<RoomReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const fetchReservations = async (page = 1, pageSize = 10, status?: string) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize };
      if (status && status !== 'all') {
        params.status = status;
      }
      
      const response = await getMyReservations(params);
      if (response.success) {
        setReservations(response.data);
        setPagination({
          current: page,
          pageSize,
          total: response.pagination.total
        });
      }
    } catch (error) {
      console.error('获取预约记录失败:', error);
      message.error("获取预约记录失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations(1, 10, activeTab === 'all' ? undefined : activeTab);
  }, [activeTab]);

  const columns = [
    {
      title: '自习室',
      dataIndex: ['StudyRoom', 'name'],
      key: 'roomName',
    },
    {
      title: '位置',
      dataIndex: ['StudyRoom', 'location'],
      key: 'location',
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'startTime',
      render: (time: string) => new Date(time).toLocaleString()
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'endTime',
      render: (time: string) => new Date(time).toLocaleString()
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusInfo = statusMap[status as keyof typeof statusMap];
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: RoomReservation) => (
        <Space>
          {record.status === 'confirmed' && (
            <>
              <Button 
                type="link" 
                danger
                icon={<CloseCircleOutlined />}
                onClick={async () => {
                  try {
                    const response = await cancelReservation(record.id);
                    if (response.success) {
                      message.success('取消预约成功');
                      fetchReservations(pagination.current, pagination.pageSize, activeTab === 'all' ? undefined : activeTab);
                    } else {
                      message.error(response.message || '取消预约失败');
                    }
                  } catch (_error) {
                    message.error('取消预约失败');
                  }
                }}
              >
                取消预约
              </Button>
            </>
          )}
          {record.status === 'in_progress' && (
            <>
              <Button 
                type="link" 
                icon={<LogoutOutlined />}
                onClick={async () => {
                  try {
                    const response = await earlyExitReservation(record.id);
                    if (response.success) {
                      message.success('提前退出成功');
                      fetchReservations(pagination.current, pagination.pageSize, activeTab === 'all' ? undefined : activeTab);
                    } else {
                      message.error(response.message || '退出失败');
                    }
                  } catch (error) {
                    console.error('提前退出操作异常:', error);
                    message.error(`退出操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
                  }
                }}
              >
                提前退出
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        tabBarExtraContent={
          <Button 
            type="primary" 
            onClick={async () => {
              try {
                const response = await forceUpdateExpired();
                message.success(response.message || '刷新完成');
                fetchReservations(pagination.current, pagination.pageSize, activeTab === 'all' ? undefined : activeTab);
              } catch (error) {
                console.error('刷新失败:', error);
                message.error('刷新失败');
              }
            }}
            icon={<ClockCircleOutlined />}
          >
            刷新
          </Button>
        }
      >
        <TabPane tab="全部" key="all" />
        <TabPane tab="已确认" key="confirmed" />
        <TabPane tab="已进入" key="in_progress" />
        <TabPane tab="已结束" key="ended" />
        <TabPane tab="已取消" key="cancelled" />
      </Tabs>
      
      <Table
        columns={columns}
        dataSource={reservations}
        loading={loading}
        pagination={{
          ...pagination,
          onChange: (page, pageSize) => fetchReservations(page, pageSize, activeTab === 'all' ? undefined : activeTab),
        }}
        rowKey="id"
      />
    </div>
  );
}

function StatsTab() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [overallStats, setOverallStats] = useState<OverallStudyStats | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [monthlyResponse, overallResponse] = await Promise.all([
        getStudyStats(selectedMonth, selectedYear),
        getOverallStudyStats()
      ]);
      
      if (monthlyResponse.success) {
        setStats(monthlyResponse.data);
      }
      if (overallResponse.success) {
        setOverallStats(overallResponse.data);
      }
    } catch (error) {
      console.error('获取学习统计失败:', error);
      message.error("获取学习统计失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedMonth, selectedYear]);

  const getBarChartData = () => {
    if (!stats?.dailyDurations) return [];
    return stats.dailyDurations.map(item => ({
      date: item.date.split('-')[2] + '日',
      学习时长: Math.round(item.duration / 60 * 10) / 10
    }));
  };

  const getPieChartData = () => {
    if (!overallStats?.roomUsages) return [];
    return overallStats.roomUsages.map(item => ({
      name: item.roomName,
      value: Math.round(item.duration / 60 * 10) / 10,
      count: item.count
    }));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '4px' }}>{`${label}`}</p>
          <p style={{ margin: 0, color: '#667eea' }}>{`学习时长: ${payload[0].value} 小时`}</p>
        </div>
      );
    }
    return null;
  };

  const PieCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '4px' }}>{payload[0].name}</p>
          <p style={{ margin: 0, color: '#667eea' }}>{`学习时长: ${payload[0].value} 小时`}</p>
          <p style={{ margin: 0, color: '#764ba2' }}>{`使用次数: ${payload[0].payload.count} 次`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Spin spinning={loading}>
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>累计学习时长</Text>}
              value={overallStats?.totalDuration ? formatDuration(overallStats.totalDuration) : '0 分钟'}
              prefix={<ClockCircleFilled style={{ color: 'white' }} />}
              valueStyle={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white'
          }}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>累计预约次数</Text>}
              value={overallStats?.totalSessions || 0}
              suffix="次"
              prefix={<CalendarOutlined style={{ color: 'white' }} />}
              valueStyle={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white'
          }}>
            <Statistic
              title={<Text style={{ color: 'rgba(255,255,255,0.85)' }}>本月学习时长</Text>}
              value={stats?.totalDuration ? formatDuration(stats.totalDuration) : '0 分钟'}
              prefix={<BarChartOutlined style={{ color: 'white' }} />}
              valueStyle={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <BarChartOutlined style={{ color: '#667eea' }} />
                <span>月度学习时长趋势</span>
              </Space>
            }
            extra={
              <Space>
                <Select
                  value={selectedYear}
                  onChange={setSelectedYear}
                  style={{ width: 100 }}
                >
                  {years.map(year => (
                    <Select.Option key={year} value={year}>{year}年</Select.Option>
                  ))}
                </Select>
                <Select
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  style={{ width: 90 }}
                >
                  {months.map(month => (
                    <Select.Option key={month} value={month}>{month}月</Select.Option>
                  ))}
                </Select>
              </Space>
            }
            style={{ borderRadius: 16 }}
          >
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getBarChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={{ stroke: '#e0e0e0' }}
                    tick={{ fill: '#666', fontSize: 11 }}
                  />
                  <YAxis 
                    label={{ value: '小时', angle: -90, position: 'insideLeft', fill: '#666' }}
                    axisLine={{ stroke: '#e0e0e0' }}
                    tick={{ fill: '#666' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="学习时长" 
                    fill="url(#barGradient)" 
                    radius={[8, 8, 0, 0]}
                    activeBar={<Rectangle fill="#5a67d8" radius={[8, 8, 0, 0]} />}
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#667eea" />
                      <stop offset="100%" stopColor="#764ba2" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <PieChartOutlined style={{ color: '#764ba2' }} />
                <span>各自习室使用占比</span>
              </Space>
            }
            style={{ borderRadius: 16, height: '100%' }}
          >
            <div style={{ height: 350 }}>
              {getPieChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={getPieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {getPieChartData().map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieCustomTooltip />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  color: '#999'
                }}>
                  <PieChartOutlined style={{ fontSize: 48, marginBottom: 16, color: '#ddd' }} />
                  <Text type="secondary">暂无学习记录</Text>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {overallStats?.roomUsages && overallStats.roomUsages.length > 0 && (
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col xs={24}>
            <Card
              title={
                <Space>
                  <TeamOutlined style={{ color: '#43e97b' }} />
                  <span>自习室使用详情</span>
                </Space>
              }
              style={{ borderRadius: 16 }}
            >
              <Table
                dataSource={overallStats.roomUsages}
                rowKey="roomId"
                pagination={false}
                columns={[
                  {
                    title: '自习室',
                    dataIndex: 'roomName',
                    key: 'roomName',
                    render: (name: string) => (
                      <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>{name}</Tag>
                    )
                  },
                  {
                    title: '学习时长',
                    dataIndex: 'duration',
                    key: 'duration',
                    render: (duration: number) => (
                      <Text strong style={{ color: '#667eea' }}>{formatDuration(duration)}</Text>
                    )
                  },
                  {
                    title: '使用次数',
                    dataIndex: 'count',
                    key: 'count',
                    render: (count: number) => (
                      <Text strong style={{ color: '#764ba2' }}>{count} 次</Text>
                    )
                  },
                  {
                    title: '占比',
                    key: 'percentage',
                    render: (_: unknown, record: any) => {
                      const total = overallStats?.totalDuration || 0;
                      const percentage = total > 0 ? (record.duration / total * 100).toFixed(1) : 0;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ 
                            width: 100, 
                            height: 8, 
                            background: '#f0f0f0', 
                            borderRadius: 4,
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              width: `${percentage}%`, 
                              height: '100%', 
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              borderRadius: 4
                            }} />
                          </div>
                          <Text type="secondary">{percentage}%</Text>
                        </div>
                      );
                    }
                  }
                ]}
              />
            </Card>
          </Col>
        </Row>
      )}
    </Spin>
  );
}

export default function MyReservations() {
  const [mainTab, setMainTab] = useState('reservations');

  const mainTabItems = [
    {
      key: 'reservations',
      label: (
        <Space>
          <CalendarOutlined />
          预约记录
        </Space>
      )
    },
    {
      key: 'stats',
      label: (
        <Space>
          <BarChartOutlined />
          学习统计
        </Space>
      )
    }
  ];

  return (
    <div className="my-reservations">
      <Card 
        title={
          <Space>
            <CalendarOutlined />
            我的预约
          </Space>
        }
      >
        <Tabs
          activeKey={mainTab}
          onChange={setMainTab}
          items={mainTabItems}
          style={{ marginBottom: 16 }}
        />
        
        {mainTab === 'reservations' && <ReservationsTab />}
        {mainTab === 'stats' && <StatsTab />}
      </Card>
    </div>
  );
}
