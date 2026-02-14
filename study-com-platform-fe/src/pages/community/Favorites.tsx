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
import { Link, useNavigate } from "react-router-dom";
import { deleteFavorite, fetchFavorites } from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";
import { HomeOutlined } from "@ant-design/icons";

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
  const navigate = useNavigate();
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
    <div
      className="page-container"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "24px 16px",
        position: "relative"
      }}
    >
      {/* 返回按钮 */}
      <Button
        type="text"
        icon={<HomeOutlined />}
        onClick={() => navigate('/community')}
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
      
      {/* 装饰背景 */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 200,
        background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)"
      }} />
      
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        position: "relative",
        zIndex: 1
      }}>
        {/* 标题区域 */}
        <div style={{
          textAlign: "center",
          marginBottom: 32,
          paddingTop: 16
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255, 255, 255, 0.95)",
            padding: "16px 32px",
            borderRadius: 20,
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            marginBottom: 16,
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.3)"
          }}>
            <Title
              level={2}
              style={{
                margin: 0,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 800,
                fontSize: 32
              }}
            >
              我的收藏
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
            position: "relative"
          }}
          styles={{ body: { padding: 0 } }}
        >
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "24px 32px",
            color: "white"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12
            }}>
              <div style={{
                width: 8,
                height: 32,
                background: "white",
                borderRadius: 4
              }} />
              <div>
                <Title level={4} style={{
                  margin: 0,
                  color: "white",
                  fontWeight: 600
                }}>
                  收藏的帖子
                </Title>
                <div style={{
                  fontSize: 13,
                  opacity: 0.9,
                  marginTop: 4
                }}>
                  管理和查看您收藏的所有帖子
                </div>
              </div>
            </div>
          </div>
          
          <List
            loading={loading}
            dataSource={items}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (p) => loadFavorites(p),
              showSizeChanger: false,
              showQuickJumper: true,
            }}
            renderItem={(item) => {
              const summary = stripText(item.content).slice(0, 120);
              const cover = resolveImageUrl(item.images?.[0]);
              return (
                <List.Item>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: cover ? "1fr 120px" : "1fr",
                      gap: 16,
                      alignItems: "center",
                      padding: "20px 24px",
                      transition: "all 0.3s ease",
                      borderBottom: "1px solid #F3F4F6"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#F9FAFB";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Space wrap>
                        {item.category && (
                          <Tag color="blue">{item.category}</Tag>
                        )}
                        <Link to={`/community/posts/${item.id}`}>
                          <Typography.Text strong style={{ fontSize: 16, color: "#1F2937" }}>
                            {item.title}
                          </Typography.Text>
                        </Link>
                        <Tag color="gold">⭐ 已收藏</Tag>
                      </Space>
                      
                      <Typography.Paragraph 
                        ellipsis={{ rows: 2 }} 
                        style={{ color: "#6B7280", margin: "8px 0" }}
                      >
                        {summary}
                        {summary.length >= 120 ? "...【阅读更多】" : ""}
                      </Typography.Paragraph>
                      
                      <Space wrap size="small">
                        <Avatar size={20} style={{
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        }}>
                          {
                            (item.User?.nickname ||
                              item.User?.username ||
                              "U")[0]
                          }
                        </Avatar>
                        <Typography.Text type="secondary">
                          {item.User?.nickname || item.User?.username || "未知"}
                        </Typography.Text>
                        <Typography.Text type="secondary">·</Typography.Text>
                        <Typography.Text type="secondary">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : "-"}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          · 👁️ {item.view_count || 0}
                        </Typography.Text>
                        {item.favoriteAt && (
                          <Typography.Text type="secondary">
                            · 📌 收藏于：
                            {new Date(item.favoriteAt).toLocaleString()}
                          </Typography.Text>
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
                            <Tag key={tag} color="purple">#{tag}</Tag>
                          ))}
                        </Space>
                      )}
                      
                      <Divider style={{ margin: "12px 0" }} />
                      
                      <Space wrap>
                        <Typography.Text>👍 {item.like_count || 0}</Typography.Text>
                        <Typography.Text>💬 {item.comment_count || 0}</Typography.Text>
                        <Button
                          size="small"
                          danger
                          onClick={async () => {
                            await deleteFavorite(item.favoriteId);
                            loadFavorites(page);
                          }}
                          style={{
                            marginLeft: "auto"
                          }}
                        >
                          取消收藏
                        </Button>
                      </Space>
                    </Space>
                    
                    {cover && (
                      <Image
                        src={cover}
                        alt={item.title}
                        style={{
                          width: 120,
                          height: 90,
                          objectFit: "cover",
                          borderRadius: 8,
                        }}
                        preview={false}
                      />
                    )}
                  </div>
                </List.Item>
              );
            }}
          />
        </Card>
        
        {/* 底部信息 */}
        <div style={{
          textAlign: "center",
          marginTop: 24,
          color: "rgba(255, 255, 255, 0.9)",
          fontSize: 14,
          background: "rgba(255, 255, 255, 0.1)",
          padding: "16px",
          borderRadius: 12,
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}>
          <p style={{ margin: 0 }}>⭐ <strong>您可以在这里管理和查看所有收藏的帖子</strong></p>
          <p style={{ margin: "8px 0 0 0", fontSize: 13, opacity: 0.8 }}>
            点击帖子标题查看详情，或点击"取消收藏"按钮移除不需要的收藏
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
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}
      />
    </div>
  );
}
