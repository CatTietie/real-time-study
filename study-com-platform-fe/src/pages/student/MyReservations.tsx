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
  CloseCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  LogoutOutlined
} from "@ant-design/icons";
import { getMyReservations, cancelReservation, leaveAndEndReservation, forceUpdateExpired, earlyExitReservation } from "../../services/studyRoom";
import type { RoomReservation } from "../../types/study-room";

const { TabPane } = Tabs;

const statusMap: Record<string, { text: string; color: string }> = {
  confirmed: { text: '已确认', color: 'blue' },
  in_progress: { text: '已进入', color: 'green' },
  cancelled: { text: '已取消', color: 'red' },
  ended: { text: '已结束', color: 'gray' }
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
              onClick={async () => {
                try {
                  // 强制更新过期状态
                  const response = await forceUpdateExpired();
                  message.success(response.message || '刷新完成');
                  // 刷新数据
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
      </Card>
    </div>
  );
}