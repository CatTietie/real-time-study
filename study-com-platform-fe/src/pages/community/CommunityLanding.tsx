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
<<<<<<< HEAD
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg 
              t="1770190911611" 
              className="icon" 
              viewBox="0 0 1264 1024" 
              version="1.1" 
              xmlns="http://www.w3.org/2000/svg" 
              p-id="3104" 
              width="32" 
              height="32"
            >
              <path 
                d="M856.786824 323.794824V0.030118h-462.607059v137.366588a293.586824 293.586824 0 0 1 192.752941 275.727059c0 126.674824-80.293647 234.526118-192.752941 275.57647V1002.315294h848.112941V323.794824h-385.505882z" 
                fill="#4C86C6" 
                p-id="3105"
              ></path>
              <path 
                d="M293.436235 119.657412c-162.032941 0-293.406118 131.373176-293.406117 293.466353 0 144.564706 104.568471 264.613647 242.145882 288.88847v300.303059h102.520471v-300.272941a290.936471 290.936471 0 0 0 49.483294-13.312V137.396706a292.803765 292.803765 0 0 0-100.74353-17.739294" 
                fill="#31EC7C" 
                p-id="3106"
              ></path>
              <path 
                d="M586.932706 413.123765a293.586824 293.586824 0 0 0-192.752941-275.727059v551.303529c112.459294-41.050353 192.752941-148.901647 192.752941-275.57647" 
                fill="#1565B2" 
                p-id="3107"
              ></path>
              <path 
                d="M671.744 917.473882h107.911529V84.811294h-107.911529zM860.611765 917.473882h107.941647V408.606118h-107.941647zM1049.509647 917.473882h107.941647V408.606118h-107.941647z" 
                fill="#FFFFFF" 
                p-id="3108"
              ></path>
            </svg>
            <Title 
              level={3} 
              style={{ 
                margin: 0, 
                background: 'linear-gradient(90deg, #1890ff, #52c41a)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent', 
                fontWeight: 'bold',
                letterSpacing: '1px'
=======
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
                fontSize: "30px",
>>>>>>> c0e9c666a324276360202ee27851606b10dd1ce9
              }}
            >
              学习社区
            </Title>
<<<<<<< HEAD
          </div>
=======
          </Space>
