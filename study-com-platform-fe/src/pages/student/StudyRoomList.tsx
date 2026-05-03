import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Card, 
  List, 
  Input, 
  Select, 
  Button, 
  Modal,
  Form,
  DatePicker,
  message,
  Space,
  Progress,
  Tag,
  Tooltip,
  Radio,
  Typography,
  Empty,
  Descriptions
} from "antd";
import { 
  SearchOutlined, 
  UsergroupAddOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from "@ant-design/icons";
import { getStudyRooms, reserveStudyRoom, getHourlyAvailability } from "../../services/studyRoom";
import type { StudyRoom, TimeSlot, RoomHourlyAvailability, HourlyAvailabilityResponse } from "../../types/study-room";
import dayjs, { Dayjs } from "dayjs";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

type ViewMode = 'list' | 'timeline';

// 预约错误码（与后端一致）
const RESERVATION_ERROR_CODES = {
  ROOM_UNAVAILABLE: 'ROOM_UNAVAILABLE',
  ROOM_FULL: 'ROOM_FULL',
  DUPLICATE_RESERVATION: 'DUPLICATE_RESERVATION',
  PAST_TIME: 'PAST_TIME',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
} as const;

// 重复预约数据类型
interface DuplicateReservationData {
  reservationId: number;
  startTime: string;
  endTime: string;
  roomName?: string;
  roomLocation?: string;
}

// 自习室已满数据类型
interface RoomFullData {
  currentCount: number;
  capacity: number;
}

// 错误详情类型
interface ErrorDetails {
  errorCode: string;
  message: string;
  duplicateData?: DuplicateReservationData;
  roomFullData?: RoomFullData;
}

export default function StudyRoomList() {
  const navigate = useNavigate();
  
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    keyword: "",
    minCapacity: undefined as number | undefined
  });
  const [reserveModalVisible, setReserveModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [reserveForm] = Form.useForm();
  
  // 错误弹窗相关状态
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  
  // 时间轴视图相关状态
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [hourlyData, setHourlyData] = useState<HourlyAvailabilityResponse | null>(null);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  
  const reserveModalRef = useRef<HTMLDivElement>(null);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await getStudyRooms(searchParams);
      if (response.success) {
        setRooms(response.data);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error: unknown) {
      message.error("获取自习室列表失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchHourlyData = async (date: Dayjs) => {
    setHourlyLoading(true);
    try {
      const response = await getHourlyAvailability(date.format('YYYY-MM-DD'));
      if (response.success) {
        setHourlyData(response.data);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error: unknown) {
      message.error("获取时间轴数据失败");
    } finally {
      setHourlyLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [searchParams]);

  useEffect(() => {
    if (viewMode === 'timeline') {
      fetchHourlyData(selectedDate);
    }
  }, [viewMode, selectedDate]);


  // 处理跳转"我的预约"页面
  const handleNavigateToMyReservations = useCallback(() => {
    setErrorModalVisible(false);
    setErrorDetails(null);
    // 关闭预约弹窗
    setReserveModalVisible(false);
    reserveForm.resetFields();
    // 跳转到"我的预约"页面
    navigate("/student/my-reservations");
  }, [navigate]);

  // 处理预约错误
  const handleReserveError = useCallback((error: unknown) => {
    // BusinessError 类型定义，支持直接访问 errorCode 和 data
    type BusinessErrorLike = {
      message?: string;
      errorCode?: string;
      data?: any;
      response?: { 
        data?: { 
          message?: string;
          errorCode?: string;
          data?: any;
        } 
      };
    };
    
    const err = error as BusinessErrorLike;
    
    // 优先级：先尝试直接从 Error 对象获取，再从 response.data 获取
    // 因为拦截器已经把 errorCode 和 data 直接附加到了 Error 对象上
    let errorCode: string | undefined;
    let errorData: any;
    let messageText: string = "预约失败";
    
    // 1. 优先直接从 Error 对象获取（拦截器会把这些属性附加到 Error 上）
    if (err.errorCode) {
      errorCode = err.errorCode;
    }
    if (err.data) {
      errorData = err.data;
    }
    if (err.message) {
      messageText = err.message;
    }
    
    // 2. 如果没有，再尝试从 response.data 获取（兼容旧代码）
    if (!errorCode && err.response?.data?.errorCode) {
      errorCode = err.response.data.errorCode;
    }
    if (!errorData && err.response?.data?.data) {
      errorData = err.response.data.data;
    }
    if (messageText === "预约失败" && err.response?.data?.message) {
      messageText = err.response.data.message;
    }
    
    // 调试信息
    console.log('处理预约错误:', {
      error,
      errorCode,
      messageText,
      errorData,
      errMessage: err.message,
      errErrorCode: err.errorCode,
      errData: err.data,
      errResponse: err.response
    });
    
    // 构建错误详情
    const details: ErrorDetails = {
      errorCode: errorCode || RESERVATION_ERROR_CODES.SYSTEM_ERROR,
      message: messageText
    };
    
    // 根据错误码添加额外数据
    if (errorCode === RESERVATION_ERROR_CODES.DUPLICATE_RESERVATION && errorData) {
      details.duplicateData = errorData as DuplicateReservationData;
    }
    
    if (errorCode === RESERVATION_ERROR_CODES.ROOM_FULL && errorData) {
      details.roomFullData = errorData as RoomFullData;
    }
    
    setErrorDetails(details);
    setErrorModalVisible(true);
  }, []);

  const handleReserve = async (values: unknown) => {
    if (!selectedRoom) return;
    
    try {
      const response = await reserveStudyRoom({
        roomId: selectedRoom.id,
        startTime: (values as any).timeRange[0].format("YYYY-MM-DD HH:mm:ss"),
        endTime: (values as any).timeRange[1].format("YYYY-MM-DD HH:mm:ss")
      });
      
      if (response.success) {
        message.success("预约成功");
        setReserveModalVisible(false);
        reserveForm.resetFields();
        fetchRooms();
        if (viewMode === 'timeline') {
          fetchHourlyData(selectedDate);
        }
      }
    } catch (error: unknown) {
      handleReserveError(error);
    }
  };

  const getOccupancyRate = (room: StudyRoom) => {
    return Math.round((room.current_occupancy / room.capacity) * 100);
  };

  const getOccupancyColor = (rate: number) => {
    if (rate < 50) return "success";
    if (rate < 80) return "normal";
    return "exception";
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'active':
        return <Tag color="green">开放</Tag>;
      case 'maintenance':
        return <Tag color="orange">维护中</Tag>;
      case 'closed':
        return <Tag color="red">已关闭</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  const formatTimeSlot = (slot: TimeSlot) => {
    const start = dayjs(slot.start_time).format('MM-DD HH:mm');
    const end = dayjs(slot.end_time).format('MM-DD HH:mm');
    return `${start} ~ ${end}`;
  };

  const disabledDate = (current: Dayjs) => {
    return current && current < dayjs().startOf('day');
  };

  const disabledDateTime = () => {
    const now = dayjs();
    return {
      disabledHours: () => {
        const hours: number[] = [];
        for (let i = 0; i < 24; i++) {
          if (now.hour() > i) {
            hours.push(i);
          }
        }
        return hours;
      },
      disabledMinutes: (hour: number) => {
        const now = dayjs();
        const minutes: number[] = [];
        if (now.hour() === hour) {
          for (let i = 0; i < now.minute(); i++) {
            minutes.push(i);
          }
        }
        return minutes;
      },
    };
  };

  // 获取时段块的颜色
  const getSlotColor = (available: number, capacity: number) => {
    if (available === 0) return { bg: '#ff4d4f', text: '#fff' }; // 红色 - 已满
    if (available === 1) return { bg: '#faad14', text: '#000' }; // 黄色 - 剩余1个
    return { bg: '#52c41a', text: '#fff' }; // 绿色 - 剩余>=2个
  };

  // 点击时段块，自动填充时间并打开预约模态框
  const handleTimeSlotClick = (room: RoomHourlyAvailability, hour: number) => {
    const roomData = rooms.find(r => r.id === room.id) || null;
    
    // 检查是否已满
    const hourlyData = room.hourlyData.find(h => h.hour === hour);
    if (hourlyData && hourlyData.available === 0) {
      message.warning("该时段已满，请选择其他时段");
      return;
    }
    
    const now = dayjs();
    // 该小时的结束时间
    const hourEndTime = selectedDate.hour(hour + 1).minute(0).second(0);
    
    // 检查是否是过去的时间：只有当该小时已经完全结束时才不能预约
    // 例如：现在是 22:15，22:00-23:00 这个区间还没结束，应该可以预约
    if (hourEndTime.isBefore(now)) {
      message.warning("该时段已结束，请选择其他时段");
      return;
    }
    
    setSelectedRoom(roomData);
    
    // 设置默认时间范围：
    // - 如果是当前小时：从当前时间开始，到下一个整点结束
    // - 如果是未来小时：从整点开始，到下一个整点结束
    const hourStartTime = selectedDate.hour(hour).minute(0).second(0);
    const startTime = hourStartTime.isBefore(now) ? now : hourStartTime;
    const endTime = selectedDate.hour(hour + 1).minute(0).second(0);
    
    reserveForm.setFieldsValue({
      timeRange: [startTime, endTime]
    });
    
    setReserveModalVisible(true);
  };

  // 渲染时间轴视图
  const renderTimelineView = () => {
    if (hourlyLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Text>加载中...</Text>
        </div>
      );
    }
    
    if (!hourlyData || !hourlyData.rooms || hourlyData.rooms.length === 0) {
      return (
        <Empty description="暂无自习室数据" />
      );
    }
    
    // 生成小时标签（00:00 到 23:00）
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="timeline-view">
        {/* 日期选择器 */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <DatePicker 
            value={selectedDate}
            onChange={(date) => date && setSelectedDate(date)}
            disabledDate={disabledDate}
            style={{ width: 150 }}
          />
          <Text type="secondary">选择日期查看各时段可用情况</Text>
          
          {/* 图例 */}
          <Space style={{ marginLeft: 'auto' }}>
            <Tag color="#52c41a">剩余≥2人</Tag>
            <Tag color="#faad14">剩余=1人</Tag>
            <Tag color="#ff4d4f">已满</Tag>
          </Space>
        </div>
        
        {/* 时间轴表格 */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ 
                  width: 180, 
                  padding: '12px 8px', 
                  textAlign: 'left',
                  backgroundColor: '#fafafa',
                  borderBottom: '1px solid #f0f0f0',
                  position: 'sticky',
                  left: 0,
                  zIndex: 1
                }}>
                  自习室
                </th>
                {hours.map(hour => (
                  <th key={hour} style={{ 
                    width: 50, 
                    padding: '8px 4px', 
                    textAlign: 'center',
                    backgroundColor: '#fafafa',
                    borderBottom: '1px solid #f0f0f0',
                    fontSize: 12,
                    fontWeight: 'normal',
                    color: '#666'
                  }}>
                    {String(hour).padStart(2, '0')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hourlyData.rooms.map(room => (
                <tr key={room.id}>
                  <td style={{ 
                    padding: '12px 8px', 
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: '#fff',
                    position: 'sticky',
                    left: 0,
                    zIndex: 1
                  }}>
                    <div style={{ cursor: 'pointer' }}>
                      <Text strong>{room.name}</Text>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        <EnvironmentOutlined style={{ marginRight: 4 }} />
                        {room.location}
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        <TeamOutlined style={{ marginRight: 4 }} />
                        容量: {room.capacity}人
                      </div>
                    </div>
                  </td>
                  {room.hourlyData.map((hourly, index) => {
                    const colors = getSlotColor(hourly.available, room.capacity);
                    // 判断该小时是否已经完全结束（与 handleTimeSlotClick 逻辑一致）
                    const hourEndTime = selectedDate.hour(hourly.hour + 1).minute(0).second(0);
                    const isPastHour = hourEndTime.isBefore(dayjs());
                    const isDisabled = isPastHour || hourly.available === 0;
                    
                    return (
                      <td key={index} style={{ 
                        padding: '4px 2px', 
                        textAlign: 'center',
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <Tooltip title={
                          isPastHour 
                            ? '该时段已结束' 
                            : hourly.available === 0 
                              ? '该时段已满' 
                              : `剩余 ${hourly.available} 个座位，点击预约`
                        }>
                          <div
                            style={{
                              height: 40,
                              backgroundColor: isPastHour ? '#f0f0f0' : colors.bg,
                              color: isPastHour ? '#ccc' : colors.text,
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              transform: isDisabled ? 'none' : 'scale(0.95)',
                            }}
                            onClick={() => !isDisabled && handleTimeSlotClick(room, hourly.hour)}
                            onMouseEnter={(e) => {
                              if (!isDisabled) {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isDisabled) {
                                e.currentTarget.style.transform = 'scale(0.95)';
                                e.currentTarget.style.boxShadow = 'none';
                              }
                            }}
                          >
                            {isPastHour ? '-' : hourly.available}
                          </div>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={{ marginTop: 16, textAlign: 'center', color: '#999', fontSize: 12 }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          点击绿色/黄色时段块可直接预约
        </div>
      </div>
    );
  };

  // 渲染列表视图
  const renderListView = () => (
    <List
      loading={loading}
      dataSource={rooms}
      grid={{ gutter: 16, column: 3 }}
      renderItem={(room) => (
        <List.Item>
          <Card 
            hoverable
            style={{ width: '100%' }}
            cover={
              room.image_url ? (
                <img 
                  alt={room.name}
                  src={room.image_url}
                  style={{ height: 150, objectFit: 'cover' }}
                />
              ) : (
                <div style={{ 
                  height: 150, 
                  backgroundColor: '#f0f2f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UsergroupAddOutlined style={{ fontSize: 48, color: '#ccc' }} />
                </div>
              )
            }
            actions={[
              <Button 
                type="primary"
                onClick={() => {
                  setSelectedRoom(room);
                  setReserveModalVisible(true);
                }}
                disabled={room.status !== 'active'}
              >
                预约时段
              </Button>
            ]}
          >
            <Card.Meta
              title={
                <Space>
                  {room.name}
                  {getStatusTag(room.status)}
                </Space>
              }
              description={
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <EnvironmentOutlined /> {room.location}
                  </div>
                  <div>
                    <TeamOutlined /> 容量: {room.current_occupancy}/{room.capacity}人
                  </div>
                  <div>
                    <Progress 
                      percent={getOccupancyRate(room)}
                      status={getOccupancyColor(getOccupancyRate(room)) as 'success' | 'normal' | 'exception'}
                      size="small"
                    />
                  </div>
                  {room.reserved_time_slots && room.reserved_time_slots.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <div style={{ color: '#666', fontSize: 12 }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          已预约时间段:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {room.reserved_time_slots.map((slot, index) => (
                            <Tooltip key={index} title={formatTimeSlot(slot)}>
                              <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
                                {formatTimeSlot(slot)}
                              </Tag>
                            </Tooltip>
                          ))}
                        </div>
                      </Space>
                    </div>
                  )}
                  {room.description && (
                    <div style={{ marginTop: 8, color: '#666' }}>
                      {room.description}
                    </div>
                  )}
                </Space>
              }
            />
          </Card>
        </List.Item>
      )}
      locale={{ emptyText: '暂无自习室信息' }}
    />
  );

  return (
    <div className="study-room-list">
      <Card 
        title={
          <Space>
            <UsergroupAddOutlined />
            自习室列表
          </Space>
        }
        extra={
          <Space>
            <Radio.Group 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="list">
                <UnorderedListOutlined style={{ marginRight: 4 }} />
                列表视图
              </Radio.Button>
              <Radio.Button value="timeline">
                <CalendarOutlined style={{ marginRight: 4 }} />
                时间轴视图
              </Radio.Button>
            </Radio.Group>
            
            {viewMode === 'list' && (
              <>
                <Input
                  placeholder="搜索自习室名称/位置"
                  prefix={<SearchOutlined />}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, keyword: e.target.value }))}
                  style={{ width: 200 }}
                />
                <Select
                  placeholder="最小容量"
                  style={{ width: 120 }}
                  onChange={(value) => setSearchParams(prev => ({ ...prev, minCapacity: value }))}
                  allowClear
                >
                  <Option value={10}>10人以上</Option>
                  <Option value={20}>20人以上</Option>
                  <Option value={30}>30人以上</Option>
                </Select>
              </>
            )}
          </Space>
        }
      >
        {viewMode === 'list' ? renderListView() : renderTimelineView()}
      </Card>

      {/* 预约模态框 */}
      <Modal
        title={
          <Space>
            <CalendarOutlined />
            预约 {selectedRoom?.name}
          </Space>
        }
        open={reserveModalVisible}
        onCancel={() => {
          setReserveModalVisible(false);
          reserveForm.resetFields();
        }}
        footer={null}
        width={480}
      >
        <div ref={reserveModalRef}>
          {selectedRoom && (
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fafafa', borderRadius: 6 }}>
              <Text strong>{selectedRoom.name}</Text>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {selectedRoom.location}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                <TeamOutlined style={{ marginRight: 4 }} />
                容量: {selectedRoom.capacity}人
              </div>
            </div>
          )}
          
          <Form
            form={reserveForm}
            onFinish={handleReserve}
            layout="vertical"
          >
            <Form.Item
              name="timeRange"
              label="预约时间"
              rules={[{ required: true, message: '请选择预约时间' }]}
              extra="不可选择过去的时间"
            >
              <RangePicker
                showTime
                format="YYYY-MM-DD HH:mm"
                placeholder={['开始时间', '结束时间']}
                disabledDate={disabledDate}
                disabledTime={disabledDateTime}
                style={{ width: '100%' }}
                minuteStep={30}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large">
                提交预约
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Modal>
      
      {/* 预约失败错误弹窗 */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
            <span>预约失败</span>
          </Space>
        }
        open={errorModalVisible}
        onCancel={() => {
          setErrorModalVisible(false);
          setErrorDetails(null);
        }}
        footer={
          errorDetails?.errorCode === RESERVATION_ERROR_CODES.DUPLICATE_RESERVATION ? (
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                icon={<InfoCircleOutlined />}
                onClick={handleNavigateToMyReservations}
              >
                查看我的预约
              </Button>
              <Button
                onClick={() => {
                  setErrorModalVisible(false);
                  setErrorDetails(null);
                }}
              >
                关闭
              </Button>
            </Space>
          ) : (
            <Button
              type="primary"
              onClick={() => {
                setErrorModalVisible(false);
                setErrorDetails(null);
              }}
            >
              关闭
            </Button>
          )
        }
        width={480}
      >
        {errorDetails && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text type="danger" strong style={{ fontSize: 15 }}>
                {errorDetails.message}
              </Text>
            </div>
            
            {/* 重复预约详情 */}
            {errorDetails.errorCode === RESERVATION_ERROR_CODES.DUPLICATE_RESERVATION && errorDetails.duplicateData && (
              <div style={{ 
                backgroundColor: '#fff7e6', 
                padding: 16, 
                borderRadius: 6,
                border: '1px solid #ffd591'
              }}>
                <Text strong style={{ display: 'block', marginBottom: 12, color: '#fa8c16' }}>
                  重复预约详情：
                </Text>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="自习室">
                    {errorDetails.duplicateData.roomName || '自习室'}
                    {errorDetails.duplicateData.roomLocation && ` (${errorDetails.duplicateData.roomLocation})`}
                  </Descriptions.Item>
                  <Descriptions.Item label="预约时间">
                    {dayjs(errorDetails.duplicateData.startTime).format('YYYY-MM-DD HH:mm')} - 
                    {dayjs(errorDetails.duplicateData.endTime).format('HH:mm')}
                  </Descriptions.Item>
                </Descriptions>
                <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                  点击"查看我的预约"按钮，可查看您已有的预约记录
                </Text>
              </div>
            )}
            
            {/* 自习室已满详情 */}
            {errorDetails.errorCode === RESERVATION_ERROR_CODES.ROOM_FULL && errorDetails.roomFullData && (
              <div style={{ 
                backgroundColor: '#fff1f0', 
                padding: 16, 
                borderRadius: 6,
                border: '1px solid #ffa39e'
              }}>
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="当前人数">
                    <Tag color="red">{errorDetails.roomFullData.currentCount} 人</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="自习室容量">
                    <Tag color="blue">{errorDetails.roomFullData.capacity} 人</Tag>
                  </Descriptions.Item>
                </Descriptions>
                <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                  该时间段已满，请选择其他时间段或其他自习室
                </Text>
              </div>
            )}
            
            {/* 无法预约过去的时间 */}
            {errorDetails.errorCode === RESERVATION_ERROR_CODES.PAST_TIME && (
              <div style={{ 
                backgroundColor: '#f6ffed', 
                padding: 16, 
                borderRadius: 6,
                border: '1px solid #b7eb8f'
              }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  请选择当前时间之后的时间段进行预约。如果需要查看历史预约记录，请前往"我的预约"页面。
                </Text>
              </div>
            )}
            
            {/* 自习室不可用 */}
            {errorDetails.errorCode === RESERVATION_ERROR_CODES.ROOM_UNAVAILABLE && (
              <div style={{ 
                backgroundColor: '#f0f5ff', 
                padding: 16, 
                borderRadius: 6,
                border: '1px solid #adc6ff'
              }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  该自习室当前不可用（可能处于维护或已关闭状态）。请选择其他可用的自习室。
                </Text>
              </div>
            )}
            
            {/* 系统错误 */}
            {errorDetails.errorCode === RESERVATION_ERROR_CODES.SYSTEM_ERROR && (
              <div style={{ 
                backgroundColor: '#fafafa', 
                padding: 16, 
                borderRadius: 6,
                border: '1px solid #d9d9d9'
              }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  预约过程中发生系统错误，请稍后重试。如果问题持续存在，请联系管理员。
                </Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
