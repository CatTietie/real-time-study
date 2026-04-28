import { useState, useEffect } from "react";
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
  Tooltip
} from "antd";
import { 
  SearchOutlined, 
  UsergroupAddOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ClockCircleOutlined
} from "@ant-design/icons";
import { getStudyRooms, reserveStudyRoom } from "../../services/studyRoom";
import type { StudyRoom, TimeSlot } from "../../types/study-room";
import dayjs, { Dayjs } from "dayjs";

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function StudyRoomList() {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({
    keyword: "",
    minCapacity: undefined as number | undefined
  });
  const [reserveModalVisible, setReserveModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [reserveForm] = Form.useForm();

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

  useEffect(() => {
    fetchRooms();
  }, [searchParams]);



  const handleReserve = async (values: unknown) => {
    if (!selectedRoom) return;
    
    try {
      const response = await reserveStudyRoom({
        roomId: selectedRoom.id,
        startTime: values.timeRange[0].format("YYYY-MM-DD HH:mm:ss"),
        endTime: values.timeRange[1].format("YYYY-MM-DD HH:mm:ss")
      });
      
      if (response.success) {
        message.success("预约成功");
        setReserveModalVisible(false);
        reserveForm.resetFields();
        fetchRooms();
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || "预约失败");
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
          </Space>
        }
      >
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
      </Card>

      {/* 预约模态框 */}
      <Modal
        title={`预约 ${selectedRoom?.name}`}
        open={reserveModalVisible}
        onCancel={() => {
          setReserveModalVisible(false);
          reserveForm.resetFields();
        }}
        footer={null}
      >
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
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              提交预约
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}