import {
  Avatar,
  Button,
  Card,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
  Spin,
  Empty,
} from "antd";
import {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { deleteFavorite, fetchFavorites } from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";
import { HomeOutlined, SearchOutlined, FilterOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Search } = Input;

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api"
).replace(/\/$/, "");
const IMAGE_BASE = API_BASE.replace(/\/api$/, "");
const resolveImageUrl = (src?: string) => {
  if (!src) return undefined;
  const normalized = src.replace(/\\/g, "/");
  if (normalized.startsWith("http")) return normalized;
  if (normalized.startsWith("/")) return `${IMAGE_BASE}${normalized}`;
  return `${IMAGE_BASE}/${normalized}`;
};

const parseImages = (images?: string | string[]) => {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseTags = (tags?: string) => {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

type SortOption = "created_at" | "view_count" | "like_count" | "comment_count";

const SORT_OPTIONS = [
  { value: "created_at", label: "最新收藏" },
  { value: "view_count", label: "最多浏览" },
  { value: "like_count", label: "最多点赞" },
  { value: "comment_count", label: "最多评论" },
];

type FavoriteRow = {
  id: number;
  post_id: number;
  note?: string;
  tags?: string;
  createdAt?: string;
  created_at?: string;
  Post?: {
    id: number;
    title: string;
    content: string;
    category?: string;
    tags?: string;
    images?: string | string[];
    createdAt?: string;
    created_at?: string;
    view_count?: number;
    like_count?: number;
    comment_count?: number;
    User?: { nickname?: string; username?: string };
  };
};

type FavoritePost = {
  favoriteId: number;
  favoriteAt?: string;
  id: number;
  title: string;
  content: string;
  category?: string;
  tags: string[];
  images?: string[];
  createdAt?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  User?: { nickname?: string; username?: string };
};

const stripText = (value?: string) =>
  (value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const formatTime = (dateStr?: string) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60 * 1000) return "刚刚";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export default function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("created_at");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [hoverFavoriteId, setHoverFavoriteId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const searchInputRef = useRef("");
  const searchTimerRef = useRef<number | null>(null);
  const fetchingMoreRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastKeywordRef = useRef<string>("");
  const lastSortByRef = useRef<SortOption>("created_at");

  const allTags = new Set<string>();
  favorites.forEach((fav) => {
    if (fav.Post?.tags) {
      const tags = parseTags(fav.Post.tags);
      tags.forEach((tag) => allTags.add(tag));
    }
  });

  const loadFavorites = useCallback(
    async (pageNo: number, append = false, isSearch = false) => {
      if (fetchingMoreRef.current && append) return;
      fetchingMoreRef.current = true;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const trimmedKeyword = keyword.trim();
      if (!append) {
        if (lastKeywordRef.current === trimmedKeyword && lastSortByRef.current === sortBy) {
          fetchingMoreRef.current = false;
          return;
        }
      }

      if (append) {
        setLoadingMore(true);
      } else if (isSearch) {
        setSearching(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await fetchFavorites({
          page: pageNo,
          pageSize,
          keyword: trimmedKeyword || undefined,
          sortBy,
          sortOrder: sortBy === "created_at" ? "DESC" : "DESC",
        });

        const newData = res?.data || [];
        const newTotal = res?.pagination?.total || 0;

        if (append) {
          setFavorites((prev) => [...prev, ...newData]);
        } else {
          setFavorites(newData);
          lastKeywordRef.current = trimmedKeyword;
          lastSortByRef.current = sortBy;
        }
        setTotal(newTotal);
        setPage(pageNo);
        setHasMore((pageNo - 1) * pageSize + newData.length < newTotal);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
        } else {
          message.error(err instanceof Error ? err.message : "加载收藏失败");
        }
      } finally {
        setLoading(false);
        setSearching(false);
        setLoadingMore(false);
        fetchingMoreRef.current = false;
        if (abortControllerRef.current) {
          abortControllerRef.current = null;
        }
      }
    },
    [keyword, sortBy, pageSize]
  );

  useEffect(() => {
    loadFavorites(1, false, keyword !== lastKeywordRef.current);
  }, [keyword, sortBy]);

  useEffect(() => {
    const handleScroll = () => {
      if (!hasMore || loading || loadingMore || searching || fetchingMoreRef.current) return;

      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= docHeight - 200) {
        loadFavorites(page + 1, true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, loadingMore, searching, page, loadFavorites]);

  const handleSearch = (value: string) => {
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }
    setKeyword(value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    searchInputRef.current = value;

    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = window.setTimeout(() => {
      if (searchInputRef.current.trim() === lastKeywordRef.current) {
        return;
      }
      setKeyword(searchInputRef.current);
    }, 400);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  const handleClearTags = () => {
    setSelectedTags(new Set());
  };

  const handleRemoveFavorite = async (favoriteId: number) => {
    try {
      setRemovingId(favoriteId);
      await deleteFavorite(favoriteId);
      message.success("已取消收藏");
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      message.error("取消收藏失败");
    } finally {
      setRemovingId(null);
    }
  };

  const handlePostClick = (postId: number) => {
    navigate(`/community?postId=${postId}`);
  };

  const filteredItems: FavoritePost[] = favorites
    .map((fav) => {
      if (!fav.Post) return null;
      const favoriteAt = fav.createdAt || fav.created_at;
      const postCreatedAt = fav.Post.createdAt || fav.Post.created_at;
      const postTags = parseTags(fav.Post.tags);

      if (selectedTags.size > 0) {
        const hasMatch = Array.from(selectedTags).some((tag) =>
          postTags.includes(tag)
        );
        if (!hasMatch) return null;
      }

      return {
        favoriteId: fav.id,
        favoriteAt,
        ...fav.Post,
        tags: postTags,
        createdAt: postCreatedAt,
        images: parseImages(fav.Post.images),
      } as FavoritePost;
    })
    .filter(Boolean) as FavoritePost[];

  const hasFavorites = total > 0;
  const hasFilteredItems = filteredItems.length > 0;

  return (
    <div
      className="page-container"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px 16px 40px",
        position: "relative",
      }}
    >
      <Button
        type="text"
        icon={<HomeOutlined />}
        onClick={() => navigate("/community")}
        style={{
          position: "absolute",
          top: 20,
          left: 20,
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
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Card
          style={{
            borderRadius: 20,
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            border: "none",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            marginBottom: 20,
          }}
          styles={{ body: { padding: "20px 24px" } }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
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
                  fontSize: 28,
                }}
              >
                我的收藏
              </Title>
              <Tag
                color="purple"
                style={{
                  fontSize: 14,
                  padding: "4px 12px",
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                共 {total} 个
              </Tag>
            </div>

            <Space
              wrap
              style={{
                flex: 1,
                maxWidth: 600,
                minWidth: 200,
                justifyContent: "flex-end",
              }}
            >
              <Search
                placeholder="搜索收藏的帖子..."
                allowClear
                prefix={<SearchOutlined style={{ color: "#999" }} />}
                value={keyword}
                onChange={handleSearchChange}
                onSearch={handleSearch}
                style={{ width: 280 }}
                size="large"
              />
              <Select
                value={sortBy}
                onChange={(value) => setSortBy(value as SortOption)}
                style={{ width: 140 }}
                size="large"
                options={SORT_OPTIONS}
                suffixIcon={<FilterOutlined />}
              />
            </Space>
          </div>

          {allTags.size > 0 && (
            <div
              style={{
                paddingTop: 16,
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <Space wrap align="center">
                <Text type="secondary" style={{ fontSize: 13 }}>
                  标签筛选：
                </Text>
                {Array.from(allTags).map((tag) => (
                  <Tag
                    key={tag}
                    color={selectedTags.has(tag) ? "purple" : "default"}
                    style={{
                      cursor: "pointer",
                      fontSize: 13,
                      padding: "4px 12px",
                      borderRadius: 8,
                      transition: "all 0.2s ease",
                      border: selectedTags.has(tag)
                        ? "1px solid #722ed1"
                        : "1px solid #d9d9d9",
                      background: selectedTags.has(tag) ? "#f9f0ff" : "#fff",
                      fontWeight: selectedTags.has(tag) ? 600 : 400,
                    }}
                    onClick={() => handleTagClick(tag)}
                  >
                    #{tag}
                  </Tag>
                ))}
                {selectedTags.size > 0 && (
                  <Button
                    type="link"
                    size="small"
                    onClick={handleClearTags}
                    style={{ fontSize: 12 }}
                  >
                    清除筛选
                  </Button>
                )}
              </Space>
            </div>
          )}
        </Card>

        {loading && favorites.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 80,
              background: "rgba(255, 255, 255, 0.9)",
              borderRadius: 20,
            }}
          >
            <Spin size="large" />
          </div>
        ) : !hasFavorites ? (
          <Card
            style={{
              borderRadius: 20,
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              border: "none",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
              }}
            >
              <div
                style={{
                  fontSize: 80,
                  marginBottom: 24,
                }}
              >
                📚
              </div>
              <Title
                level={3}
                style={{
                  margin: "0 0 12px 0",
                  color: "#333",
                  fontWeight: 600,
                }}
              >
                还没有收藏的内容
              </Title>
              <Text
                type="secondary"
                style={{
                  fontSize: 15,
                  display: "block",
                  marginBottom: 32,
                }}
              >
                去社区发现有趣的内容，收藏喜欢的帖子吧～
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
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  border: "none",
                  boxShadow: "0 4px 16px rgba(102, 126, 234, 0.4)",
                }}
              >
                去逛逛 👉
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {searching && (
              <div
                style={{
                  textAlign: "center",
                  padding: 16,
                  marginBottom: 16,
                  background: "rgba(255, 255, 255, 0.9)",
                  borderRadius: 16,
                  backdropFilter: "blur(10px)",
                }}
              >
                <Spin size="small" />
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                  搜索中...
                </Text>
              </div>
            )}

            {!hasFilteredItems && !searching ? (
              <Card
                style={{
                  borderRadius: 20,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                  border: "none",
                  background: "rgba(255, 255, 255, 0.95)",
                }}
              >
                <Empty
                  description={
                    <Text type="secondary" style={{ fontSize: 15 }}>
                      没有找到匹配的收藏内容
                    </Text>
                  }
                  style={{ padding: "60px 20px" }}
                />
              </Card>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: 20,
                  marginBottom: 20,
                  opacity: searching ? 0.6 : 1,
                  transition: "opacity 0.2s ease",
                }}
              >
                {filteredItems.map((item) => (
                  <Card
                    key={item.favoriteId}
                    loading={removingId === item.favoriteId}
                    hoverable
                    style={{
                      borderRadius: 16,
                      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                      border: "1px solid rgba(0,0,0,0.04)",
                      background: "rgba(255, 255, 255, 0.95)",
                      transition: "all 0.3s ease",
                    }}
                    styles={{
                      body: { padding: 20 },
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 12px 24px rgba(102, 126, 234, 0.15)";
                      e.currentTarget.style.background = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 2px 12px rgba(0,0,0,0.06)";
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.95)";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          marginBottom: 12,
                          gap: 12,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {item.category && (
                            <Tag
                              color="blue"
                              style={{
                                marginBottom: 8,
                                borderRadius: 6,
                              }}
                            >
                              {item.category}
                            </Tag>
                          )}
                          <Text
                            strong
                            style={{
                              fontSize: 16,
                              color: "#1F2937",
                              cursor: "pointer",
                              display: "block",
                              lineHeight: 1.5,
                              transition: "color 0.2s",
                            }}
                            onClick={() => handlePostClick(item.id)}
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
                      </div>

                      <div
                        style={{
                          marginBottom: 16,
                          minHeight: 45,
                          overflow: "hidden",
                        }}
                      >
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 14,
                            lineHeight: 1.6,
                            color: "#6B7280",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            margin: 0,
                          }}
                        >
                          {stripText(item.content) || "暂无内容"}
                        </Text>
                      </div>

                      {item.tags.length > 0 && (
                        <Space wrap size={6} style={{ marginBottom: 16 }}>
                          {item.tags.slice(0, 4).map((tag) => (
                            <Tag
                              key={tag}
                              color={selectedTags.has(tag) ? "purple" : "default"}
                              style={{
                                cursor: "pointer",
                                fontSize: 12,
                                padding: "2px 8px",
                                borderRadius: 6,
                                transition: "all 0.2s ease",
                                border: selectedTags.has(tag)
                                  ? "1px solid #722ed1"
                                  : "1px solid #e8e8e8",
                                background: selectedTags.has(tag)
                                  ? "#f9f0ff"
                                  : "#fafafa",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTagClick(tag);
                              }}
                            >
                              #{tag}
                            </Tag>
                          ))}
                          {item.tags.length > 4 && (
                            <Tag
                              style={{
                                fontSize: 12,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: "#f5f5f5",
                                border: "1px solid #e8e8e8",
                              }}
                            >
                              +{item.tags.length - 4}
                            </Tag>
                          )}
                        </Space>
                      )}

                      <div style={{ marginTop: "auto" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingTop: 12,
                            borderTop: "1px solid #f0f0f0",
                          }}
                        >
                          <Space size="small" wrap>
                            <Avatar
                              size={22}
                              style={{
                                background:
                                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                fontSize: 12,
                              }}
                            >
                              {(
                                item.User?.nickname ||
                                item.User?.username ||
                                "U"
                              )[0]}
                            </Avatar>
                            <Text
                              type="secondary"
                              style={{ fontSize: 12 }}
                            >
                              {item.User?.nickname ||
                                item.User?.username ||
                                "未知"}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              ·
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {formatTime(item.createdAt)}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              · 👁️ {item.view_count || 0}
                            </Text>
                          </Space>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: 12,
                          }}
                        >
                          <Space size={16}>
                            <Text
                              type="secondary"
                              style={{ fontSize: 13, color: "#6B7280" }}
                            >
                              👍 {item.like_count || 0}
                            </Text>
                            <Text
                              type="secondary"
                              style={{ fontSize: 13, color: "#6B7280" }}
                            >
                              💬 {item.comment_count || 0}
                            </Text>
                          </Space>

                          <Button
                            size="small"
                            style={{
                              borderRadius: 16,
                              padding: "4px 12px",
                              height: 28,
                              fontSize: 12,
                              background:
                                hoverFavoriteId === item.favoriteId
                                  ? "#fff1f0"
                                  : "#fffbe6",
                              borderColor:
                                hoverFavoriteId === item.favoriteId
                                  ? "#ffccc7"
                                  : "#ffe58f",
                              color:
                                hoverFavoriteId === item.favoriteId
                                  ? "#cf1322"
                                  : "#d48806",
                              transition: "all 0.2s ease",
                              fontWeight: 500,
                            }}
                            onMouseEnter={() =>
                              setHoverFavoriteId(item.favoriteId)
                            }
                            onMouseLeave={() => setHoverFavoriteId(null)}
                            onClick={() => handleRemoveFavorite(item.favoriteId)}
                          >
                            {hoverFavoriteId === item.favoriteId
                              ? "取消收藏"
                              : "⭐ 已收藏"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {loadingMore && (
              <div
                style={{
                  textAlign: "center",
                  padding: 20,
                  background: "rgba(255, 255, 255, 0.9)",
                  borderRadius: 16,
                }}
              >
                <Spin />
                <Text
                  type="secondary"
                  style={{ marginLeft: 8, fontSize: 13 }}
                >
                  加载更多...
                </Text>
              </div>
            )}

            {!hasMore && hasFilteredItems && !searching && (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                <Text
                  type="secondary"
                  style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}
                >
                  —— 没有更多了 ——
                </Text>
              </div>
            )}
          </>
        )}
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
