import {
  Button,
  Card,
  Empty,
  Image,
  List,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Tabs,
  Typography,
  message,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  HomeOutlined,
  FileTextOutlined,
  MessageOutlined,
  CalendarOutlined,
  HeartOutlined,
  PlusOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import {
  fetchCommunityPosts,
  fetchCommunityComments,
  deleteCommunityPost,
} from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";

const { Title, Text, Paragraph } = Typography;

type PostRow = {
  id: number;
  title: string;
  content: string;
  status: number;
  category?: string;
  tags?: string;
  images?: string[];
  publish_status?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  comment_count?: number;
  like_count?: number;
  view_count?: number;
  User?: { nickname?: string; username?: string };
};

type CommentRow = {
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
};

type DataCache = {
  posts: {
    data: PostRow[];
    total: number;
    page: number;
  } | null;
  comments: {
    data: CommentRow[];
    total: number;
    page: number;
  } | null;
};

const parseTags = (tags?: string): string[] => {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatTime = (dateStr?: string): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPostStatus = (status?: number, publishStatus?: number): { text: string; color: string } => {
  if (publishStatus === 0) {
    return { text: "草稿", color: "default" };
  }
  if (status === 0) {
    return { text: "审核中", color: "orange" };
  }
  if (status === 2) {
    return { text: "已退回", color: "red" };
  }
  return { text: "已发布", color: "green" };
};

const stripHtml = (text?: string): string => {
  if (!text) return "";
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
};

export default function PostsList() {
  const navigate = useNavigate();
  const authState = useAppSelector((state) => state.auth);
  
  const [activeTab, setActiveTab] = useState<"posts" | "comments">("posts");
  const [loading, setLoading] = useState(false);
  
  const [postsData, setPostsData] = useState<PostRow[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  
  const [commentsData, setCommentsData] = useState<CommentRow[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsPage, setCommentsPage] = useState(1);
  
  const [pageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const dataCache = useRef<DataCache>({
    posts: null,
    comments: null,
  });
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabAnimation, setTabAnimation] = useState<"fade-in" | "fade-out" | "">("");

  const loadPosts = useCallback(
    async (pageNo: number, useCache = true) => {
      if (useCache && dataCache.current.posts) {
        const cached = dataCache.current.posts;
        setPostsData(cached.data);
        setPostsTotal(cached.total);
        setPostsPage(cached.page);
        return;
      }

      setLoading(true);
      try {
        const params: Record<string, string | number | undefined> = {
          page: pageNo,
          pageSize,
        };

        if (authState.userId) {
          params.userId = authState.userId;
        }

        const res = await fetchCommunityPosts(params);
        const data = res?.data || [];
        const total = res?.pagination?.total || 0;

        setPostsData(data);
        setPostsTotal(total);
        setPostsPage(pageNo);

        dataCache.current.posts = {
          data,
          total,
          page: pageNo,
        };
      } catch (err) {
        message.error(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [pageSize, authState.userId],
  );

  const loadComments = useCallback(
    async (pageNo: number, useCache = true) => {
      if (useCache && dataCache.current.comments) {
        const cached = dataCache.current.comments;
        setCommentsData(cached.data);
        setCommentsTotal(cached.total);
        setCommentsPage(cached.page);
        return;
      }

      setLoading(true);
      try {
        const params: Record<string, string | number | undefined> = {
          page: pageNo,
          pageSize,
        };

        if (authState.userId) {
          params.userId = authState.userId;
        }

        const res = await fetchCommunityComments(params);
        const data = res?.data || [];
        const total = res?.pagination?.total || 0;

        setCommentsData(data);
        setCommentsTotal(total);
        setCommentsPage(pageNo);

        dataCache.current.comments = {
          data,
          total,
          page: pageNo,
        };
      } catch (err) {
        message.error(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [pageSize, authState.userId],
  );

  const handleTabChange = useCallback(
    (key: string) => {
      const newTab = key as "posts" | "comments";
      if (newTab === activeTab) return;

      setTabAnimation("fade-out");
      setTimeout(() => {
        setActiveTab(newTab);
        setTabAnimation("fade-in");
        setTimeout(() => setTabAnimation(""), 300);

        if (newTab === "posts") {
          loadPosts(postsPage, true);
        } else {
          loadComments(commentsPage, true);
        }
      }, 150);
    },
    [activeTab, postsPage, commentsPage, loadPosts, loadComments],
  );

  const handleDeletePost = async (postId: number, hasComments: boolean) => {
    if (hasComments) {
      Modal.confirm({
        title: "确认删除",
        content: "该帖子已有评论，确定要删除吗？删除后无法恢复。",
        okText: "确认删除",
        okType: "danger",
        cancelText: "取消",
        onOk: async () => {
          await doDeletePost(postId, true);
        },
      });
    } else {
      await doDeletePost(postId, false);
    }
  };

  const doDeletePost = async (postId: number, confirm: boolean) => {
    try {
      setDeletingId(postId);
      await deleteCommunityPost(postId, confirm);
      message.success("删除成功");
      
      dataCache.current.posts = null;
      loadPosts(1, false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditPost = (postId: number) => {
    navigate(`/community/publish?edit=${postId}`);
  };

  const handleViewPost = (postId: number) => {
    navigate(`/community?postId=${postId}`);
  };

  const handleRefresh = () => {
    dataCache.current = { posts: null, comments: null };
    if (activeTab === "posts") {
      loadPosts(postsPage, false);
    } else {
      loadComments(commentsPage, false);
    }
  };

  useEffect(() => {
    loadPosts(1, true);
  }, [loadPosts]);

  const tabItems = [
    {
      key: "posts",
      label: (
        <span style={{ fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <FileTextOutlined />
          我的帖子
          {postsTotal > 0 && (
            <Tag color="blue" style={{ marginLeft: 4, fontSize: 12 }}>
              {postsTotal}
            </Tag>
          )}
        </span>
      ),
    },
    {
      key: "comments",
      label: (
        <span style={{ fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <MessageOutlined />
          我的评论
          {commentsTotal > 0 && (
            <Tag color="blue" style={{ marginLeft: 4, fontSize: 12 }}>
              {commentsTotal}
            </Tag>
          )}
        </span>
      ),
    },
  ];

  const renderPostsEmpty = () => (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>📝</div>
      <Title level={4} style={{ marginBottom: 12, color: "#374151" }}>
        还没有发布过帖子
      </Title>
      <Text type="secondary" style={{ fontSize: 15, display: "block", marginBottom: 32 }}>
        分享您的学习心得、问题求助或经验分享，与社区成员交流互动
      </Text>
      <Button
        type="primary"
        size="large"
        icon={<PlusOutlined />}
        onClick={() => navigate("/community/publish")}
        style={{
          borderRadius: 24,
          height: 48,
          padding: "0 32px",
          fontSize: 16,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
          boxShadow: "0 4px 16px rgba(102, 126, 234, 0.4)",
        }}
      >
        发布第一篇帖子
      </Button>
    </div>
  );

  const renderCommentsEmpty = () => (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>💭</div>
      <Title level={4} style={{ marginBottom: 12, color: "#374151" }}>
        还没有发表过评论
      </Title>
      <Text type="secondary" style={{ fontSize: 15, display: "block", marginBottom: 32 }}>
        去社区浏览帖子，发表您的见解和想法吧
      </Text>
      <Button
        type="primary"
        size="large"
        onClick={() => navigate("/community")}
        style={{
          borderRadius: 24,
          height: 48,
          padding: "0 32px",
          fontSize: 16,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
          boxShadow: "0 4px 16px rgba(102, 126, 234, 0.4)",
        }}
      >
        去社区逛逛 👉
      </Button>
    </div>
  );

  const renderPostCard = (item: PostRow) => {
    const cover = item.images?.[0];
    const statusInfo = getPostStatus(item.status, item.publish_status);
    const tags = parseTags(item.tags);
    const hasComments = (item.comment_count || 0) > 0;
    const isDeleting = deletingId === item.id;

    return (
      <Card
        key={item.id}
        loading={isDeleting}
        style={{
          borderRadius: 16,
          marginBottom: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.04)",
          transition: "all 0.3s ease",
        }}
        styles={{ body: { padding: 20 } }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.15)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: cover ? "1fr 140px" : "1fr",
            gap: 20,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ marginBottom: 12 }}>
              <Space wrap style={{ marginBottom: 8 }}>
                {item.category && (
                  <Tag color="blue" style={{ fontSize: 12, padding: "2px 10px", borderRadius: 6 }}>
                    {item.category}
                  </Tag>
                )}
                <Tag color={statusInfo.color} style={{ fontSize: 12, padding: "2px 10px", borderRadius: 6 }}>
                  {statusInfo.text}
                </Tag>
              </Space>
              <Text
                strong
                style={{
                  fontSize: 17,
                  color: "#1F2937",
                  display: "block",
                  lineHeight: 1.5,
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
                onClick={() => handleViewPost(item.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#667eea";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#1F2937";
                }}
              >
                {item.title}
              </Text>
            </div>

            <Paragraph
              ellipsis={{ rows: 4 }}
              style={{
                color: "#6B7280",
                fontSize: 14,
                lineHeight: 1.7,
                margin: "8px 0 16px 0",
                minHeight: 95,
              }}
            >
              {stripHtml(item.content) || "暂无内容"}
            </Paragraph>

            {tags.length > 0 && (
              <Space wrap size={6} style={{ marginBottom: 12 }}>
                {tags.slice(0, 5).map((tag) => (
                  <Tag
                    key={tag}
                    color="purple"
                    style={{
                      fontSize: 12,
                      padding: "2px 10px",
                      borderRadius: 6,
                    }}
                  >
                    #{tag}
                  </Tag>
                ))}
                {tags.length > 5 && (
                  <Tag style={{ fontSize: 12, padding: "2px 10px", borderRadius: 6 }}>
                    +{tags.length - 5}
                  </Tag>
                )}
              </Space>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 12,
                borderTop: "1px solid #F3F4F6",
              }}
            >
              <Space wrap size={16} style={{ color: "#9CA3AF", fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <CalendarOutlined />
                  <span>{formatTime(item.createdAt || item.created_at)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <HeartOutlined />
                  <span>{item.like_count || 0}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <MessageOutlined />
                  <span>{item.comment_count || 0}</span>
                </div>
              </Space>

              <Space size={8}>
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handleViewPost(item.id)}
                  style={{ borderRadius: 8, fontSize: 13 }}
                >
                  查看
                </Button>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEditPost(item.id)}
                  style={{ borderRadius: 8, fontSize: 13 }}
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除"
                  description={hasComments ? "该帖子已有评论，确定要删除吗？" : "确定要删除该帖子吗？"}
                  onConfirm={() => handleDeletePost(item.id, hasComments)}
                  okText="确认"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ borderRadius: 8, fontSize: 13 }}
                  >
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          </div>

          {cover && (
            <div style={{ flexShrink: 0 }}>
              <Image
                src={cover}
                alt={item.title}
                style={{
                  width: 140,
                  height: 105,
                  objectFit: "cover",
                  borderRadius: 12,
                  cursor: "pointer",
                }}
                preview={false}
                onClick={() => handleViewPost(item.id)}
              />
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderCommentCard = (item: CommentRow) => {
    const hasPost = item.Post?.id;

    return (
      <Card
        key={item.id}
        style={{
          borderRadius: 16,
          marginBottom: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.04)",
          transition: "all 0.3s ease",
        }}
        styles={{ body: { padding: 20 } }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(102, 126, 234, 0.15)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {hasPost && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "linear-gradient(135deg, #f0f4ff 0%, #e8ebff 100%)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Space style={{ minWidth: 0, flex: 1 }}>
              <Tag color="blue" style={{ fontSize: 11, margin: 0, flexShrink: 0 }}>
                评论于
              </Tag>
              <Text
                style={{
                  fontSize: 14,
                  color: "#667eea",
                  cursor: "pointer",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
                onClick={() => handleViewPost(item.Post!.id)}
              >
                {item.Post!.title}
              </Text>
            </Space>
            <Button
              type="link"
              size="small"
              icon={<ArrowRightOutlined />}
              onClick={() => handleViewPost(item.Post!.id)}
              style={{ fontSize: 13, color: "#667eea" }}
            >
              查看原帖
            </Button>
          </div>
        )}

        <Paragraph
          style={{
            color: "#374151",
            fontSize: 15,
            lineHeight: 1.8,
            margin: "8px 0 16px 0",
            padding: "0 4px",
          }}
        >
          {item.content}
        </Paragraph>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 12,
            borderTop: "1px solid #F3F4F6",
          }}
        >
          <Space wrap size={16} style={{ color: "#9CA3AF", fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <CalendarOutlined />
              <span>{formatTime(item.created_at)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <HeartOutlined style={{ color: item.like_count > 0 ? "#F43F5E" : "#9CA3AF" }} />
              <span>{item.like_count || 0}</span>
            </div>
            {item.parent_id && (
              <Tag color="default" style={{ fontSize: 11, margin: 0 }}>
                回复
              </Tag>
            )}
          </Space>

          {hasPost && (
            <Button
              size="small"
              type="primary"
              ghost
              icon={<EyeOutlined />}
              onClick={() => handleViewPost(item.Post!.id)}
              style={{ borderRadius: 8, fontSize: 13 }}
            >
              查看原帖
            </Button>
          )}
        </div>
      </Card>
    );
  };

  const renderPostsList = () => {
    if (loading && postsData.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "80px" }}>
          <Spin size="large" />
        </div>
      );
    }

    if (postsData.length === 0) {
      return renderPostsEmpty();
    }

    return (
      <div>
        {postsData.map(renderPostCard)}
        {postsTotal > pageSize && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <List
              dataSource={[]}
              pagination={{
                current: postsPage,
                pageSize,
                total: postsTotal,
                showSizeChanger: false,
                showQuickJumper: true,
                onChange: (p) => {
                  dataCache.current.posts = null;
                  loadPosts(p, false);
                },
              }}
              renderItem={() => null}
            />
          </div>
        )}
      </div>
    );
  };

  const renderCommentsList = () => {
    if (loading && commentsData.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "80px" }}>
          <Spin size="large" />
        </div>
      );
    }

    if (commentsData.length === 0) {
      return renderCommentsEmpty();
    }

    return (
      <div>
        {commentsData.map(renderCommentCard)}
        {commentsTotal > pageSize && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <List
              dataSource={[]}
              pagination={{
                current: commentsPage,
                pageSize,
                total: commentsTotal,
                showSizeChanger: false,
                showQuickJumper: true,
                onChange: (p) => {
                  dataCache.current.comments = null;
                  loadComments(p, false);
                },
              }}
              renderItem={() => null}
            />
          </div>
        )}
      </div>
    );
  };

  const tabContentStyle: React.CSSProperties = {
    transition: "all 0.3s ease",
    opacity: tabAnimation === "fade-out" ? 0 : 1,
    transform: tabAnimation === "fade-out" ? "translateY(10px)" : "translateY(0)",
  };

  return (
    <div
      className="page-container"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px 16px",
        position: "relative",
      }}
    >
      <Button
        type="text"
        icon={<HomeOutlined />}
        onClick={() => navigate("/community")}
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          zIndex: 10,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: 12,
          padding: "12px 16px",
          color: "#667eea",
          fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "white";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
        }}
      >
        返回社区
      </Button>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 32,
            paddingTop: 16,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(255, 255, 255, 0.95)",
              padding: "16px 32px",
              borderRadius: 20,
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              marginBottom: 16,
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            <Title
              level={2}
              style={{
                margin: 0,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 800,
                fontSize: 32,
              }}
            >
              我的内容
            </Title>
          </div>
        </div>

        <Card
          style={{
            borderRadius: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            border: "none",
            background: "white",
            overflow: "hidden",
            position: "relative",
          }}
          styles={{ body: { padding: 0 } }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: "24px 32px",
              color: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 8,
                    height: 32,
                    background: "white",
                    borderRadius: 4,
                  }}
                />
                <div>
                  <Title
                    level={4}
                    style={{
                      margin: 0,
                      color: "white",
                      fontWeight: 600,
                    }}
                  >
                    个人内容管理
                  </Title>
                  <div
                    style={{
                      fontSize: 13,
                      opacity: 0.9,
                      marginTop: 4,
                    }}
                  >
                    管理和查看您发布的所有帖子和评论
                  </div>
                </div>
              </div>
              <Space>
                <Button
                  onClick={handleRefresh}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    borderColor: "rgba(255,255,255,0.3)",
                  }}
                >
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/community/publish")}
                  style={{
                    background: "white",
                    color: "#667eea",
                    borderColor: "white",
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(255,255,255,0.3)",
                  }}
                >
                  发布新帖
                </Button>
              </Space>
            </div>
          </div>

          <div ref={tabsRef}>
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={tabItems}
              style={{
                borderBottom: "none",
              }}
              tabBarStyle={{
                padding: "0 24px",
                marginBottom: 0,
                borderBottom: "1px solid #F3F4F6",
                background: "#FAFAFA",
              }}
              size="large"
            />
          </div>

          <div style={{ padding: 24, ...tabContentStyle }}>
            {activeTab === "posts" && renderPostsList()}
            {activeTab === "comments" && renderCommentsList()}
          </div>
        </Card>

        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: 14,
            background: "rgba(255, 255, 255, 0.1)",
            padding: "16px",
            borderRadius: 12,
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <p style={{ margin: 0 }}>
            💡 <strong>提示</strong>：Tab 切换时会自动缓存已加载的数据，避免重复请求
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: 13, opacity: 0.8 }}>
            点击"发布新帖"创建新内容，或使用编辑、删除操作管理现有内容
          </p>
        </div>
      </div>

      <CommunityFooter
        style={{
          marginTop: 48,
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: 16,
          padding: 24,
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      />
    </div>
  );
}
