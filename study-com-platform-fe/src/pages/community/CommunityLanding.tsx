import {
  Avatar,
  Button,
  Card,
  Divider,
  Input,
  List,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchCommunityPosts,
  fetchCommunityProfileSummary,
  recordCommunityVisit,
} from "../../services/communityPublic";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import CommunityFooter from "../../components/community/CommunityFooter";

const { Title, Paragraph, Text } = Typography;
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
).replace(/\/$/, "");
const IMAGE_BASE = API_BASE.replace(/\/api$/, "");
const resolveImageUrl = (src?: string) => {
  if (!src) return undefined;
  const normalized = src.replace(/\\/g, "/");
  if (normalized.startsWith("http")) return normalized;
  if (normalized.startsWith("/")) return `${IMAGE_BASE}${normalized}`;
  return `${IMAGE_BASE}/${normalized}`;
};

const CATEGORY_OPTIONS = ["学习心得", "问题求助", "经验分享", "聊天交友"];

type PostRow = {
  id: number;
  title: string;
  content: string;
  status: number;
  category?: string;
  tags?: string;
  favoriteCount?: number;
  images?: string[];
  publish_status?: number;
  createdAt?: string;
  comment_count?: number;
  like_count?: number;
  view_count?: number;
  User?: { nickname?: string; username?: string };
};

type ProfileSummary = {
  id: number;
  username: string;
  nickname?: string;
  avatar?: string;
  points: number;
  level: number;
  rank: number;
};

