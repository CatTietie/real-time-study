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
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import api from "../../services/api";
import { useNavigate, useParams } from "react-router-dom";
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

export default function UserProfile() {
  const authState = useAppSelector((state: RootState) => state.auth);
  const { userId: currentUserId } = authState;
  
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<PostItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  
  const targetUserId = parseInt(userId || "0", 10);
  const isSelf = currentUserId && currentUserId === targetUserId;
  
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
      if (!targetUserId || targetUserId <= 0) {
        setLoading(false);
        message.error("用户ID无效");
        navigate("/community/leaderboard");
        return;
      }
      
      try {
        setLoading(true);
        const response = await api.get(`/user/profile/${targetUserId}`);
        if (response.data.success) {
          setUserProfile(response.data.data);
        } else {
          throw new Error(response.data.message || '获取用户资料失败');
        }
      } catch (error) {
        console.error('获取用户资料失败:', error);
        message.error('获取用户资料失败');
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [targetUserId, navigate]);

  const displayName = userProfile?.nickname || "用户";
  const displayUsername = userProfile?.username || "-";
  
  const getLevelProgress = (level: number) => {
    const basePoints = (level - 1) * 100;
    const currentPoints = statsData.points - basePoints;
    const nextLevelPoints = level * 100;
    const progressPoints = nextLevelPoints - basePoints;
    return Math.min(100, Math.round((currentPoints / progressPoints) * 100));
  };
  
  const fetchUserPosts = async () => {
    if (!targetUserId) return;
    
    setPostsLoading(true);
    try {
      const response = await api.get(`/community/posts?userId=${targetUserId}&page=1&pageSize=5`);
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
      const response = await api.get(`/user/profile/${targetUserId}`);
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

  const handleGoBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="student-dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <div className="dashboard-content">
          {/* 返回按钮 */}
          <div style={{ marginBottom: 16 }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleGoBack}
              style={{ 
                marginBottom: 8,
                border: 'none',
                boxShadow: 'none',
                color: '#667eea'
              }}
            >
              返回
            </Button>
            {!isSelf && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                他人主页
              </Tag>
            )}
          </div>

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
                    {isSelf && (
                      <button
                        className="profile-edit-btn"
                        onClick={() => navigate('/student/profile')}
                      >
                        <EditOutlined /> 编辑资料
                      </button>
                    )}
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
                <span>TA的帖子</span>
              </div>
              <span
                className="view-all-btn"
                onClick={() => navigate(`/community/posts?userId=${targetUserId}`)}
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
                      onClick={() => navigate(`/community?postId=${post.id}`)}
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
                  <div className="posts-empty-text">暂无帖子</div>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
