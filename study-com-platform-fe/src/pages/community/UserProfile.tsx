import { 
  Avatar, 
  Typography,
  Tag,
  message,
  Button,
  Spin,
  Tabs,
} from "antd";
import { 
  UserOutlined,
  FireOutlined,
  EditOutlined,
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
import { fetchCommunityComments, fetchCommunityPosts } from "../../services/communityPublic";
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

interface CommentItem {
  id: number;
  content: string;
  created_at: string;
  like_count: number;
  parent_id: number | null;
  post_id: number;
  Post?: {
    id: number;
    title: string;
  };
}

const { Title, Text } = Typography;

export default function UserProfile() {
  const authState = useAppSelector((state: RootState) => state.auth);
  const { userId: currentUserId } = authState;
  
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("posts"); // "posts" | "comments"
  
  const [userPosts, setUserPosts] = useState<PostItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [userComments, setUserComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  
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
      const response = await fetchCommunityPosts({ userId: targetUserId, page: 1, pageSize: 10 });
      if (response.success) {
        setUserPosts(response.data || []);
      }
    } catch (error) {
      console.error('获取用户帖子失败:', error);
    } finally {
      setPostsLoading(false);
    }
  };
  
  const fetchUserComments = async () => {
    if (!targetUserId) return;
    
    setCommentsLoading(true);
    try {
      const response = await fetchCommunityComments({ userId: targetUserId, page: 1, pageSize: 10 });
      if (response.success) {
        setUserComments(response.data || []);
      }
    } catch (error) {
      console.error('获取用户评论失败:', error);
    } finally {
      setCommentsLoading(false);
    }
  };
  
  useEffect(() => {
    if (userProfile?.id) {
      if (activeTab === "posts") {
        fetchUserPosts();
      } else if (activeTab === "comments") {
        fetchUserComments();
      }
    }
  }, [userProfile?.id, activeTab]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const tabItems = [
    {
      key: "posts",
      label: (
        <span style={{ fontSize: 15, fontWeight: 500 }}>
          📝 TA的帖子
        </span>
      ),
    },
    {
      key: "comments",
      label: (
        <span style={{ fontSize: 15, fontWeight: 500 }}>
          💬 TA的评论
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="student-dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // 渲染帖子列表
  const renderPostsList = () => {
    if (postsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Spin />
        </div>
      );
    }
    
    if (userPosts.length === 0) {
      return (
        <div className="posts-empty" style={{ padding: '60px' }}>
          <div className="posts-empty-icon" style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div className="posts-empty-text" style={{ fontSize: 15, color: '#9CA3AF' }}>暂无帖子</div>
        </div>
      );
    }
    
    return (
      <div className="posts-list">
        {userPosts.map((post) => (
          <div
            key={post.id}
            className="post-item-card"
            onClick={() => navigate(`/community?postId=${post.id}`)}
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #F3F4F6',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FAFAFA';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div className="post-header" style={{ marginBottom: 10 }}>
              <div className="post-title">
                <span className="post-title-text" style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#1F2937',
                }}>
                  {post.title}
                </span>
              </div>
              <div className="post-tags" style={{ marginLeft: 'auto' }}>
                {post.is_top && (
                  <Tag color="red" style={{ marginLeft: 8 }}>置顶</Tag>
                )}
                <Tag color={post.publish_status === 1 ? "green" : "orange"} style={{ marginLeft: 8 }}>
                  {post.publish_status === 1 ? '已发布' : '草稿'}
                </Tag>
              </div>
            </div>
            <div className="post-meta" style={{ display: 'flex', gap: 20, color: '#6B7280', fontSize: 13 }}>
              <div className="post-meta-item" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CalendarOutlined className="post-meta-icon" />
                <span className="post-meta-value">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="post-meta-item" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <EyeOutlined className="post-meta-icon" />
                <span className="post-meta-value">{post.view_count || 0}</span>
              </div>
              <div className="post-meta-item" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MessageOutlined className="post-meta-icon" />
                <span className="post-meta-value">{post.comment_count || 0}</span>
              </div>
              <div className="post-meta-item" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <HeartOutlined className="post-meta-icon" />
                <span className="post-meta-value">{post.like_count || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染评论列表
  const renderCommentsList = () => {
    if (commentsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Spin />
        </div>
      );
    }
    
    if (userComments.length === 0) {
      return (
        <div className="posts-empty" style={{ padding: '60px' }}>
          <div className="posts-empty-icon" style={{ fontSize: 48, marginBottom: 16 }}>💭</div>
          <div className="posts-empty-text" style={{ fontSize: 15, color: '#9CA3AF' }}>暂无评论</div>
        </div>
      );
    }
    
    return (
      <div>
        {userComments.map((comment) => (
          <div
            key={comment.id}
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid #F3F4F6',
              cursor: comment.Post?.id ? 'pointer' : 'default',
              transition: 'background 0.2s ease',
            }}
            onClick={() => {
              if (comment.Post?.id) {
                navigate(`/community?postId=${comment.Post.id}`);
              }
            }}
            onMouseEnter={(e) => {
              if (comment.Post?.id) {
                e.currentTarget.style.background = '#FAFAFA';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {/* 评论来源帖子 */}
            {comment.Post && (
              <div style={{
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <Tag color="blue" style={{
                  fontSize: 11,
                  margin: 0,
                }}>
                  评论于
                </Tag>
                <Text style={{
                  fontSize: 13,
                  color: '#3B82F6',
                  cursor: 'pointer',
                  fontWeight: 500,
                }} onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/community?postId=${comment.Post!.id}`);
                }}>
                  {comment.Post.title}
                </Text>
                <ArrowRightOutlined style={{ 
                  fontSize: 12, 
                  color: '#9CA3AF',
                  marginLeft: 4,
                }} />
              </div>
            )}
            
            {/* 评论内容 */}
            <div style={{
              fontSize: 14,
              color: '#374151',
              lineHeight: 1.7,
              marginBottom: 12,
            }}>
              {comment.content}
            </div>
            
            {/* 评论元信息 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              color: '#9CA3AF',
              fontSize: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CalendarOutlined />
                <span>{new Date(comment.created_at).toLocaleString()}</span>
              </div>
              {comment.like_count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <HeartOutlined style={{ color: '#F43F5E' }} />
                  <span>{comment.like_count}</span>
                </div>
              )}
              {comment.parent_id && (
                <Tag color="default" style={{ fontSize: 11, margin: 0 }}>
                  回复
                </Tag>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

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

          {/* 内容标签页（帖子 / 评论） */}
          <div className="dashboard-card">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              style={{
                borderBottom: 'none',
              }}
              tabBarStyle={{
                paddingLeft: 24,
                paddingRight: 24,
                marginBottom: 0,
                borderBottom: '1px solid #F3F4F6',
              }}
            />
            
            <div style={{ padding: '0 4px' }}>
              {activeTab === "posts" && renderPostsList()}
              {activeTab === "comments" && renderCommentsList()}
            </div>
          </div>
        </div>
    </div>
  );
}
