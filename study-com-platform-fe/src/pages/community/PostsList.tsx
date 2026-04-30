import {
  Button,
  Card,
  Checkbox,
  Empty,
  Image,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
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
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SafetyCertificateOutlined,
  BulbOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import {
  fetchCommunityPosts,
  fetchCommunityComments,
  deleteCommunityPost,
  updateCommunityPost,
  deleteCommunityComment,
} from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

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
    keyword: string;
    category: string | undefined;
    status: string | undefined;
    sortBy: string;
  } | null;
  comments: {
    data: CommentRow[];
    total: number;
    page: number;
    keyword: string;
    timeRange: string | undefined;
    sortBy: string;
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

const getPostStatus = (status?: number, publishStatus?: number): { text: string; color: string; value: string } => {
  if (publishStatus === 0) {
    return { text: "草稿", color: "default", value: "draft" };
  }
  if (status === 0) {
    return { text: "审核中", color: "orange", value: "pending" };
  }
  if (status === 2) {
    return { text: "已退回", color: "red", value: "rejected" };
  }
  return { text: "已发布", color: "green", value: "published" };
};

const stripHtml = (text?: string): string => {
  if (!text) return "";
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
};

const useDebounce = (value: string, delay: number): string => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const SkeletonCard = () => (
  <Card
    style={{
      borderRadius: 16,
      marginBottom: 16,
      border: "1px solid #f0f0f0",
      opacity: 0.7,
    }}
    styles={{ body: { padding: 20 } }}
  >
    <Space direction="vertical" style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 60, height: 24, background: "#f0f0f0", borderRadius: 4 }} />
        <div style={{ width: 60, height: 24, background: "#f0f0f0", borderRadius: 4 }} />
      </div>
      <div style={{ width: "70%", height: 24, background: "#f0f0f0", borderRadius: 4 }} />
      <div style={{ width: "100%", height: 16, background: "#f0f0f0", borderRadius: 4 }} />
      <div style={{ width: "80%", height: 16, background: "#f0f0f0", borderRadius: 4 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space>
          <div style={{ width: 80, height: 16, background: "#f0f0f0", borderRadius: 4 }} />
          <div style={{ width: 60, height: 16, background: "#f0f0f0", borderRadius: 4 }} />
        </Space>
        <div style={{ width: 200, height: 24, background: "#f0f0f0", borderRadius: 4 }} />
      </div>
    </Space>
  </Card>
);

const categoryOptions = [
  { label: "学习心得", value: "学习心得" },
  { label: "问题求助", value: "问题求助" },
  { label: "经验分享", value: "经验分享" },
  { label: "聊天交友", value: "聊天交友" },
];

const statusOptions = [
  { label: "全部状态", value: "all" },
  { label: "已发布", value: "published" },
  { label: "草稿", value: "draft" },
  { label: "审核中", value: "pending" },
  { label: "已退回", value: "rejected" },
];

const sortOptions = [
  { label: "最新发布", value: "newest" },
  { label: "最多点赞", value: "mostLikes" },
  { label: "最多评论", value: "mostComments" },
];

const timeRangeOptions = [
  { label: "全部时间", value: "all" },
  { label: "今天", value: "today" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
  { label: "最近三个月", value: "threeMonths" },
];

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
  const [deletingIds, setDeletingIds] = useState<number[]>([]);

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 300);

  const [postCategory, setPostCategory] = useState<string | undefined>();
  const [postStatus, setPostStatus] = useState<string | undefined>();
  const [commentTimeRange, setCommentTimeRange] = useState<string | undefined>();

  const [postSortBy, setPostSortBy] = useState("newest");
  const [commentSortBy, setCommentSortBy] = useState("newest");

  const [manageMode, setManageMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<number[]>([]);
  const [selectedCommentIds, setSelectedCommentIds] = useState<number[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  const dataCache = useRef<DataCache>({
    posts: null,
    comments: null,
  });
  const [tabAnimation, setTabAnimation] = useState<"fade-in" | "fade-out" | "">("");
  const [hasSearched, setHasSearched] = useState(false);

  const filterPosts = useCallback(
    (posts: PostRow[]): PostRow[] => {
      let filtered = [...posts];

      if (debouncedKeyword.trim()) {
        const keyword = debouncedKeyword.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.title?.toLowerCase().includes(keyword) ||
            stripHtml(p.content)?.toLowerCase().includes(keyword),
        );
      }

      if (postCategory) {
        filtered = filtered.filter((p) => p.category === postCategory);
      }

      if (postStatus && postStatus !== "all") {
        filtered = filtered.filter((p) => {
          const statusInfo = getPostStatus(p.status, p.publish_status);
          return statusInfo.value === postStatus;
        });
      }

      switch (postSortBy) {
        case "mostLikes":
          filtered.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
          break;
        case "mostComments":
          filtered.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
          break;
        case "newest":
        default:
          filtered.sort(
            (a, b) =>
              new Date(b.createdAt || b.created_at || 0).getTime() -
              new Date(a.createdAt || a.created_at || 0).getTime(),
          );
      }

      return filtered;
    },
    [debouncedKeyword, postCategory, postStatus, postSortBy],
  );

  const filterComments = useCallback(
    (comments: CommentRow[]): CommentRow[] => {
      let filtered = [...comments];

      if (debouncedKeyword.trim()) {
        const keyword = debouncedKeyword.toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.content?.toLowerCase().includes(keyword) ||
            c.Post?.title?.toLowerCase().includes(keyword),
        );
      }

      if (commentTimeRange && commentTimeRange !== "all") {
        const now = new Date();
        let startTime: Date;

        switch (commentTimeRange) {
          case "today":
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startTime = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "threeMonths":
            startTime = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            break;
          default:
            startTime = new Date(0);
        }

        filtered = filtered.filter((c) => new Date(c.created_at) >= startTime);
      }

      switch (commentSortBy) {
        case "mostLikes":
          filtered.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
          break;
        case "newest":
        default:
          filtered.sort(
            (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
          );
      }

      return filtered;
    },
    [debouncedKeyword, commentTimeRange, commentSortBy],
  );

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
          keyword: debouncedKeyword,
          category: postCategory,
          status: postStatus,
          sortBy: postSortBy,
        };
      } catch (err) {
        message.error(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [pageSize, authState.userId, debouncedKeyword, postCategory, postStatus, postSortBy],
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
          keyword: debouncedKeyword,
          timeRange: commentTimeRange,
          sortBy: commentSortBy,
        };
      } catch (err) {
        message.error(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [pageSize, authState.userId, debouncedKeyword, commentTimeRange, commentSortBy],
  );

  useEffect(() => {
    if (debouncedKeyword || postCategory || postStatus || commentTimeRange) {
      setHasSearched(true);
    }
  }, [debouncedKeyword, postCategory, postStatus, commentTimeRange]);

  useEffect(() => {
    setSelectedPostIds([]);
    setSelectedCommentIds([]);
    dataCache.current.posts = null;
    loadPosts(1, false);
  }, [debouncedKeyword, postCategory, postStatus, postSortBy, loadPosts]);

  useEffect(() => {
    setSelectedPostIds([]);
    setSelectedCommentIds([]);
    dataCache.current.comments = null;
    loadComments(1, false);
  }, [debouncedKeyword, commentTimeRange, commentSortBy, loadComments]);

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
      setDeletingIds((prev) => [...prev, postId]);
      await deleteCommunityPost(postId, confirm);
      message.success("删除成功");

      dataCache.current.posts = null;
      loadPosts(1, false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== postId));
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
    message.info("已刷新");
  };

  const togglePostSelection = (postId: number, checked: boolean) => {
    if (checked) {
      setSelectedPostIds((prev) => [...prev, postId]);
    } else {
      setSelectedPostIds((prev) => prev.filter((id) => id !== postId));
    }
  };

  const toggleCommentSelection = (commentId: number, checked: boolean) => {
    if (checked) {
      setSelectedCommentIds((prev) => [...prev, commentId]);
    } else {
      setSelectedCommentIds((prev) => prev.filter((id) => id !== commentId));
    }
  };

  const toggleAllPosts = (checked: boolean) => {
    const filteredPosts = filterPosts(postsData);
    if (checked) {
      setSelectedPostIds(filteredPosts.map((p) => p.id));
    } else {
      setSelectedPostIds([]);
    }
  };

  const toggleAllComments = (checked: boolean) => {
    const filteredComments = filterComments(commentsData);
    if (checked) {
      setSelectedCommentIds(filteredComments.map((c) => c.id));
    } else {
      setSelectedCommentIds([]);
    }
  };

  const handleBatchDeletePosts = () => {
    if (selectedPostIds.length === 0) return;

    Modal.confirm({
      title: "批量删除帖子",
      content: `确定要删除选中的 ${selectedPostIds.length} 个帖子吗？此操作无法恢复。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          setBatchActionLoading(true);
          const results = await Promise.allSettled(
            selectedPostIds.map((id) => deleteCommunityPost(id, true)),
          );
          const successCount = results.filter((r) => r.status === "fulfilled").length;
          const failCount = results.filter((r) => r.status === "rejected").length;

          if (successCount > 0) {
            message.success(`成功删除 ${successCount} 个帖子`);
          }
          if (failCount > 0) {
            message.error(`${failCount} 个帖子删除失败`);
          }

          setSelectedPostIds([]);
          dataCache.current.posts = null;
          loadPosts(1, false);
        } catch (err) {
          message.error("批量删除失败");
        } finally {
          setBatchActionLoading(false);
        }
      },
    });
  };

  const handleBatchUnpublishPosts = () => {
    if (selectedPostIds.length === 0) return;

    Modal.confirm({
      title: "批量取消发布",
      content: `确定要将选中的 ${selectedPostIds.length} 个帖子取消发布吗？取消后帖子将变为草稿状态。`,
      okText: "确认取消",
      cancelText: "取消",
      onOk: async () => {
        try {
          setBatchActionLoading(true);
          const results = await Promise.allSettled(
            selectedPostIds.map((id) => updateCommunityPost(id, { isDraft: true })),
          );
          const successCount = results.filter((r) => r.status === "fulfilled").length;
          const failCount = results.filter((r) => r.status === "rejected").length;

          if (successCount > 0) {
            message.success(`成功取消发布 ${successCount} 个帖子`);
          }
          if (failCount > 0) {
            message.error(`${failCount} 个帖子操作失败`);
          }

          setSelectedPostIds([]);
          dataCache.current.posts = null;
          loadPosts(1, false);
        } catch (err) {
          message.error("批量操作失败");
        } finally {
          setBatchActionLoading(false);
        }
      },
    });
  };

  const handleBatchDeleteComments = () => {
    if (selectedCommentIds.length === 0) return;

    Modal.confirm({
      title: "批量清理评论",
      content: `确定要删除选中的 ${selectedCommentIds.length} 条评论吗？此操作无法恢复。`,
      okText: "确认删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          setBatchActionLoading(true);
          const results = await Promise.allSettled(
            selectedCommentIds.map((id) => deleteCommunityComment(id)),
          );
          const successCount = results.filter((r) => r.status === "fulfilled").length;
          const failCount = results.filter((r) => r.status === "rejected").length;

          if (successCount > 0) {
            message.success(`成功删除 ${successCount} 条评论`);
          }
          if (failCount > 0) {
            message.error(`${failCount} 条评论删除失败`);
          }

          setSelectedCommentIds([]);
          dataCache.current.comments = null;
          loadComments(1, false);
        } catch (err) {
          message.error("批量删除失败");
        } finally {
          setBatchActionLoading(false);
        }
      },
    });
  };

  useEffect(() => {
    loadPosts(1, true);
  }, [loadPosts]);

  const filteredPosts = filterPosts(postsData);
  const filteredComments = filterComments(commentsData);

  const postCount = postsTotal;
  const commentCount = commentsTotal;

  const tabItems = [
    {
      key: "posts",
      label: (
        <span style={{ fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <FileTextOutlined />
          我的帖子
          {postCount > 0 && (
            <Tag color="blue" style={{ marginLeft: 4, fontSize: 12 }}>
              {postCount}
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
          {commentCount > 0 && (
            <Tag color="blue" style={{ marginLeft: 4, fontSize: 12 }}>
              {commentCount}
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

  const renderPostsNoResults = () => (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🔍</div>
      <Title level={4} style={{ marginBottom: 12, color: "#374151" }}>
        没有找到匹配的帖子
      </Title>
      <Text type="secondary" style={{ fontSize: 15, display: "block", marginBottom: 32 }}>
        请尝试修改搜索关键词或筛选条件
      </Text>
      <Button
        onClick={() => {
          setKeyword("");
          setPostCategory(undefined);
          setPostStatus(undefined);
        }}
        style={{
          borderRadius: 24,
          height: 42,
          padding: "0 28px",
          fontSize: 15,
        }}
      >
        清除筛选条件
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

  const renderCommentsNoResults = () => (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🔍</div>
      <Title level={4} style={{ marginBottom: 12, color: "#374151" }}>
        没有找到匹配的评论
      </Title>
      <Text type="secondary" style={{ fontSize: 15, display: "block", marginBottom: 32 }}>
        请尝试修改搜索关键词或时间范围
      </Text>
      <Button
        onClick={() => {
          setKeyword("");
          setCommentTimeRange(undefined);
        }}
        style={{
          borderRadius: 24,
          height: 42,
          padding: "0 28px",
          fontSize: 15,
        }}
      >
        清除筛选条件
      </Button>
    </div>
  );

  const renderPostCard = (item: PostRow, index: number) => {
    const cover = item.images?.[0];
    const statusInfo = getPostStatus(item.status, item.publish_status);
    const tags = parseTags(item.tags);
    const hasComments = (item.comment_count || 0) > 0;
    const isDeleting = deletingIds.includes(item.id);
    const isSelected = selectedPostIds.includes(item.id);

    return (
      <Card
        key={item.id}
        loading={isDeleting}
        style={{
          borderRadius: 16,
          marginBottom: 16,
          boxShadow: isSelected
            ? "0 0 0 2px #667eea, 0 8px 24px rgba(102, 126, 234, 0.2)"
            : "0 2px 8px rgba(0,0,0,0.06)",
          border: isSelected ? "2px solid #667eea" : "1px solid rgba(0,0,0,0.04)",
          transition: "all 0.3s ease",
        }}
        styles={{ body: { padding: 20 } }}
        className="post-card"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: manageMode ? "auto 1fr" : cover ? "1fr 140px" : "1fr",
            gap: 20,
            alignItems: "flex-start",
          }}
        >
          {manageMode && (
            <div style={{ flexShrink: 0, paddingTop: 4 }}>
              <Checkbox
                checked={isSelected}
                onChange={(e) => togglePostSelection(item.id, e.target.checked)}
              />
            </div>
          )}

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
              ellipsis={{ rows: 2 }}
              style={{
                color: "#6B7280",
                fontSize: 14,
                lineHeight: 1.7,
                margin: "8px 0 16px 0",
                minHeight: 48,
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

              <div className="card-actions" style={{ opacity: manageMode ? 1 : 0, transition: "opacity 0.2s" }}>
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
          </div>

          {cover && !manageMode && (
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

  const renderCommentCard = (item: CommentRow, index: number) => {
    const hasPost = item.Post?.id;
    const isSelected = selectedCommentIds.includes(item.id);
    const isDeleting = deletingIds.includes(item.id);

    return (
      <Card
        key={item.id}
        loading={isDeleting}
        style={{
          borderRadius: 16,
          marginBottom: 16,
          boxShadow: isSelected
            ? "0 0 0 2px #667eea, 0 8px 24px rgba(102, 126, 234, 0.2)"
            : "0 2px 8px rgba(0,0,0,0.06)",
          border: isSelected ? "2px solid #667eea" : "1px solid rgba(0,0,0,0.04)",
          transition: "all 0.3s ease",
        }}
        styles={{ body: { padding: 20 } }}
        className="comment-card"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: manageMode ? "auto 1fr" : "1fr",
            gap: 20,
            alignItems: "flex-start",
          }}
        >
          {manageMode && (
            <div style={{ flexShrink: 0, paddingTop: 4 }}>
              <Checkbox
                checked={isSelected}
                onChange={(e) => toggleCommentSelection(item.id, e.target.checked)}
              />
            </div>
          )}

          <div style={{ minWidth: 0 }}>
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
                <div className="comment-quick-actions" style={{ opacity: manageMode ? 1 : 0, transition: "opacity 0.2s" }}>
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
                <div className="comment-actions" style={{ opacity: manageMode ? 1 : 0, transition: "opacity 0.2s" }}>
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
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderPostsList = () => {
    if (loading && postsData.length === 0) {
      return (
        <div style={{ textAlign: "center" }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }

    if (postsData.length === 0 && !hasSearched) {
      return renderPostsEmpty();
    }

    if (filteredPosts.length === 0) {
      return renderPostsNoResults();
    }

    return (
      <div>
        {manageMode && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "#F0F9FF",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Space>
              <Checkbox
                checked={selectedPostIds.length === filteredPosts.length && filteredPosts.length > 0}
                indeterminate={selectedPostIds.length > 0 && selectedPostIds.length < filteredPosts.length}
                onChange={(e) => toggleAllPosts(e.target.checked)}
              >
                全选
              </Checkbox>
              <Text type="secondary">
                已选择 <Tag color="blue">{selectedPostIds.length}</Tag> / {filteredPosts.length} 个帖子
              </Text>
            </Space>
            <Space>
              <Button
                size="small"
                icon={<RedoOutlined />}
                onClick={handleBatchUnpublishPosts}
                disabled={selectedPostIds.length === 0 || batchActionLoading}
              >
                批量取消发布
              </Button>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDeletePosts}
                disabled={selectedPostIds.length === 0 || batchActionLoading}
              >
                批量删除
              </Button>
            </Space>
          </div>
        )}

        {filteredPosts.map(renderPostCard)}

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
        <div style={{ textAlign: "center" }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    }

    if (commentsData.length === 0 && !hasSearched) {
      return renderCommentsEmpty();
    }

    if (filteredComments.length === 0) {
      return renderCommentsNoResults();
    }

    return (
      <div>
        {manageMode && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "#F0F9FF",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Space>
              <Checkbox
                checked={selectedCommentIds.length === filteredComments.length && filteredComments.length > 0}
                indeterminate={
                  selectedCommentIds.length > 0 && selectedCommentIds.length < filteredComments.length
                }
                onChange={(e) => toggleAllComments(e.target.checked)}
              >
                全选
              </Checkbox>
              <Text type="secondary">
                已选择 <Tag color="blue">{selectedCommentIds.length}</Tag> / {filteredComments.length} 条评论
              </Text>
            </Space>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleBatchDeleteComments}
              disabled={selectedCommentIds.length === 0 || batchActionLoading}
            >
              批量清理
            </Button>
          </div>
        )}

        {filteredComments.map(renderCommentCard)}

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
      <style>{`
        .post-card:hover .card-actions,
        .comment-card:hover .comment-quick-actions,
        .comment-card:hover .comment-actions {
          opacity: 1 !important;
        }
      `}</style>

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
                  icon={<SearchOutlined />}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    borderColor: "rgba(255,255,255,0.3)",
                  }}
                >
                  刷新
                </Button>
                <Button
                  type={manageMode ? "primary" : "default"}
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => {
                    setManageMode(!manageMode);
                    setSelectedPostIds([]);
                    setSelectedCommentIds([]);
                  }}
                  style={{
                    background: manageMode ? "white" : "rgba(255,255,255,0.2)",
                    color: manageMode ? "#667eea" : "white",
                    borderColor: manageMode ? "white" : "rgba(255,255,255,0.3)",
                    fontWeight: 600,
                  }}
                >
                  {manageMode ? "退出管理" : "管理模式"}
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

          <div
            style={{
              padding: "16px 24px",
              background: "#FAFAFA",
              borderBottom: "1px solid #F0F0F0",
            }}
          >
            <Space wrap style={{ width: "100%" }}>
              <Search
                placeholder="搜索标题/内容/帖子关键词..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                allowClear
                style={{ width: 300 }}
                prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
              />

              {activeTab === "posts" && (
                <>
                  <Select
                    placeholder="筛选分类"
                    allowClear
                    style={{ width: 150 }}
                    value={postCategory}
                    onChange={setPostCategory}
                    options={categoryOptions}
                    prefix={<FilterOutlined style={{ color: "#9CA3AF" }} />}
                  />
                  <Select
                    placeholder="筛选状态"
                    allowClear
                    style={{ width: 130 }}
                    value={postStatus}
                    onChange={setPostStatus}
                    options={statusOptions}
                  />
                </>
              )}

              {activeTab === "comments" && (
                <Select
                  placeholder="时间范围"
                  allowClear
                  style={{ width: 140 }}
                  value={commentTimeRange}
                  onChange={setCommentTimeRange}
                  options={timeRangeOptions}
                />
              )}

              <Select
                placeholder="排序"
                style={{ width: 130 }}
                value={activeTab === "posts" ? postSortBy : commentSortBy}
                onChange={(v) => {
                  if (activeTab === "posts") {
                    setPostSortBy(v);
                  } else {
                    setCommentSortBy(v);
                  }
                }}
                options={sortOptions}
                prefix={<SortAscendingOutlined style={{ color: "#9CA3AF" }} />}
              />
            </Space>
          </div>

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
            }}
            size="large"
          />

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
            点击"管理模式"可进行多选批量操作，hover 卡片可显示操作按钮
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
