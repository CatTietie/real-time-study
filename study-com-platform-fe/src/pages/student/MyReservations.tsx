import { useState, useEffect } from "react";
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  message,
  Space,
  Tabs
} from "antd";
import { 
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined
} from "@ant-design/icons";
import { getMyReservations, confirmReservation, cancelReservation, completeReservation, getStudyRoomDetail, joinStudyRoom } from "../../services/studyRoom";
import type { RoomReservation } from "../../types/study-room";

const { TabPane } = Tabs;

const statusMap = {
  pending: { text: '待确认', color: 'orange' },
  confirmed: { text: '已确认', color: 'green' },
  cancelled: { text: '已取消', color: 'red' },
  completed: { text: '已完成', color: 'blue' }
};

export default function MyReservations() {
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
    } catch (_error) {
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
          {record.status === 'pending' && (
            <>
              <Button 
                type="link" 
                icon={<CheckCircleOutlined />}
                onClick={async () => {
                  try {
                    const response = await confirmReservation(record.id);
                    if (response.success) {
                      message.success('确认成功，预约状态已更新为已确认');
                      // 刷新数据
                      fetchReservations(pagination.current, pagination.pageSize, activeTab === 'all' ? undefined : activeTab);
                    } else {
                      message.error(response.message || '确认失败');
                    }
                  } catch (_error) {
                    message.error('确认失败');
                  }
                }}
              >
                确认
              </Button>
              <Button 
                type="link" 
                danger
                icon={<CloseCircleOutlined />}
                onClick={async () => {
                  try {
                    const response = await cancelReservation(record.id);
                    if (response.success) {
                      message.success('取消预约成功');
                      // 刷新数据
                      fetchReservations(pagination.current, pagination.pageSize, activeTab === 'all' ? undefined : activeTab);
                    } else {
                      message.error(response.message || '取消预约失败');
                    }
                  } catch (_error) {
                    message.error('取消预约失败');
                  }
                }}
              >
                取消
              </Button>
            </>
          )}
          {record.status === 'confirmed' && (
            <Button 
              type="link" 
              icon={<TeamOutlined />}
              onClick={async () => {
                try {
                  // 先获取自习室详情
                  const roomResponse = await getStudyRoomDetail(record.room_id);
                  if (roomResponse.success) {
                    const room = roomResponse.data;
                    // 检查容量
                    if (room.current_occupancy >= room.capacity) {
                      message.error('自习室已满，无法加入');
                      return;
                    }
                    
                    // 加入自习室
                    const joinResponse = await joinStudyRoom(record.room_id);
                    if (joinResponse.success) {
                      message.success('加入自习室成功');
                      // 更新预约状态为已完成
                      await completeReservation(record.id);
                      // 刷新数据
                      fetchReservations(pagination.current, pagination.pageSize, activeTab === 'all' ? undefined : activeTab);
                    } else {
                      message.error(joinResponse.message || '加入自习室失败');
                    }
                  }
                } catch (_error) {
                  message.error('加入自习室失败');
                }
              }}
            >
              加入自习室
            </Button>
          )}
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
            我的预约记录
          </Space>
        }
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarExtraContent={
            <Button 
              type="primary" 
              onClick={() => fetchReservations(pagination.current, pagination.pageSize, activeTab === 'all' ? undefined : activeTab)}
              icon={<ClockCircleOutlined />}
            >
              刷新
            </Button>
          }
        >
          <TabPane tab="全部" key="all" />
          <TabPane tab="待确认" key="pending" />
          <TabPane tab="已确认" key="confirmed" />
          <TabPane tab="已完成" key="completed" />
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
      </Card>
    </div>
  );
}