>>>>>>> c0e9c666a324276360202ee27851606b10dd1ce9
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
          <Card 
            title={
<<<<<<< HEAD
              <Space align="center">
                <svg 
                  t="1770191878892" 
                  className="icon" 
                  viewBox="0 0 1024 1024" 
                  version="1.1" 
                  xmlns="http://www.w3.org/2000/svg" 
                  p-id="5912" 
                  width="20" 
                  height="20"
                >
                  <path d="M513.3824 512m-451.8912 0a451.8912 451.8912 0 1 0 903.7824 0 451.8912 451.8912 0 1 0-903.7824 0Z" fill="#025FFC" p-id="5913"></path>
                  <path d="M513.3824 495.8208m-398.3872 0a398.3872 398.3872 0 1 0 796.7744 0 398.3872 398.3872 0 1 0-796.7744 0Z" fill="#0C7AF2" p-id="5914"></path>
                  <path d="M513.3824 486.9632m-354.9184 0a354.9184 354.9184 0 1 0 709.8368 0 354.9184 354.9184 0 1 0-709.8368 0Z" fill="#3489FA" p-id="5915"></path>
                  <path d="M513.3824 478.72m-304.3328 0a304.3328 304.3328 0 1 0 608.6656 0 304.3328 304.3328 0 1 0-608.6656 0Z" fill="#3F91FC" p-id="5916"></path>
                  <path d="M727.0912 286.4128c-30.2592-29.3376-73.7792-39.0144-113.6128-25.2416L290.2528 372.992l-0.1536 0.0512C243.8656 390.0416 214.784 434.176 217.6 483.584c2.8672 50.1248 37.6832 91.136 86.6816 102.0928l103.68 23.1424 33.6896 114.176c13.9264 47.2064 56.3712 79.2064 105.8304 79.616h0.6656c48.8448 0 91.4432-31.3344 105.984-77.9776l101.632-325.4272c12.5952-40.2432 1.5872-83.456-28.672-112.7936z m-174.6944 180.0704l-6.5536 21.0432c-3.9424-5.12-8.3456-9.8816-13.1072-14.2336l19.6608-6.8096z" fill="#025FFC" p-id="5917"></path>
                  <path d="M548.1984 771.8912h-0.6656c-35.6352-0.256-66.3552-23.3984-76.3904-57.6l-38.8096-131.5328-121.344-27.0848c-35.4304-7.8848-60.6208-37.5808-62.72-73.8304-2.048-36.2496 19.6096-68.608 53.9136-80.4864l321.3312-111.1552c28.8256-9.984 60.3136-2.9696 82.176 18.2784s29.8496 52.48 20.736 81.6128l-101.632 325.4272c-10.496 33.7408-41.216 56.3712-76.5952 56.3712zM446.72 470.5792l28.672 6.4a80.2816 80.2816 0 0 1 59.5456 55.6544l14.08 47.7696 50.8416-162.7648-153.1392 52.9408z m-107.6736 37.2224s0.0512 0 0 0z" fill="#F7BC00" p-id="5918"></path>
                  <path d="M548.1984 748.8512h-0.4608c-25.3952-0.2048-47.3088-16.6912-54.4768-41.0624L450.56 563.2l-134.5536-30.0032c-25.2928-5.632-43.264-26.7776-44.7488-52.6336-1.4848-25.856 13.9776-48.9472 38.4512-57.3952l321.3312-111.1552c20.5312-7.1168 43.008-2.1504 58.624 13.0048 15.616 15.1552 21.2992 37.4272 14.7968 58.2144l-101.632 325.4272c-7.4752 24.064-29.44 40.192-54.6304 40.192zM362.3936 475.3408l107.9808 24.1152c20.2752 4.5056 36.5568 19.712 42.496 39.68l35.584 120.5248 87.04-278.784-273.1008 94.464z m-30.8736 10.7008z" fill="#FFD029" p-id="5919"></path>
                  <path d="M548.1984 733.4912H547.84a41.73312 41.73312 0 0 1-39.8848-30.0544l-44.2368-149.76c-0.6144-2.0992-2.3552-3.7376-4.5056-4.1984l-139.8784-31.232c-18.4832-4.1472-31.6416-19.6096-32.7168-38.5536-1.0752-18.944 10.24-35.7888 28.16-42.0352l321.3312-111.1552a41.8304 41.8304 0 0 1 42.9056 9.5232 41.8048 41.8048 0 0 1 10.8544 42.5984l-101.632 325.4272a41.79968 41.79968 0 0 1-40.0384 29.44z m-221.696-261.9904c-3.584 1.2288-4.1984 3.9936-4.096 6.0928 0.1024 2.0992 1.024 4.7616 4.7616 5.5808l139.8784 31.232c14.848 3.328 26.7776 14.4384 31.0784 29.0304l44.2368 149.76c1.0752 3.584 3.7376 4.352 5.7856 4.352 1.9968 0.1024 4.7616-0.7168 5.8368-4.2496l101.632-325.4272c0.9728-3.1232-0.5632-5.2224-1.5872-6.1952-1.024-0.9728-3.1744-2.4576-6.2464-1.3824L326.5024 471.5008z" fill="#FFE576" p-id="5920"></path>
                </svg>
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>社区分类导航</span>
              </Space>
=======
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
                  t="1770196569486"
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
>>>>>>> c0e9c666a324276360202ee27851606b10dd1ce9
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
                  t="1770196690886"
                  className="icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  style={{ marginRight: 8 }}
                >
                  <path
                    d="M491.65 479.85m55.4 0l273.94 0q55.4 0 55.4 55.4l0 274.35q0 55.4-55.4 55.4l-273.94 0q-55.4 0-55.4-55.4l0-274.35q0-55.4 55.4-55.4Z"
                    fill="#ED6663"
                  ></path>
                  <path
                    d="M538.1 631.65c-3.33 0-6.65-1.27-9.19-3.81L173.28 272.22c-5.08-5.08-5.08-13.31 0-18.38l61.38-61.38c5.08-5.08 13.31-5.08 18.38 0 5.08 5.08 5.08 13.31 0 18.38l-52.19 52.19 337.24 337.24 43-42.99-271.15-271.15c-5.08-5.08-5.08-13.31 0-18.38 5.08-5.08 13.31-5.08 18.38 0l280.34 280.34a12.988 12.988 0 0 1 0 18.38l-61.38 61.38a12.964 12.964 0 0 1-9.19 3.81z"
                    fill="#303030"
                  ></path>
                  <path
                    d="M656.42 687.97c-1.83 0-3.68-0.39-5.42-1.18l-114.53-52.52c-6.53-2.99-9.39-10.71-6.4-17.24 2.99-6.53 10.71-9.39 17.24-6.4l82.37 37.77-38.19-81.84c-3.04-6.51-0.22-14.24 6.28-17.28 6.5-3.03 14.24-0.22 17.28 6.28l53.15 113.9a12.997 12.997 0 0 1-2.56 14.66 12.99 12.99 0 0 1-9.23 3.84zM181.84 275.4c-3.33 0-6.65-1.27-9.19-3.81l-18.67-18.67c-10.65-10.65-16.52-24.82-16.52-39.88s5.87-29.23 16.52-39.88c10.65-10.65 24.82-16.52 39.88-16.52s29.23 5.87 39.88 16.52l18.67 18.67c5.08 5.08 5.08 13.31 0 18.38-5.08 5.08-13.31 5.08-18.38 0l-18.67-18.67c-5.74-5.74-13.38-8.9-21.5-8.9s-15.76 3.16-21.5 8.9-8.9 13.38-8.9 21.5 3.16 15.76 8.9 21.5l18.67 18.67c5.08 5.08 5.08 13.31 0 18.38a12.964 12.964 0 0 1-9.19 3.81zM710.19 785.19H351.63c-7.18 0-13-5.82-13-13s5.82-13 13-13h358.56c7.18 0 13 5.82 13 13s-5.82 13-13 13z"
                    fill="#303030"
                  ></path>
                </svg>
                热门标签
              </span>
            } 
            style={{ marginBottom: 16 }}
          >
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

          <Card 
            title={
              <span
                style={{
                  background: "linear-gradient(90deg, #1890ff, #52c41a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
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
          <Card 
            title={
              <span
                style={{
                  background: "linear-gradient(90deg, #1890ff, #52c41a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
                帖子列表区
              </span>
            }
          >
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
            title={
              <span
                style={{
                  background: "linear-gradient(90deg, #1890ff, #52c41a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
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
                  background: "linear-gradient(90deg, #1890ff, #52c41a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
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

          <Card 
            title={
              <span
                style={{
                  background: "linear-gradient(90deg, #1890ff, #52c41a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: "bold",
                  fontSize: "18px",
                }}
              >
                今日热门
              </span>
            }
          >
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
