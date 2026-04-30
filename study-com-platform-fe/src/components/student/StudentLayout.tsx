import { useState, useEffect, useCallback } from "react";
import { 
  Layout, 
  Menu, 
  Avatar, 
  Dropdown, 
  Space, 
  Typography,
  Badge,
  List,
  Card,
  Button,
  Empty,
  Tag,
  message
} from "antd";
import {
  HomeOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  CalendarOutlined,
  MessageOutlined,
  EditOutlined,
  BellOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  DeleteOutlined
} from "@ant-design/icons";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";
import type { RootState } from "../../app/store";
import { 
  getUserNotifications, 
  getUnreadCount, 
  markAsRead, 
  markAllAsRead,
  type Notification,
  type NotificationType
} from "../../services/notification";
import "../../styles/student-layout.css";

const { Header, Sider, Content } = Layout;
const { Text, Paragraph } = Typography;

interface StudentLayoutProps {
  children: React.ReactNode;
}

const notificationTypeLabels: Record<NotificationType, { text: string; color: string }> = {
  reservation_start: { text: '预约提醒', color: 'blue' },
  reservation_renewal: { text: '续期提醒', color: 'orange' },
  chat_message: { text: '聊天消息', color: 'green' },
  system: { text: '系统消息', color: 'default' }
};

