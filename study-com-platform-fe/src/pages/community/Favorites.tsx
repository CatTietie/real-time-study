import {
  Avatar,
  Button,
  Card,
  Divider,
  List,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteFavorite, fetchFavorites } from "../../services/communityPublic";
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
  tags?: string;
  images?: string[];
  createdAt?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  User?: { nickname?: string; username?: string };
};

export default function Favorites() {
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const loadFavorites = async (pageNo = page) => {
    setLoading(true);
    try {
      const res = await fetchFavorites({
        page: pageNo,
        pageSize,
      });
      setFavorites(res?.data || []);
      setTotal(res?.pagination?.total || 0);
      setPage(pageNo);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载收藏失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites(1);
  }, []);

  const items = useMemo(() => {
    return favorites
      .map((fav) => {
        if (!fav.Post) return null;
        const favoriteAt = fav.createdAt || fav.created_at;
        const postCreatedAt = fav.Post.createdAt || fav.Post.created_at;
        return {
          favoriteId: fav.id,
          favoriteAt,
          ...fav.Post,
          createdAt: postCreatedAt,
          images: parseImages(fav.Post.images),
        } as FavoritePost;
      })
      .filter(Boolean) as FavoritePost[];
  }, [favorites]);

  const stripText = (value?: string) =>
    (value || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

  return (
    <div className="page-container">
      <Title level={3}>我的收藏</Title>
      <Card title="收藏帖子列表">
        <List
          loading={loading}
          dataSource={items}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p) => loadFavorites(p),
          }}
          renderItem={(item) => {
            const summary = stripText(item.content).slice(0, 120);
            const cover = resolveImageUrl(item.images?.[0]);
            return (
              <List.Item>
                <Card style={{ width: "100%" }}>
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
                        <Tag color="gold">已收藏</Tag>
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
                          {item.User?.nickname || item.User?.username || "未知"}
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
                        {item.favoriteAt && (
                          <Text type="secondary">
                            · 收藏于：
                            {new Date(item.favoriteAt).toLocaleString()}
                          </Text>
                        )}
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
                            <Tag key={tag}>#{tag}</Tag>
                          ))}
                        </Space>
                      )}
                      <Divider style={{ margin: "8px 0" }} />
                      <Space wrap>
                        <Text>👍 {item.like_count || 0}</Text>
                        <Text>💬 {item.comment_count || 0}</Text>
                        <Button
                          size="small"
                          danger
                          onClick={async () => {
                            await deleteFavorite(item.favoriteId);
                            loadFavorites(page);
                          }}
                        >
                          取消收藏
                        </Button>
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
      </Card>
      <CommunityFooter />
    </div>
  );
}
