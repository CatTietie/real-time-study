import { useState, useEffect, useCallback, useRef } from "react";
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
  FileTextOutlined,
  BellOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  DeleteOutlined,
  ApartmentOutlined,
  VideoCameraOutlined,
  ReadOutlined
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
import { API_BASE } from "../../services/api";
import io, { Socket } from 'socket.io-client';
import "../../styles/student-layout.css";

const { Header, Sider, Content } = Layout;
const { Text, Paragraph } = Typography;

interface StudentLayoutProps {
  children: React.ReactNode;
}

interface ChatMessage {
  id: number;
  room_id: number;
  user_id: number;
  content: string;
  message_type: 'text' | 'image' | 'system';
  created_at?: string;
  createdAt?: string;
  sender_nickname?: string;
  sender_username?: string;
  room_name?: string;
}

const notificationTypeLabels: Record<NotificationType, { text: string; color: string }> = {
  reservation_start: { text: '预约提醒', color: 'blue' },
  reservation_renewal: { text: '续期提醒', color: 'orange' },
  chat_message: { text: '聊天消息', color: 'green' },
  system: { text: '系统消息', color: 'default' }
};

const formatDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return '';
  
  try {
    let date: Date;
    
    if (typeof dateString === 'string') {
      if (dateString.includes('T') || dateString.includes('-')) {
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
      }
    } else {
      date = dateString;
    }
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('日期格式化失败:', error);
    return '';
  }
};

const playMessageSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.25);
    
  } catch (error) {
    console.log('播放消息提示音失败:', error);
  }
};

