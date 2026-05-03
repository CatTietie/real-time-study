import { 
  Avatar, 
  Space, 
  Typography,
  Tag,
  message,
  Button,
  Spin,
} from "antd";
import { 
  UserOutlined,
  FireOutlined,
  EditOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  MessageOutlined,
  HeartOutlined,
  EyeOutlined,
  CalendarOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import "../../styles/student-dashboard.css";

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

interface PostItem {
  id: number;
  title: string;
  created_at: string;
  view_count: number;
  comment_count: number;
  like_count: number;
  is_top: boolean;
  publish_status: number;
}

const { Title, Text } = Typography;

export default function StudentDashboard() {
  const authState = useAppSelector((state: RootState) => state.auth);
  const { username, nickname, userId } = authState;
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<PostItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const navigate = useNavigate();
  
  const defaultStatsData = {
    points: 0,
    level: 1,
    todayPosts: 0,
    todayComments: 0,
    todayLikes: 0,
    rank: 1
  };

  const statsData = userProfile || defaultStatsData;

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId || userId <= 0) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await api.get(`/user/profile/${userId}`);
        if (response.data.success) {
          setUserProfile(response.data.data);
        } else {
          throw new Error(response.data.message || '获取用户资料失败');
        }
      } catch (error) {
        console.error('获取用户资料失败:', error);
        message.error('获取用户资料失败，显示默认数据');
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
    
    const intervalId = setInterval(() => {
      fetchUserProfile();
    }, 30000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [userId]);

  const [todayGoals, setTodayGoals] = useState({
    posts: 0,
    comments: 0,
    likes: 0,
    hotPosts: 0
  });

  const [GOAL_CONFIG, setGoalConfig] = useState({
    posts: 3,
    comments: 20,
    likes: 50,
    hotPosts: 1
  });

  const displayName = userProfile?.nickname || nickname || username || "学生用户";
  const displayUsername = userProfile?.username || username || "student_user";
  
  const getGoalProgress = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };
  
  useEffect(() => {
    const fetchLearningGoals = async () => {
      if (!userId) return;
      
      try {
        const response = await api.get('/learning-goals/me');
        if (response.data.success && response.data.data) {
          const goals = response.data.data;
          setGoalConfig({
            posts: goals.goal_posts,
            comments: goals.goal_comments,
            likes: 50,
            hotPosts: goals.goal_hot_posts
          });
        }
      } catch (error) {
        console.error('获取学习目标配置失败:', error);
      }
    };
    
    fetchLearningGoals();
  }, [userId]);

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
  
  useEffect(() => {
    if (userProfile?.id) {
      fetchUserPosts();
    }
  }, [userProfile?.id]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/user/profile/${userId}`);
      if (response.data.success) {
        setUserProfile(response.data.data);
        message.success('数据已刷新');
      }
    } catch (_err) {
      message.error('刷新失败');
    } finally {
      setLoading(false);
    }
  };

  const getLevelProgress = (level: number) => {
    const basePoints = (level - 1) * 100;
    const currentPoints = statsData.points - basePoints;
    const nextLevelPoints = level * 100;
    const progressPoints = nextLevelPoints - basePoints;
    return Math.min(100, Math.round((currentPoints / progressPoints) * 100));
  };

  const goalItems = [
    {
      key: 'posts',
      icon: '📝',
      name: '发帖任务',
      color: 'blue' as const,
      current: todayGoals.posts,
      target: GOAL_CONFIG.posts,
      unit: '篇'
    },
    {
      key: 'comments',
      icon: '💬',
      name: '评论任务',
      color: 'green' as const,
      current: todayGoals.comments,
      target: GOAL_CONFIG.comments,
      unit: '条'
    },
    {
      key: 'likes',
      icon: '❤️',
      name: '获得点赞',
      color: 'yellow' as const,
      current: todayGoals.likes,
      target: GOAL_CONFIG.likes,
      unit: '次'
    },
    {
      key: 'hotPosts',
      icon: '🔥',
      name: '热榜任务',
      color: 'pink' as const,
      current: todayGoals.hotPosts,
      target: GOAL_CONFIG.hotPosts,
      unit: '篇'
    }
  ];

  const totalCompleted = goalItems.filter(item => item.current >= item.target).length;

  if (loading) {
    return (
      <div className="student-dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <div className="dashboard-content">
          {/* 顶部信息卡 */}
          <div className="profile-header-card">
            <div className="profile-header-decor"></div>
            <div className="profile-header-decor-2"></div>
            <div className="profile-header-content">
              <div className="profile-header-left">
                <div className="profile-avatar-wrapper">
                  <Avatar
                    size={96}
                    src={userProfile?.avatar}
                    icon={<UserOutlined />}
                    className="profile-avatar"
                  />
                </div>
                <div className="profile-info">
                  <div className="profile-name">
                    {displayName}
                    <button
                      className="profile-edit-btn"
                      onClick={() => navigate('/student/profile')}
                    >
                      <EditOutlined /> 编辑资料
                    </button>
                  </div>
                  <div className="profile-username">@{displayUsername}</div>
                  <div className="profile-stats">
                    <div className="profile-stat-item">
                      <span className="profile-stat-label">社区积分</span>
                      <span className="profile-stat-value">{statsData.points}</span>
                    </div>
                    <div className="profile-stat-item">
                      <span className="profile-stat-label">当前等级</span>
                      <span className="profile-stat-value">Lv.{statsData.level}</span>
                    </div>
                    <div className="profile-stat-item">
                      <span className="profile-stat-label">社区排名</span>
                      <span className="profile-stat-value">第{statsData.rank}名</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="profile-header-right">
                <div className="level-badge">
                  <div className="level-icon">
                    <FireOutlined />
                  </div>
                  <div className="level-info">
                    <div className="level-text">Lv.{statsData.level || 1}</div>
                    <div className="level-label">学习者等级</div>
                  </div>
                </div>
                <div className="level-progress-wrapper">
                  <div className="level-progress-bar">
                    <div
                      className="level-progress-fill"
                      style={{ width: `${getLevelProgress(statsData.level)}%` }}
                    />
                  </div>
                  <div className="level-progress-text">
                    <span>距离下一等级</span>
                    <span>{Math.max(0, statsData.level * 100 - statsData.points)} 积分</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 今日目标 */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="dashboard-card-title">
                <div
                  className="dashboard-card-title-icon"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff'
                  }}
                >
                  🎯
                </div>
                <span>今日目标进度</span>
              </div>
              <button
                className="refresh-btn"
                onClick={handleRefresh}
                disabled={loading}
              >
                <ReloadOutlined /> 刷新数据
              </button>
            </div>
            <div className="dashboard-card-body">
              <div className="goals-grid">
                {goalItems.map((goal) => (
                  <div
                    key={goal.key}
                    className={`goal-card ${goal.color}`}
                  >
                    <div className="goal-header">
                      <div className="goal-title">
                        <div className={`goal-icon ${goal.color}`}>
                          {goal.icon}
                        </div>
                        <span className="goal-name">{goal.name}</span>
                      </div>
                      <div className="goal-numbers">
                        <span className={`goal-current ${goal.color}`}>
                          {goal.current}
                        </span>
                        <span className="goal-target">/ {goal.target} {goal.unit}</span>
                      </div>
                    </div>
                    <div className="goal-progress-wrapper">
                      <div className="goal-progress-bar">
                        <div
                          className={`goal-progress-fill ${goal.color}`}
                          style={{ width: `${getGoalProgress(goal.current, goal.target)}%` }}
                        />
                      </div>
                      <div className="goal-progress-text">
                        <span>完成进度</span>
                        <span className={`goal-progress-percent ${goal.color}`}>
                          {getGoalProgress(goal.current, goal.target)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 我的帖子 */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <div className="dashboard-card-title">
                <div
                  className="dashboard-card-title-icon"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#fff'
                  }}
                >
                  📝
                </div>
                <span>我的帖子</span>
              </div>
              <span
                className="view-all-btn"
                onClick={() => navigate('/community/posts')}
              >
                查看全部 <ArrowRightOutlined />
              </span>
            </div>
            <div className="dashboard-card-body">
              {postsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Spin />
                </div>
              ) : userPosts.length > 0 ? (
                <div className="posts-list">
                  {userPosts.map((post) => (
                    <div
                      key={post.id}
                      className="post-item-card"
                      onClick={() => navigate(`/community/posts/${post.id}`)}
                    >
                      <div className="post-header">
                        <div className="post-title">
                          <span className="post-title-text">{post.title}</span>
                        </div>
                        <div className="post-tags">
                          {post.is_top && (
                            <span className="post-tag top">置顶</span>
                          )}
                          <span className={`post-tag ${post.publish_status === 1 ? 'published' : 'draft'}`}>
                            {post.publish_status === 1 ? '已发布' : '草稿'}
                          </span>
                        </div>
                      </div>
                      <div className="post-meta">
                        <div className="post-meta-item">
                          <CalendarOutlined className="post-meta-icon" />
                          <span className="post-meta-value">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="post-meta-item">
                          <EyeOutlined className="post-meta-icon" />
                          <span className="post-meta-value">{post.view_count || 0}</span>
                        </div>
                        <div className="post-meta-item">
                          <MessageOutlined className="post-meta-icon" />
                          <span className="post-meta-value">{post.comment_count || 0}</span>
                        </div>
                        <div className="post-meta-item">
                          <HeartOutlined className="post-meta-icon" />
                          <span className="post-meta-value">{post.like_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="posts-empty">
                  <div className="posts-empty-icon">📭</div>
                  <div className="posts-empty-text">暂无帖子，快去发布你的第一篇帖子吧！</div>
                </div>
              )}
            </div>
          </div>

          {/* 底部CTA卡片 */}
          <div className="cta-card">
            <div className="cta-content">
              <div className="cta-icon">
                🚀
              </div>
              <div className="cta-text">
                <div className="cta-title">开始你的学习之旅</div>
                <div className="cta-description">
                  分享学习心得，参与社区讨论，与同学们一起成长进步
                </div>
                <div className="cta-highlight">
                  <TrophyOutlined style={{ color: '#fbbf24', fontSize: 18 }} />
                  <span className="cta-highlight-number">{totalCompleted}</span>
                  <span className="cta-highlight-text">/ 4 个目标已完成</span>
                </div>
              </div>
            </div>
            <div className="cta-button-wrapper">
              <button
                className="cta-button"
                onClick={() => navigate('/community/publish')}
              >
                <EditOutlined className="cta-button-icon" />
                去发帖
              </button>
            </div>
          </div>
        </div>
    </div>
  );
}