export default function StudentLayout({ children }: StudentLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state: RootState) => state.auth);
  const { username } = authState;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(false);

  const menuItems = [
    {
      key: "/student/dashboard",
      icon: <HomeOutlined />,
      label: <Link to="/student/dashboard">个人中心</Link>,
    },
    {
      key: "/student/study-rooms",
      icon: <UsergroupAddOutlined />,
      label: <Link to="/student/study-rooms">自习室</Link>,
    },
    {
      key: "/student/my-reservations",
      icon: <CalendarOutlined />,
      label: <Link to="/student/my-reservations">我的预约</Link>,
    },
    {
      key: "/student/learning-analytics",
      icon: <BarChartOutlined />,
      label: <Link to="/student/learning-analytics">学习统计</Link>,
    },
    {
      key: "/student/chat",
      icon: <MessageOutlined />,
      label: <Link to="/student/chat">实时聊天</Link>,
    },
    {
      key: "/student/whiteboard",
      icon: <EditOutlined />,
      label: <Link to="/student/whiteboard">协作白板</Link>,
    },
    {
      key: "/student/profile",
      icon: <SettingOutlined />,
      label: <Link to="/student/profile">个人设置</Link>,
    },
  ];

  const userMenuItems = [
    {
      key: "community",
      icon: <TeamOutlined />,
      label: "前往学生社区",
      onClick: () => navigate("/community"),
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: () => {
        dispatch(logout());
        navigate("/admin/login");
      },
    },
  ];

  const fetchNotifications = useCallback(async () => {
    setNotificationLoading(true);
    try {
      const response = await getUserNotifications(20, false);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await getUnreadCount();
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('获取未读计数失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // 每30秒刷新一次未读计数
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount]);

  const handleNotificationClick = async (notification: Notification) => {
    // 标记为已读
    try {
      await markAsRead(notification.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('标记已读失败:', error);
    }

    // 根据类型跳转
    if (notification.notification_type === 'reservation_start' || 
        notification.notification_type === 'reservation_renewal') {
      // 预约消息跳转到我的预约
      navigate('/student/my-reservations');
      setNotificationVisible(false);
    } else if (notification.notification_type === 'chat_message' && notification.chat_room_id) {
      // 聊天消息跳转到聊天页面
      navigate('/student/chat', { state: { roomId: notification.chat_room_id } });
      setNotificationVisible(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await markAllAsRead();
      message.success(`已标记 ${response.markedCount} 条通知为已读`);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('全部标记已读失败:', error);
      message.error('操作失败');
    }
  };

  const handleRefreshNotifications = () => {
    fetchNotifications();
  };

  const notificationDropdownContent = (
    <div className="notification-dropdown">
      <div className="notification-header">
        <Space>
          <Text strong>消息通知</Text>
          {unreadCount > 0 && (
            <Tag color="red">{unreadCount} 条未读</Tag>
          )}
        </Space>
        <Space>
          {unreadCount > 0 && (
            <Button 
              type="link" 
              size="small" 
              icon={<CheckOutlined />}
              onClick={handleMarkAllAsRead}
            >
              全部已读
            </Button>
          )}
          <Button 
            type="link" 
            size="small" 
            onClick={handleRefreshNotifications}
          >
            刷新
          </Button>
        </Space>
      </div>
      
      <div className="notification-list-container">
        {notificationLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Text type="secondary">加载中...</Text>
          </div>
        ) : notifications.length === 0 ? (
          <Empty 
            description="暂无消息通知" 
            style={{ margin: '40px 0' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                className={`notification-item ${item.is_read ? 'read' : 'unread'}`}
                onClick={() => handleNotificationClick(item)}
              >
                <List.Item.Meta
                  avatar={
                    <Badge dot={!item.is_read}>
                      <Avatar 
                        style={{ 
                          backgroundColor: notificationTypeLabels[item.notification_type].color === 'blue' ? '#1890ff' : 
                                          notificationTypeLabels[item.notification_type].color === 'orange' ? '#fa8c16' :
                                          notificationTypeLabels[item.notification_type].color === 'green' ? '#52c41a' : '#bfbfbf'
                        }}
                        icon={
                          item.notification_type === 'reservation_start' ? <CalendarOutlined /> :
                          item.notification_type === 'reservation_renewal' ? <ClockCircleOutlined /> :
                          item.notification_type === 'chat_message' ? <MessageOutlined /> :
                          <BellOutlined />
                        }
                      />
                    </Badge>
                  }
                  title={
                    <Space>
                      <Text strong>{item.title}</Text>
                      <Tag color={notificationTypeLabels[item.notification_type].color} size="small">
                        {notificationTypeLabels[item.notification_type].text}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Paragraph 
                        ellipsis={{ rows: 2 }} 
                        style={{ marginBottom: 4, color: '#666' }}
                      >
                        {item.content}
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {new Date(item.created_at).toLocaleString()}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
      
      <div className="notification-footer">
        <Button 
          type="link" 
          block 
          onClick={() => {
            // 可以跳转到消息中心页面
            navigate('/student/my-reservations');
            setNotificationVisible(false);
          }}
        >
          查看全部
        </Button>
      </div>
    </div>
  );

  return (
    <Layout className="student-layout">
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        theme="light"
        width={260}
        className="student-layout-sider"
        style={{
          position: "fixed",
          height: "100vh",
          left: 0,
          zIndex: 100,
        }}
      >
        <div className="student-layout-logo">
          <Text strong className="student-layout-logo-text">
            学习平台
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="student-layout-menu"
          theme="light"
          inlineIndent={16}
        />
      </Sider>
      
      <Layout style={{ marginLeft: 260 }}>
        <Header className="student-layout-header">
          <Text strong className="student-layout-header-title">
            {menuItems.find(item => item.key === location.pathname)?.label?.props?.children || "学生平台"}
          </Text>
          
          <Space size="middle">
            {/* 消息通知铃铛 */}
            <Dropdown
              dropdownRender={() => notificationDropdownContent}
              placement="bottomRight"
              trigger={['click']}
              open={notificationVisible}
              onOpenChange={(visible) => setNotificationVisible(visible)}
            >
              <Badge count={unreadCount} size="small">
                <Button 
                  type="text" 
                  icon={<BellOutlined style={{ fontSize: '18px' }} />}
                  className="notification-bell-btn"
                  style={{ cursor: 'pointer', padding: '4px 8px' }}
                />
              </Badge>
            </Dropdown>
            
            {/* 用户下拉菜单 */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space className="student-layout-user-menu">
                <Avatar 
                  icon={<UserOutlined />} 
                  className="student-layout-avatar"
                />
                <Text className="student-layout-username">{username || "学生用户"}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        
        <Content className="student-layout-content-wrapper">
          <div className="student-layout-content-card">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