export default function CommunityLanding() {
  const navigate = useNavigate();
  const { token, username, role } = useAppSelector(
    (state: RootState) => state.auth,
  );
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [data, setData] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [order, setOrder] = useState<"latest" | "hot">("latest");
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const fetchingMoreRef = useRef(false);
  const searchTimerRef = useRef<number | null>(null);

  const handleSearch = () => {
    loadData(1);
  };

  const loadData = useCallback(
    async (pageNo = page, append = false) => {
      setLoading(true);
      try {
        const res = await fetchCommunityPosts({
          page: pageNo,
          pageSize,
          keyword: keyword.trim() || undefined,
          category: category || undefined,
          order: order === "hot" ? "hot" : undefined,
        });
        const nextData = res?.data || [];
        setData((prev) => (append ? [...prev, ...nextData] : nextData));
        setTotal(res?.pagination?.total || 0);
        setPage(pageNo);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
        fetchingMoreRef.current = false;
      }
    },
    [category, keyword, order, page, pageSize],
  );

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  useEffect(() => {
    const onScroll = () => {
      if (loading || fetchingMoreRef.current) return;
      const hasMore = data.length < total;
      if (!hasMore) return;
      if (
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - 120
      ) {
        fetchingMoreRef.current = true;
        loadData(page + 1, true);
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [data.length, loadData, loading, page, total]);

  useEffect(() => {
    if (token) {
      void recordCommunityVisit();
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }
    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const res = await fetchCommunityProfileSummary();
        setProfile(res?.data || null);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "加载个人信息失败");
      } finally {
        setProfileLoading(false);
      }
    };
    void loadProfile();
  }, [token]);

  useEffect(() => {
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = window.setTimeout(() => {
      loadData(1);
    }, 300);
    return () => {
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, [category, keyword, loadData, order]);

  useEffect(() => {
    if (!token) {
      setOnlineCount(null);
      return;
    }

    const streamUrl = `${API_BASE}/community/stream?token=${encodeURIComponent(
      token,
    )}`;
    const eventSource = new EventSource(streamUrl);

    const handleOnline = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { count?: number };
        if (typeof payload.count === "number") {
          setOnlineCount(payload.count);
        }
      } catch {
        return;
      }
    };

    const handleNewPost = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          authorUsername?: string;
          authorNickname?: string;
        };
        if (payload.authorUsername && payload.authorUsername === username) {
          return;
        }
        message.info("有人发新帖了，快来刷新查看吧");
      } catch {
        message.info("有人发新帖了，快来刷新查看吧");
      }
    };

    eventSource.addEventListener("online", handleOnline);
    eventSource.addEventListener("new_post", handleNewPost);

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.removeEventListener("online", handleOnline);
      eventSource.removeEventListener("new_post", handleNewPost);
      eventSource.close();
    };
  }, [token, username]);

  const hotTags = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((item) => {
      if (!item.tags) return;
      try {
        const tags = JSON.parse(item.tags) as string[];
        tags.forEach((tag) => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      } catch {
        return;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [data]);

  const hotPosts = useMemo(() => data.slice(0, 3), [data]);

  const todayNew = useMemo(() => {
    const today = new Date();
    const key = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    return data.filter((item) => {
      if (!item.createdAt) return false;
      const d = new Date(item.createdAt);
      const itemKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      return itemKey === key;
    }).length;
  }, [data]);

  const stripText = (value?: string) =>
    (value || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Space
          align="center"
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Space align="center">
            <svg
              t="1770195626963"
              className="icon"
              viewBox="0 0 1264 1024"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              style={{ marginRight: 8 }}
            >
              <path
                d="M856.786824 323.794824V0.030118h-462.607059v137.366588a293.586824 293.586824 0 0 1 192.752941 275.727059c0 126.674824-80.293647 234.526118-192.752941 275.57647V1002.315294h848.112941V323.794824h-385.505882z"
                fill="#4C86C6"
              />
              <path
                d="M293.436235 119.657412c-162.032941 0-293.406118 131.373176-293.406117 293.466353 0 144.564706 104.568471 264.613647 242.145882 288.88847v300.303059h102.520471v-300.272941a290.936471 290.936471 0 0 0 49.483294-13.312V137.396706a292.803765 292.803765 0 0 0-100.74353-17.739294"
                fill="#31EC7C"
              />
              <path
                d="M586.932706 413.123765a293.586824 293.586824 0 0 0-192.752941-275.727059v551.303529c112.459294-41.050353 192.752941-148.901647 192.752941-275.57647"
                fill="#1565B2"
              />
              <path
                d="M671.744 917.473882h107.911529V84.811294h-107.911529zM860.611765 917.473882h107.941647V408.606118h-107.941647zM1049.509647 917.473882h107.941647V408.606118h-107.941647z"
                fill="#FFFFFF"
              />
            </svg>
            <Title
              level={3}
              style={{
                margin: 0,
                background: "linear-gradient(90deg, #1890ff, #52c41a)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: "bold",
                fontSize: "24px",
              }}
            >
              学习社区
            </Title>
          </Space>
          <Space>
            <Button onClick={() => navigate("/community/posts")}>
              我的帖子
            </Button>
            <Button onClick={() => navigate("/community/favorites")}>
              我的收藏
            </Button>
            <Button onClick={() => navigate("/community/leaderboard")}>
              排行榜
            </Button>
            <Button
              onClick={() =>
                navigate(
                  role === "admin" || role === "super_admin"
                    ? "/admin/dashboard"
                    : "/student/entry",
                )
              }
            >
              {role === "admin" || role === "super_admin"
                ? "返回管理端"
                : "返回学生入口"}
            </Button>
            <Button
              onClick={() => navigate("/community/publish")}
            >
              发布新帖
            </Button>
          </Space>
        </Space>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索标题/内容"
            allowClear
            onSearch={handleSearch}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 260 }}
          />
          <Select
            placeholder="全部分类"
            allowClear
            style={{ width: 160 }}
            options={CATEGORY_OPTIONS.map((item) => ({
              label: item,
              value: item,
            }))}
            value={category}
            onChange={(value) => setCategory(value)}
          />
          <Select
            value={order}
            style={{ width: 160 }}
            options={[
              { label: "最新发布", value: "latest" },
              { label: "热门", value: "hot" },
            ]}
            onChange={(value) => setOrder(value)}
          />
          <Button type="primary" onClick={handleSearch}>
            搜索帖子
          </Button>
          <Button
            onClick={() => {
              setKeyword("");
              setCategory(undefined);
              setOrder("latest");
              loadData(1);
            }}
          >
            重置
          </Button>
        </Space>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 280px",
          gap: 16,
        }}
      >
        <div>
          <Card title="社区分类导航" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                type={!category ? "primary" : "default"}
                block
                onClick={() => {
                  setCategory(undefined);
                  loadData(1);
                }}
              >
                全部帖子
              </Button>
              {CATEGORY_OPTIONS.map((item) => (
                <Button
                  key={item}
                  type={category === item ? "primary" : "default"}
                  block
                  onClick={() => {
                    setCategory(item);
                    loadData(1);
                  }}
                >
                  {item}
                </Button>
              ))}
            </Space>
          </Card>

          <Card title="热门标签" style={{ marginBottom: 16 }}>
            <Space wrap>
              {hotTags.length ? (
                hotTags.map(([tag, count]) => (
                  <Tag
                    key={tag}
                    color="blue"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      navigate(
                        `/community/posts?keyword=${encodeURIComponent(tag)}`,
                      )
                    }
                  >
                    #{tag} ({count})
                  </Tag>
                ))
              ) : (
                <Text type="secondary">暂无标签</Text>
              )}
            </Space>
          </Card>

          <Card title="社区数据统计">
            <Space direction="vertical">
              <Text>总帖子数：{total}</Text>
              <Text>今日新增：{todayNew}</Text>
              <Text>在线用户：{onlineCount ?? "-"}</Text>
            </Space>
          </Card>
        </div>

        <div>
          <Card title="帖子列表区">
            <List
              loading={loading}
              dataSource={data}
              rowKey="id"
              renderItem={(item) => {
                const summary = stripText(item.content).slice(0, 120);
                const cover = resolveImageUrl(item.images?.[0]);
                return (
                  <List.Item style={{ transition: "transform 0.2s ease" }}>
                    <Card
                      style={{
                        width: "100%",
                        transition: "box-shadow 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: cover ? "1fr 120px" : "1fr",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <Space wrap>
                            {item.category && (
                              <Tag color="blue">{item.category}</Tag>
                            )}
                            <Link to={`/community/posts/${item.id}`}>
                              <Text strong style={{ fontSize: 16 }}>
                                {item.title}
                              </Text>
                            </Link>
                          </Space>
                          <Paragraph ellipsis={{ rows: 2 }}>
                            {summary}
                            {summary.length >= 120 ? "...【阅读更多】" : ""}
                          </Paragraph>
                          <Space wrap size="small">
                            <Avatar size={20}>
                              {
                                (item.User?.nickname ||
                                  item.User?.username ||
                                  "U")[0]
                              }
                            </Avatar>
                            <Text type="secondary">
                              {item.User?.nickname ||
                                item.User?.username ||
                                "未知"}
                            </Text>
                            <Text type="secondary">·</Text>
                            <Text type="secondary">
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleString()
                                : "-"}
                            </Text>
                            <Text type="secondary">
                              · 阅读量：{item.view_count || 0}
                            </Text>
                          </Space>
                          {item.tags && (
                            <Space wrap>
                              {(() => {
                                try {
                                  return JSON.parse(item.tags);
                                } catch {
                                  return [];
                                }
                              })().map((tag: string) => (
                                <Tag
                                  key={tag}
                                  style={{ cursor: "pointer" }}
                                  onClick={() =>
                                    navigate(
                                      `/community/posts?keyword=${encodeURIComponent(tag)}`,
                                    )
                                  }
                                >
                                  #{tag}
                                </Tag>
                              ))}
                            </Space>
                          )}
                          <Divider style={{ margin: "8px 0" }} />
                          <Space>
                            <Text>👍 {item.like_count || 0}</Text>
                            <Text>💬 {item.comment_count || 0}</Text>
                            <Text>⭐ {item.favoriteCount || 0}</Text>
                          </Space>
                        </Space>
                        {cover && (
                          <img
                            src={cover}
                            alt={item.title}
                            style={{
                              width: 120,
                              height: 90,
                              objectFit: "cover",
                              borderRadius: 8,
                            }}
                          />
                        )}
                      </div>
                    </Card>
                  </List.Item>
                );
              }}
            />
            {data.length < total && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <Button
                  loading={loading}
                  onClick={() => loadData(page + 1, true)}
                >
                  加载更多
                </Button>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card
            title="个人信息卡"
            style={{ marginBottom: 16 }}
            loading={profileLoading}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              <Avatar size={64} src={resolveImageUrl(profile?.avatar)}>
                {(profile?.nickname || profile?.username || username || "U")[0]}
              </Avatar>
              <Text>
                {profile?.nickname || profile?.username || username || "未登录"}
              </Text>
              <Text type="secondary">当前等级：Lv.{profile?.level ?? 1}</Text>
              <Text type="secondary">总积分：{profile?.points ?? 0}</Text>
              <Text type="secondary">
                社区排名：{profile?.rank ? `#${profile.rank}` : "-"}
              </Text>
              <Button
                onClick={() =>
                  navigate(
                    role === "admin" || role === "super_admin"
                      ? "/admin/dashboard"
                      : "/student/entry",
                  )
                }
              >
                {role === "admin" || role === "super_admin"
                  ? "返回管理端"
                  : "返回学生入口"}
              </Button>
            </Space>
          </Card>

          <Card title="我的今日" style={{ marginBottom: 16 }}>
            <Space direction="vertical">
              <Text>发帖：0/3篇</Text>
              <Text>评论：2/20条</Text>
              <Text>获赞：+5</Text>
            </Space>
          </Card>

          <Card title="今日热门">
            <Space direction="vertical">
              {hotPosts.length ? (
                hotPosts.map((item) => (
                  <Link key={item.id} to={`/community/posts/${item.id}`}>
                    • {item.title}
                  </Link>
                ))
              ) : (
                <Text type="secondary">暂无热门内容</Text>
              )}
            </Space>
          </Card>
        </div>
      </div>
      <CommunityFooter />
    </div>
  );
}