export default function StudentLayout({ children }: StudentLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state: RootState) => state.auth);
  const { username, token } = authState;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  const userInfoRef = useRef({ userId: authState.userId, username });

  useEffect(() => {
    userInfoRef.current = { userId: authState.userId, username };
  }, [authState.userId, username]);

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
      key: "/student/video-study-rooms",
      icon: <VideoCameraOutlined />,
      label: <Link to="/student/video-study-rooms">视频自习室</Link>,
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
      key: "/student/learning-report",
      icon: <FileTextOutlined />,
      label: <Link to="/student/learning-report">学习报告</Link>,
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
      key: "/student/collaborative-notes",
      icon: <FileTextOutlined />,
      label: <Link to="/student/collaborative-notes">协作笔记</Link>,
    },
    {
      key: "/student/skill-tree",
      icon: <ApartmentOutlined />,
      label: <Link to="/student/skill-tree">技能树</Link>,
    },
    {
      key: "/student/knowledge-library",
      icon: <ReadOutlined />,
      label: <Link to="/student/knowledge-library">知识文库</Link>,
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
    if (!token || !authState.userId) {
      return;
    }

    const apiBaseUrl = API_BASE.replace('/api', '');
    
    const newSocket = io(apiBaseUrl, {
      transports: ['websocket'],
      withCredentials: true,
      auth: {
        token: token
      }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('通知Socket连接成功');
      setIsSocketConnected(true);
      
      if (userInfoRef.current.userId && userInfoRef.current.username) {
        newSocket.emit('join_global', {
          userId: userInfoRef.current.userId,
          username: userInfoRef.current.username
        });
      }
    });

    newSocket.on('notification', (data: { type: string; data: any }) => {
      console.log('收到系统通知:', data);

      if (data.type === 'chat_message' && data.data) {
        playMessageSound();
        message.info(`收到新消息: ${data.data.senderName || '有人'}`);
      }

      if (data.type === 'content_audit' && data.data) {
        const isApproved = data.data.status === 1;
        if (isApproved) {
          message.success(`您的帖子"${data.data.postTitle}"已通过审核`);
        } else {
          message.warning(`您的帖子"${data.data.postTitle}"未通过审核${data.data.reason ? `，原因：${data.data.reason}` : ''}`);
        }
      }

      if (data.type === 'exercise_review' && data.data) {
        playMessageSound();
        if (data.data.gradedCount) {
          message.info(`您的 ${data.data.gradedCount} 道主观题已被批改，得分 ${data.data.earnedScore}/${data.data.totalScore}`);
        } else {
          message.info(`您的主观题已被批改，得分 ${data.data.score}/${data.data.maxScore}`);
        }
      }

      fetchNotifications();
    });

    newSocket.on('disconnect', () => {
      console.log('通知Socket断开连接');
      setIsSocketConnected(false);
    });

    newSocket.on('error', (error: { message: string }) => {
      console.error('通知Socket错误:', error.message);
    });

    return () => {
      console.log('清理通知Socket连接');
      newSocket.close();
    };
  }, [token, authState.userId, fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount]);

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.notification_type === 'reservation_start' ||
        notification.notification_type === 'reservation_renewal') {
      try {
        await markAsRead(notification.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
        console.error('标记已读失败:', error);
      }
      navigate('/student/my-reservations');
      setNotificationVisible(false);
    } else if (notification.notification_type === 'chat_message' && notification.chat_room_id) {
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      navigate('/student/chat', { state: { roomId: notification.chat_room_id } });
      setNotificationVisible(false);
    } else if (notification.notification_type === 'system' && (notification.metadata as any)?.subType === 'content_audit') {
      try {
        await markAsRead(notification.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
        console.error('标记已读失败:', error);
      }
      const meta = notification.metadata as any;
      if (meta?.auditStatus === 2 && meta?.postId) {
        navigate(`/community/publish?edit=${meta.postId}`);
      } else if (meta?.postId) {
        navigate(`/community?postId=${meta.postId}`);
      }
      setNotificationVisible(false);
    } else if (notification.notification_type === 'system' && (notification.metadata as any)?.subType === 'exercise_review') {
      try {
        await markAsRead(notification.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
        console.error('标记已读失败:', error);
      }
      const meta = notification.metadata as any;
      if (meta?.bankId && meta?.recordId) {
        navigate(`/community/question-bank/${meta.bankId}/result/${meta.recordId}`);
      }
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

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'reservation_start':
        return <CalendarOutlined />;
      case 'reservation_renewal':
        return <ClockCircleOutlined />;
      case 'chat_message':
        return <MessageOutlined />;
      default:
        return <BellOutlined />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'reservation_start':
        return '#1890ff';
      case 'reservation_renewal':
        return '#fa8c16';
      case 'chat_message':
        return '#52c41a';
      default:
        return '#bfbfbf';
    }
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
            dataSource={notifications.slice(0, 20)}
            renderItem={(item) => {
              const formattedDate = formatDate(item.created_at);
              
              return (
                <List.Item
                  className={`notification-item ${item.is_read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(item)}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot={!item.is_read}>
                        <Avatar 
                          style={{ 
                            backgroundColor: getNotificationColor(item.notification_type)
                          }}
                          icon={getNotificationIcon(item.notification_type)}
                        />
                      </Badge>
                    }
                    title={
                      <Space>
                        <Text strong>{item.title}</Text>
                        <Tag color={
                          (item.metadata as any)?.subType === 'content_audit'
                            ? ((item.metadata as any)?.auditStatus === 1 ? 'green' : 'red')
                            : notificationTypeLabels[item.notification_type].color
                        } size="small">
                          {(item.metadata as any)?.subType === 'content_audit'
                            ? ((item.metadata as any)?.auditStatus === 1 ? '审核通过' : '审核退回')
                            : notificationTypeLabels[item.notification_type].text
                          }
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
                        {formattedDate && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {formattedDate}
                          </Text>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </div>
      
      <div className="notification-footer">
        <Button 
          type="link" 
          block 
          onClick={() => {
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
            <Dropdown
              dropdownRender={() => notificationDropdownContent}
              placement="bottomRight"
              trigger={['click']}
              open={notificationVisible}
              onOpenChange={(visible) => setNotificationVisible(visible)}
            >
              <Badge count={unreadCount} size="small" overflowCount={99}>
                <Button 
                  type="text" 
                  icon={<BellOutlined style={{ fontSize: '18px' }} />}
                  className="notification-bell-btn"
                  style={{ cursor: 'pointer', padding: '4px 8px' }}
                />
              </Badge>
            </Dropdown>
            
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
