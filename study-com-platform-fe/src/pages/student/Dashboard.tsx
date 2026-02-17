import { 
  Card, 
  Row, 
  Col,
  Avatar, 
  Space, 
  Typography,
  Progress,
  List,
  Tag,
  message,
  Button,
} from "antd";
import { 
  UserOutlined,
  FireOutlined,
  TeamOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  points: number;
  level: number;
  rank: number;
  todayPosts: number;
  todayComments: number;
  todayLikes: number;
  todayViews: number;
  hotPostsCount: number;
  role: string;
  status: number;
}

const { Title, Text, Paragraph } = Typography;

export default function StudentDashboard() {
  console.log('=== Dashboard 组件开始执行 ===');
  
  const authState = useAppSelector((state: RootState) => state.auth);
  const { username, nickname, userId } = authState;
  
  console.log('完整的 auth state:', authState);
  console.log('提取的变量:', { username, nickname, userId });
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const navigate = useNavigate();
  
  // 调试信息
  console.log('Dashboard 组件渲染:', { username, nickname, userId, userProfile, loading });
  
  // 默认数据（仅用于加载失败降级，字段必须与数据库一致）
  const defaultStatsData = {
    points: 0,
    level: 1,
    todayPosts: 0,
    todayComments: 0,
    todayLikes: 0,
    rank: 1
  };

  // 使用真实数据或默认数据
  const statsData = userProfile || defaultStatsData;
  
  // 强制使用默认数据显示（临时测试）
  // const statsData = defaultStatsData;

  const recentActivities = [
    {
      activity: "发布了新帖子",
      content: "《React Hooks 学习心得》",
      time: "2小时前",
      type: "post"
    },
    {
      activity: "获得了社区积分",
      content: "+50 积分（优质内容奖励）",
      time: "昨天",
      type: "points"
    },
    {
      activity: "参与了讨论",
      content: "回复了《算法学习疑问》",
      time: "前天",
      type: "comment"
    }
  ];

  // 获取用户资料数据
  useEffect(() => {
    console.log('=== Dashboard useEffect 执行 ===');
    console.log('当前 userId:', userId);
    console.log('当前 userProfile:', userProfile);
    
    const fetchUserProfile = async () => {
      // 确保 userId 存在且有效
      if (!userId || userId <= 0) {
        console.warn('❌ 用户ID无效:', userId);
        setLoading(false);
        return;
      }
      
      try {
        console.log('🚀 开始调用 API 获取用户资料，userId:', userId);
        setLoading(true);
        const response = await api.get(`/user/profile/${userId}`);
        console.log('✅ API响应成功:', response);
        
        if (response.data.success) {
          console.log('✅ 获取用户资料成功:', response.data.data);
          setUserProfile(response.data.data);
        } else {
          throw new Error(response.data.message || '获取用户资料失败');
        }
      } catch (error) {
        console.error('❌ 获取用户资料失败:', error);
        message.error('获取用户资料失败，显示默认数据');
        // 使用默认数据
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    console.log('🔍 触发数据获取...');
    fetchUserProfile();
    
    // 添加定时刷新机制（每30秒刷新一次）
    const intervalId = setInterval(() => {
      console.log('⏰ 定时刷新用户数据');
      fetchUserProfile();
    }, 30000);
    
    // 清理定时器
    return () => {
      clearInterval(intervalId);
    };
  }, [userId]);

  // 今日目标进度状态
  const [todayGoals, setTodayGoals] = useState({
    posts: 0,
    comments: 0,
    likes: 0,
    hotPosts: 0 // 热榜帖子目标
  });
  
  // 浏览记录状态（不再使用localStorage）
  const [viewedPosts, setViewedPosts] = useState<Set<number>>(new Set());
  
  // 目标值配置
  const GOAL_CONFIG = {
    posts: 3,      // 发帖目标
    comments: 20,  // 评论目标
    likes: 50,     // 点赞目标
    hotPosts: 3    // 热榜帖子目标
  };

  // Displayed username and nickname
  const displayName = userProfile?.nickname || nickname || username || "学生用户";
  const displayUsername = userProfile?.username || username || "student_user";
  
  // 计算目标进度百分比
  const getGoalProgress = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };
  
  // 不再需要初始化浏览记录，使用真实数据
  
  // 更新今日目标数据（包括热榜帖子数量）
  useEffect(() => {
    if (userProfile) {
      setTodayGoals(prev => ({
        ...prev,
        posts: userProfile.todayPosts || 0,
        comments: userProfile.todayComments || 0,
        likes: userProfile.todayLikes || 0,
        hotPosts: userProfile.hotPostsCount || 0
      }));
    }
  }, [userProfile]);
  
  // 不再需要保存浏览记录到localStorage，使用真实数据
  
  // 调试：打印实际使用的数据
  console.log('显示数据:', { displayName, displayUsername, statsData });
  
  // 模拟浏览帖子函数（演示用）
  const simulateViewPost = (postId: number) => {
    setViewedPosts(prev => {
      const newSet = new Set(prev);
      newSet.add(postId);
      return newSet;
    });
    message.success(`浏览了帖子 ${postId}，浏览任务 +1`);
  };
  
  // 获取用户发布的帖子
  const fetchUserPosts = async () => {
    if (!userId) return;
    
    setPostsLoading(true);
    try {
      const response = await api.get(`/community/posts?userId=${userId}&page=1&pageSize=5`);
      if (response.data.success) {
        setUserPosts(response.data.data || []);
      }
    } catch (error) {
      console.error('获取用户帖子失败:', error);
    } finally {
      setPostsLoading(false);
    }
  };
  
  // 当用户资料加载完成后获取帖子
  useEffect(() => {
    if (userProfile?.id) {
      fetchUserPosts();
    }
  }, [userProfile?.id]);

  // 临时移除加载状态检查进行测试
  // if (loading) {
  //   return (
  //     <div style={{ textAlign: 'center', padding: '50px' }}>
  //       <Spin size="large" />
  //       <div style={{ marginTop: 16 }}>加载中...</div>
  //     </div>
  //   );
  // }

  console.log('=== 开始渲染 Dashboard JSX ===');
  console.log('statsData 内容:', statsData);
  
  return (
    <div className="student-dashboard">
      {/* Personal Info Header */}
      {/* Personal Info Header */}
      <Card className="profile-header">
        <Row align="middle" gutter={24}>
          <Col>
            <Avatar 
              size={80} 
              icon={<UserOutlined />} 
            />
          </Col>
          <Col flex="1">
            <Space direction="vertical">
              <Title level={3} style={{ margin: 0 }}>
                {displayName}
                <EditOutlined 
                  style={{ fontSize: 16, color: '#1890ff', marginLeft: 12, cursor: 'pointer' }}
                  onClick={() => navigate('/student/profile')} 
                />
              </Title>
              <Text type="secondary">@{displayUsername}</Text>
              <Text type="secondary">Lv.{statsData.level || 1} 学习者</Text>
              <Button 
                type="link" 
                icon={<EditOutlined />}
                onClick={() => navigate('/student/profile')}
                style={{ padding: 0, fontSize: 14 }}
              >
                个人设置
              </Button>
              <Space size="large">
                <Text>社区积分：<Text strong>{statsData.points}</Text></Text>
                <Text>等级：<Text strong>Lv.{statsData.level}</Text></Text>
                <Text>排名：<Text strong>第{statsData.rank}名</Text></Text>
              </Space>
            </Space>
          </Col>
          <Col>
            <div className="level-badge">
              <FireOutlined style={{ fontSize: 24, color: "#faad14" }} />
              <Text strong>Lv.{statsData.level || 1}</Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 主要内容区域 - 左右分区布局 */}
      <Row gutter={24} style={{ marginTop: 24 }}>
        {/* 左侧：今日目标进度 */}
        <Col span={10}>
          <Card 
            title={
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(90deg, #1890ff, #52c41a)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>
                <FireOutlined />
                今日目标进度
                <Button 
                  type="link" 
                  size="small" 
                  onClick={async () => {
                    console.log('手动刷新用户数据');
                    setLoading(true);
                    try {
                      const response = await api.get(`/user/profile/${userId}`);
                      if (response.data.success) {
                        setUserProfile(response.data.data);
                        message.success('数据已刷新');
                      }
                    } catch (error) {
                      message.error('刷新失败');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{ padding: '0 8px', fontSize: 12 }}
                >
                  🔄 刷新
                </Button>
              </span>
            }
            style={{ height: '100%' }}
          >
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gridTemplateRows: '1fr 1fr',
              gap: 16,
              height: '100%'
            }}>
              {/* 发帖目标 */}
              <div style={{
                background: '#e6f7ff',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #91d5ff',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>📝</span>
                  <span style={{ fontWeight: 600, color: '#1890ff', fontSize: 14 }}>发帖任务</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#1890ff' }}>
                    {todayGoals.posts}/{GOAL_CONFIG.posts}
                  </span>
                  <span style={{ fontSize: 12, color: '#1890ff' }}>
                    {getGoalProgress(todayGoals.posts, GOAL_CONFIG.posts)}%
                  </span>
                </div>
                <Progress 
                  percent={getGoalProgress(todayGoals.posts, GOAL_CONFIG.posts)} 
                  strokeColor="#1890ff"
                  showInfo={false}
                  size="small"
                />
              </div>

              {/* 评论目标 */}
              <div style={{
                background: '#f6ffed',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #b7eb8f',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>💬</span>
                  <span style={{ fontWeight: 600, color: '#52c41a', fontSize: 14 }}>评论任务</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>
                    {todayGoals.comments}/{GOAL_CONFIG.comments}
                  </span>
                  <span style={{ fontSize: 12, color: '#52c41a' }}>
                    {getGoalProgress(todayGoals.comments, GOAL_CONFIG.comments)}%
                  </span>
                </div>
                <Progress 
                  percent={getGoalProgress(todayGoals.comments, GOAL_CONFIG.comments)} 
                  strokeColor="#52c41a"
                  showInfo={false}
                  size="small"
                />
              </div>

              {/* 点赞目标 */}
              <div style={{
                background: '#fffbe6',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #ffe58f',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>❤️</span>
                  <span style={{ fontWeight: 600, color: '#faad14', fontSize: 14 }}>点赞任务</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#faad14' }}>
                    {todayGoals.likes}/{GOAL_CONFIG.likes}
                  </span>
                  <span style={{ fontSize: 12, color: '#faad14' }}>
                    {getGoalProgress(todayGoals.likes, GOAL_CONFIG.likes)}%
                  </span>
                </div>
                <Progress 
                  percent={getGoalProgress(todayGoals.likes, GOAL_CONFIG.likes)} 
                  strokeColor="#faad14"
                  showInfo={false}
                  size="small"
                />
              </div>

              {/* 热榜任务目标 */}
              <div style={{
                background: '#fff0f6',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #ffadd2',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🔥</span>
                  <span style={{ fontWeight: 600, color: '#eb2f96', fontSize: 14 }}>热榜任务</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#eb2f96' }}>
                    {todayGoals.hotPosts}/{GOAL_CONFIG.hotPosts}
                  </span>
                  <span style={{ fontSize: 12, color: '#eb2f96' }}>
                    {getGoalProgress(todayGoals.hotPosts, GOAL_CONFIG.hotPosts)}%
                  </span>
                </div>
                <Progress 
                  percent={getGoalProgress(todayGoals.hotPosts, GOAL_CONFIG.hotPosts)} 
                  strokeColor="#eb2f96"
                  showInfo={false}
                  size="small"
                />
                <div>
                  <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>
                    帖子进入热榜前十
                  </Text>
                  <Button 
                    size="small" 
                    type="primary" 
                    ghost
                    style={{ padding: '0 8px', fontSize: 10, height: 20 }}
                    onClick={() => navigate('/community/leaderboard')}
                  >
                    查看热榜
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 右侧：用户帖子列表 */}
        <Col span={14}>
          <Card 
            title={
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(90deg, #722ed1, #eb2f96)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>
                <TeamOutlined />
                我的帖子
              </span>
            }
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/community/posts')} 
                style={{ padding: 0 }}
              >
                查看全部
              </Button>
            }
            style={{ height: '100%' }}
          >
            <List
              loading={postsLoading}
              dataSource={userPosts}
              renderItem={(post: any) => (
                <List.Item 
                  style={{ 
                    padding: '12px 0', 
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/community/posts/${post.id}`)}
                >
                  <List.Item.Meta
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong style={{ fontSize: 14 }}>{post.title}</Text>
                        {post.is_top && (
                          <Tag color="red" style={{ fontSize: 10, padding: '0 4px' }}>置顶</Tag>
                        )}
                      </div>
                    }
                    description={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          📅 {new Date(post.created_at).toLocaleDateString()}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          👁️ {post.view_count || 0}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          💬 {post.comment_count || 0}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          ❤️ {post.like_count || 0}
                        </Text>
                        <Tag color={post.publish_status === 1 ? 'green' : 'orange'} style={{ fontSize: 10 }}>
                          {post.publish_status === 1 ? '已发布' : '草稿'}
                        </Tag>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: '暂无帖子' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 底部激励信息 */}
      <Card 
        style={{ marginTop: 24, background: 'linear-gradient(135deg, #f0f5ff 0%, #e6fffb 100%)' }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <FireOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <Text style={{ fontSize: 16 }}>
            <span style={{ color: '#1890ff', fontWeight: 500 }}>🎯 今日目标：</span>
            已完成 
            <span style={{ color: '#52c41a', fontWeight: 600, fontSize: 18 }}>
              {todayGoals.posts + todayGoals.comments + todayGoals.likes + todayGoals.hotPosts}
            </span> 
            项任务，继续加油！
          </Text>
          <Button 
            type="primary" 
            size="small"
            onClick={() => navigate('/community/publish')}
          >
            去发帖
          </Button>
        </div>
      </Card>
    </div>
  );
}