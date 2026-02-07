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

  // 处理点赞逻辑
  const handleLikeClick = (postId: number, currentLikeCount?: number) => {
    const newLikeCount = currentLikeCount ? currentLikeCount + 1 : 1;
    setData(prev =>
      prev.map(post =>
        post.id === postId
          ? { ...post, like_count: newLikeCount }
          : post
      )
    );
    // TODO: 调用API更新数据库中的点赞数
  };

  // 处理评论点击逻辑
  const handleCommentClick = (postId: number) => {
    navigate(`/community/posts/${postId}`);
  };

  // 处理收藏逻辑
  const handleFavoriteClick = (postId: number, currentFavoriteCount?: number) => {
    const newFavoriteCount = currentFavoriteCount ? currentFavoriteCount + 1 : 1;
    setData(prev =>
      prev.map(post =>
        post.id === postId
          ? { ...post, favoriteCount: newFavoriteCount }
          : post
      )
    );
    // TODO: 调用API更新数据库中的收藏数
  };

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Space
            align="center"
            style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Space align="center">
            <svg
                k1="1770195626963"
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
                  fontSize: "30px",
                }}
            >
              学习社区
            </Title>
          </Space>
          <Space align="center" style={{ gap: 16 }}>
            <Input.Search
                placeholder="搜索标题/内容"
                allowClear
                onSearch={handleSearch}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 260 }}
            />
            <Button onClick={() => navigate("/community/posts")}>我的帖子</Button>
            <Button onClick={() => navigate("/community/favorites")}>我的收藏</Button>
            <Button onClick={() => navigate("/community/leaderboard")}>排行榜</Button>
            <Button
                onClick={() =>
                    navigate(
                        role === "admin" || role === "super_admin"
                            ? "/admin/dashboard"
                            : "/student/entry"
                    )
                }
            >
              {role === "admin" || role === "super_admin"
                  ? "返回管理端"
                  : "返回学生入口"}
            </Button>
            <Button
                type="primary"
                onClick={() => navigate("/community/publish")}
                icon={
                  <svg
                      t="1770209095246"
                      className="icon"
                      viewBox="0 0 1024 1024"
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                  >
                    <path
                        d="M744.6016 148.9152l-159.9488 159.2832-62.5408 62.2336-56.3712 56.064c-16.9728 16.9216-64.4352 62.976-75.776 74.496-11.3152 11.52-18.5088 18.816-21.6064 21.888-7.1936 7.168-12.7232 13.696-16.5888 19.6096-3.84 5.888-7.3472 12.416-10.4192 19.584-2.56 4.608-5.9136 13.056-10.0352 25.344s-8.3712 25.728-12.7488 40.3456c-4.352 14.592-8.4992 28.672-12.3392 42.24-3.8656 13.568-6.3232 23.936-7.3472 31.1296-2.048 13.312-0.768 22.784 3.84 28.416 4.6592 5.632 13.9264 7.68 27.8016 6.144 6.7072-1.024 16.8704-3.328 30.5152-6.912 13.6448-3.584 28.032-7.808 43.2128-12.672a1083.904 1083.904 0 0 0 43.648-14.976c13.8752-5.12 24.4224-9.472 31.6416-13.056 7.1936-3.072 14.1568-7.168 20.8384-12.288 6.7072-5.12 12.6208-9.984 17.7664-14.592 2.048-1.536 8.4992-7.7056 19.3024-18.4576s24.448-24.4736 40.9088-41.1136c16.4608-16.64 68.3008-66.7904 88.8832-86.784l61.7728-62.208 161.2032-162.8928-145.6128-140.8zM640.512 487.296l-38.6048 37.1712c-12.8768 11.9296-45.2864 41.856-55.552 51.7888-10.3168 9.9328-18.8416 18.1248-25.6 24.5504a203.52 203.52 0 0 1-23.168 19.712c-4.1728 3.072-8.5248 5.504-13.0304 7.3472a216.3968 216.3968 0 0 1-19.7888 7.808c-8.704 3.0464-17.7664 6.016-27.264 8.9344-9.472 2.8928-18.5088 5.4272-27.0336 7.552a212.0704 212.0704 0 0 1-19.072 4.1472c-8.6784 0.9216-14.464-0.3072-17.3568-3.6608-2.8928-3.3792-3.712-9.0368-2.4064-16.9728 0.64-4.3008 2.1504-10.496 4.5824-18.5856 2.4064-8.1152 4.9664-16.512 7.7056-25.2416 2.7392-8.704 5.376-16.7168 7.9616-24.064 2.5856-7.3472 4.6848-12.3904 6.272-15.1296 1.9456-4.3008 4.096-8.192 6.528-11.6992 2.4064-3.5072 5.888-7.424 10.368-11.6992 1.9456-1.8432 6.4512-6.1952 13.5168-13.056 7.0912-6.912 304.3328-291.5072 304.3328-291.5072l91.264 86.144-183.6544 176.4608z"
                        fill="#ffffff"
                        p-id="7693"
                    ></path>
                    <path
                        d="M938.496 396.8256v373.1968-0.8704 30.3616c0 78.6432-66.944 142.6432-149.1968 142.6432H235.4432c-82.2528 0-149.2224-64-149.2224-142.6432V251.5456v2.0992-29.4912c0-78.6688 66.9696-142.6432 149.2224-142.6432h365.2864L701.7728 0.0512h-33.3056V0H235.4432C109.9776 0 7.168 94.72 1.2288 213.3248h-0.256V810.3424h0.256c5.9392 118.5792 108.7488 213.2992 234.2144 213.2992h553.856c125.4656 0 228.2752-94.72 234.2144-213.2992h0.256V316.7744l-85.248 80.0512zM918.2976 33.3568a47.3344 47.3344 0 0 0-13.824-2.5088c4.7104 0.3072 9.2928 1.152 13.824 2.5088z"
                        fill="#ffffff"
                        p-id="7694"
                    ></path>
                    <path
                        d="M1010.2784 136.0384c0.8448-14.3872-3.1488-30.208-11.5712-45.312a118.1952 118.1952 0 0 0-23.1424-29.1072c-17.3312-16-37.76-25.984-57.2672-29.44a110.1312 110.1312 0 0 0-13.824-1.3568h-2.3296a84.736 84.736 0 0 0-53.888 18.688c-7.0656 5.7344-15.872 13.5424-26.4704 23.424-10.5728 9.9072-19.712 18.3552-27.392 25.344l144.8448 140.8c4.5056-3.84 9.2928-8.32 14.4384-13.4144 4.48-4.4544 9.7792-9.5744 15.872-15.3088 6.0672-5.7344 12.9792-12.4416 20.6592-20.096 7.0656-7.68 12.1856-15.6416 15.4112-23.936a68.6592 68.6592 0 0 0 4.6592-30.2848z m-36.6848 19.84a51.9424 51.9424 0 0 1-10.5472 16.384c-5.248 5.2224-9.984 9.8048-14.1312 13.7216-4.1728 3.9424-7.7824 7.424-10.8544 10.496 3.072-2.6368-3.5072 3.4816 0 0l-100.0192-95.3856c5.2736-4.7872 2.56-2.3296 9.8048-9.088 7.2192-6.784 13.2608-12.1344 18.0736-16.0512a57.9584 57.9584 0 0 1 36.864-12.8 75.264 75.264 0 0 1 11.0592 0.9472 79.36 79.36 0 0 1 39.168 20.1472c6.656 6.1184 11.9296 12.9024 15.872 19.9168 5.76 10.3424 8.4736 21.1456 7.9104 31.0016l0.0768 3.6864c0 5.6832-1.1008 11.3664-3.2768 17.024z"
                        fill="#ffffff"
                        p-id="7695"
                    ></path>
                  </svg>
                }
            />
          </Space>
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
          <Card 
            title={
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "linear-gradient(90deg, #1890ff, #52c41a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
                <svg
                  y="1770196569486"
                  className="icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  style={{ marginRight: 8 }}
                >
                  <path
                    d="M221.13 598m55.4 0l474.5 0q55.4 0 55.4 55.4l0 182.19q0 55.4-55.4 55.4l-474.5 0q-55.4 0-55.4-55.4l0-182.19q0-55.4 55.4-55.4Z"
                    fill="#0F9FF7"
                  ></path>
                  <path
                    d="M513.77 863.24c-5.04 0-9.63-2.91-11.77-7.48L311.5 449.87c-16.36-34.85-23.6-73.25-20.96-111.03 2.51-35.87 13.85-71.2 32.78-102.16 18.75-30.67 44.68-56.58 74.99-74.94 32.44-19.64 68.47-30.28 107.08-31.61 5.55-0.19 11.21-0.19 16.76 0 22.72 0.78 44.89 4.9 65.9 12.22 6.78 2.36 10.36 9.78 7.99 16.56-2.36 6.78-9.78 10.36-16.56 7.99-18.54-6.47-38.14-10.1-58.24-10.79-4.96-0.17-10.01-0.17-14.96 0-34.12 1.18-65.92 10.55-94.51 27.87-26.77 16.21-49.69 39.12-66.28 66.26-16.76 27.42-26.8 58.68-29.02 90.41-2.37 33.85 3.87 66.88 18.56 98.17l178.73 380.81 178.73-380.81c16.99-36.2 22.76-75.91 16.67-114.84-5.8-37.14-21.92-71.86-46.61-100.41-4.7-5.43-4.1-13.64 1.33-18.34 5.43-4.7 13.64-4.1 18.34 1.33 27.88 32.24 46.08 71.45 52.64 113.41 6.89 44.07 0.38 88.98-18.83 129.9l-190.5 405.89a13.01 13.01 0 0 1-11.77 7.48z"
                    fill="#303030"
                  ></path>
                  <path
                    d="M513.77 455c-45.77 0-83-37.23-83-83s37.23-83 83-83 83 37.23 83 83-37.23 83-83 83z m0-140c-31.43 0-57 25.57-57 57s25.57 57 57 57 57-25.57 57-57-25.57-57-57-57z"
                    fill="#303030"
                  ></path>
                </svg>
                社区分类导航
              </span>
            } 
            style={{ marginBottom: 16 }}
          >
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

          <Card 
            title={
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "linear-gradient(90deg, #1890ff, #52c41a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
                <svg
                  d="1770203299976"
                  className="icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  style={{ marginRight: 8 }}
                >
                  <path
                    d="M285 270h604v419H285z"
                    fill="#FEC200"
                  ></path>
                  <path
                    d="M808.72 763h-604c-7.18 0-13-5.82-13-13V331c0-7.18 5.82-13 13-13h604c7.18 0 13 5.82 13 13v419c0 7.18-5.82 13-13 13z m-591-26h578V344h-578v393z"
                    fill="#303030"
                  ></path>
                  <path
                    d="M357.66 340.69c-3.33 0-6.65-1.27-9.19-3.81-5.08-5.08-5.08-13.31 0-18.38l151.49-151.49c5.08-5.08 13.31-5.08 18.38 0l146.62 146.62c5.08 5.08 5.08 13.31 0 18.38s-13.31 5.08-18.38 0L509.15 194.58l-142.3 142.3a12.964 12.964 0 0 1-9.19 3.81zM412.57 665.1c-13.87 0-27.96-1.91-41.95-5.92-31.67-9.08-58.98-27.66-78.97-53.73-19.59-25.56-30.48-55.99-31.49-88.03-0.23-7.18 5.41-13.18 12.58-13.4 7.18-0.22 13.18 5.41 13.4 12.58 0.84 26.56 9.88 51.81 26.13 73.03 16.57 21.62 39.22 37.03 65.49 44.56 67.05 19.21 137.24-19.71 156.45-86.76 19.21-67.05-19.71-137.24-86.76-156.45-32.48-9.31-66.65-5.41-96.19 10.98-6.28 3.48-14.19 1.22-17.67-5.06-3.48-6.28-1.21-14.19 5.06-17.67 35.62-19.75 76.81-24.46 115.97-13.24 80.84 23.16 127.76 107.77 104.59 188.61-19.16 66.85-80.34 110.51-146.66 110.51z m0.02-61.82a90.48 90.48 0 0 1-24.94-3.52c-48.07-13.77-75.97-64.09-62.2-112.16 13.77-48.07 64.09-75.97 112.16-62.2 48.07 13.77 75.97 64.09 62.2 112.16-11.39 39.76-47.78 65.72-87.21 65.72z m0.06-155.39c-28.13 0-54.08 18.52-62.21 46.88-9.82 34.29 10.08 70.18 44.37 80a64.49 64.49 0 0 0 17.79 2.51c28.13 0 54.08-18.52 62.21-46.88 9.82-34.29-10.08-70.18-44.37-80a64.49 64.49 0 0 0-17.79-2.51z"
                    fill="#303030"
                  ></path>
                </svg>
                社区数据统计
              </span>
            }
          >
            <Space direction="vertical">
              <Text>总帖子数：{total}</Text>
              <Text>今日新增：{todayNew}</Text>
              <Text>在线用户：{onlineCount ?? "-"}</Text>
            </Space>
          </Card>
        </div>

        <div>
          <Card>
            <List
                loading={loading}
                dataSource={data}
                rowKey="id"
                renderItem={(item) => {
                  const summary = stripText(item.content).slice(0, 120);
                  const cover = resolveImageUrl(item.images?.[0]);
                  return (
                      <List.Item
                          style={{
                            transition: "transform 0.2s ease",
                            padding: "16px",
                            border: "1px solid #f0f0f0",
                            borderRadius: "8px",
                            marginBottom: "16px",
                            backgroundColor: "#fff",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                            cursor: "pointer"
                          }}
                          onClick={() => navigate(`/community/posts/${item.id}`)}
                      >
                        <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 16,
                              alignItems: "flex-start",
                            }}
                        >
                          <Space direction="vertical" style={{ width: "100%", gap: 12 }}>
                            {/* 用户信息模块 */}
                            <Space wrap size="small">
                              <Avatar size={40}>
                                {(item.User?.nickname || item.User?.username || "U")[0]}
                              </Avatar>
                              <Text strong style={{ fontSize: 16, fontWeight: 'bold' }}>
                                {item.User?.nickname || item.User?.username || "未知"}
                              </Text>
                              <Text type="secondary">·</Text>
                              <Text type="secondary">
                                {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                              </Text>
                              {item.updated_at && (
                                  <>
                                    <Text type="secondary">·</Text>
                                    <Text type="secondary">
                                      修改于：{new Date(item.updated_at).toLocaleString()}
                                    </Text>
                                  </>
                              )}
                              <Text type="secondary">·</Text>
                              <Text type="secondary">
                                阅读量：{item.view_count || 0}
                              </Text>
                            </Space>

                            {/* 分类标签 */}
                            {item.category && (
                                <Tag color="blue" style={{ marginBottom: 4 }}>
                                  {item.category}
                                </Tag>
                            )}
                            <Text strong style={{ fontSize: 18, display: "block" }}>
                              {item.title}
                            </Text>

                            {/* 正文摘要 */}
                            <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8, margin: 0 }}>
                              {summary}
                              {summary.length >= 120 ? "...【阅读更多】" : ""}
                            </Paragraph>

                            {/* 标签模块 */}
                            {item.tags && (
                                <Space wrap style={{ marginBottom: 8, gap: 8 }}>
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
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(
                                                `/community/posts?keyword=${encodeURIComponent(tag)}`,
                                            );
                                          }}
                                      >
                                        #{tag}
                                      </Tag>
                                  ))}
                                </Space>
                            )}

                            {/* 图片显示在文字结束的下方，靠左排列 */}
                            {cover && (
                                <img
                                    src={cover}
                                    alt={item.title}
                                    style={{
                                      width: 120,
                                      height: 90,
                                      objectFit: "cover",
                                      borderRadius: 8,
                                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                      alignSelf: "flex-start"
                                    }}
                                />
                            )}

                            {/* 互动区 */}
                            <div onClick={(e) => e.stopPropagation()}>
                              <Space size="middle">
                                <Button
                                  type="text"
                                  icon={<span>👍</span>}
                                  onClick={() => handleLikeClick(item.id, item.like_count)}
                                >
                                  {item.like_count || 0}
                                </Button>
                                <Button
                                  type="text"
                                  icon={<span>💬</span>}
                                  onClick={() => handleCommentClick(item.id)}
                                >
                                  {item.comment_count || 0}
                                </Button>
                                <Button
                                  type="text"
                                  icon={<span>⭐</span>}
                                  onClick={() => handleFavoriteClick(item.id, item.favoriteCount)}
                                >
                                  {item.favoriteCount || 0}
                                </Button>
                              </Space>
                            </div>
                          </Space>
                        </div>
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
            title={
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "linear-gradient(90deg, #1890ff, #52c41a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
                <svg
                  r="1770203232493"
                  className="icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  style={{ marginRight: 8 }}
                >
                  <path
                    d="M64 543.51h896v152.51H64z"
                    fill="#0F9FF7"
                  ></path>
                  <path
                    d="M946.09 776.3c-7.18 0-13-5.82-13-13V247H168.57v503.3h378c7.18 0 13 5.82 13 13s-5.82 13-13 13h-391c-7.18 0-13-5.82-13-13V234c0-7.18 5.82-13 13-13h790.52c7.18 0 13 5.82 13 13v529.3c0 7.18-5.82 13-13 13z"
                    fill="#303030"
                  ></path>
                  <path
                    d="M456.49 507.17H273.7c-7.18 0-13-5.82-13-13V311.38c0-7.18 5.82-13 13-13h182.79c7.18 0 13 5.82 13 13v182.79c0 7.18-5.82 13-13 13z m-169.79-26h156.79V324.38H286.7v156.79zM832.75 368.81H534.99c-7.18 0-13-5.82-13-13s5.82-13 13-13h297.76c7.18 0 13 5.82 13 13s-5.82 13-13 13zM720.02 461.89H534.99c-7.18 0-13-5.82-13-13s5.82-13 13-13h185.03c7.18 0 13 5.82 13 13s-5.82 13-13 13z"
                    fill="#303030"
                  ></path>
                </svg>
                个人信息卡
              </span>
            }
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

          <Card 
            title={
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "linear-gradient(90deg, #1890ff, #52c41a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
                <svg
                  d="1770203635001"
                  className="icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  style={{ marginRight: 8 }}
                >
                  <path
                    d="M699 480.28c0-114.98-93.1-208.22-208.03-208.43-114.9-0.22-208.84 93.53-208.84 208.43 0 45.96 14.88 88.44 40.08 122.9 24.39 33.34 37.49 73.59 37.49 114.9v0.92h261.73v-0.92c0-41.61 13.58-81.93 38-115.61C684.32 568.14 699 525.93 699 480.28z"
                    fill="#F4B840"
                  ></path>
                  <path
                    d="M685.71 726.86H357.43c-7.18 0-13-5.82-13-13v-1.16c0-49.45-15.39-96.63-44.51-136.44-34.53-47.21-52.78-103.17-52.78-161.82 0-73.18 28.67-142.09 80.74-194.06C379.82 168.54 448.6 140 521.58 140h0.53c73.19 0.14 141.98 28.75 193.7 80.55 51.72 51.81 80.21 120.67 80.21 193.88 0 58.24-18.02 113.88-52.11 160.89-29.56 40.77-45.19 88.28-45.19 137.38v1.15c0 7.18-5.82 13-13 13z m-315.55-26h302.82c2.32-50.38 19.44-98.83 49.87-140.79 30.85-42.55 47.16-92.91 47.16-145.63 0-66.28-25.79-128.61-72.61-175.51-46.82-46.9-109.09-72.8-175.35-72.92h-0.48c-66.05 0-128.3 25.83-175.33 72.78-47.14 47.05-73.1 109.44-73.1 175.66 0 53.1 16.52 103.75 47.77 146.47 30.07 41.11 46.98 89.27 49.26 139.95z"
                    fill="#303030"
                  ></path>
                  <path
                    d="M685.71 884.39H357.43c-7.18 0-13-5.82-13-13V713.86c0-7.18 5.82-13 13-13s13 5.82 13 13v144.53h302.28V713.86c0-7.18 5.82-13 13-13s13 5.82 13 13v157.53c0 7.18-5.82 13-13 13z"
                    fill="#303030"
                  ></path>
                  <path
                    d="M485.25 709.54c-7.18 0-13-5.82-13-13V506.76h-56.83c-7.18 0-13-5.82-13-13v-72.62c0-7.18 5.82-13 13-13h106.14c7.18 0 13 5.82 13 13s-5.82 13-13 13h-93.14v46.62h56.83c7.18 0 13 5.82 13 13v202.78c0 7.18-5.82 13-13 13zM557.88 709.54c-7.18 0-13-5.82-13-13V493.76c0-7.18 5.82-13 13-13h56.83v-59.62c0-7.18 5.82-13 13-13s13 5.82 13 13v72.62c0 7.18-5.82 13-13 13h-56.83v189.78c0 7.18-5.82 13-13 13z"
                    fill="#303030"
                  ></path>
                </svg>
                我的今日
              </span>
            } 
            style={{ marginBottom: 16 }}
          >
            <Space direction="vertical">
              <Text>发帖：0/3篇</Text>
              <Text>评论：2/20条</Text>
              <Text>获赞：+5</Text>
            </Space>
          </Card>

        </div>
      </div>
      <CommunityFooter />
    </div>
  );
}
