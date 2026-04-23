import {
  Button,
  Card,
  Image,
  List,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { fetchCommunityPosts } from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";
import { HomeOutlined } from "@ant-design/icons";

const { Title } = Typography;

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
  comment_count?: number;
  like_count?: number;
  User?: { nickname?: string; username?: string };
};

export default function PostsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authState = useAppSelector((state) => state.auth);
  const [data, setData] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(
    async (pageNo = page) => {
      setLoading(true);
      try {
        console.log('Auth state:', authState);
        console.log('Current user ID:', authState.userId);
        const keyword = searchParams.get("keyword")?.trim() || undefined;
        const category = searchParams.get("category") || undefined;
        const params: Record<string, string | number | undefined> = {
          page: pageNo,
          pageSize,
          keyword,
          category
        };
        
        // 只有当用户已登录且有ID时才添加userId参数
        if (authState.userId) {
          params.userId = authState.userId;
          console.log('Adding userId to params:', authState.userId);
        }
        
        const res = await fetchCommunityPosts(params);
        setData(res?.data || []);
        setTotal(res?.pagination?.total || 0);
        setPage(pageNo);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, searchParams, authState],
  );

  useEffect(() => {
    loadData(1);
  }, [loadData, searchParams]);

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
              我的帖子
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
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16
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
                    我发表的帖子
                  </Title>
                  <div style={{
                    fontSize: 13,
                    opacity: 0.9,
                    marginTop: 4
                  }}>
                    管理和查看您发布的所有帖子
                  </div>
                </div>
              </div>
              <Button 
                type="primary" 
                onClick={() => navigate("/community/publish")}
                style={{
                  background: "white",
                  color: "#667eea",
                  borderColor: "white",
                  fontWeight: 600,
                  boxShadow: "0 4px 12px rgba(255,255,255,0.3)"
                }}
              >
                发布新帖
              </Button>
            </div>
          </div>
          <List
            loading={loading}
            dataSource={data}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (p) => loadData(p),
              showSizeChanger: false,
              showQuickJumper: true,
            }}
            renderItem={(item) => {
              const cover = item.images?.[0];
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
                        <Typography.Text 
                          strong 
                          style={{ fontSize: 16, color: "#1890ff", cursor: "pointer" }}
                          onClick={() => navigate(`/community?postId=${item.id}`)}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#40a9ff"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "#1890ff"; }}
                        >
                          {item.title}
                        </Typography.Text>
                        {item.status === 1 && item.publish_status === 1 && (
                          <Tag color="green">已发布</Tag>
                        )}
                        {item.status === 0 && (
                          <Tag color="orange">审核中</Tag>
                        )}
                        {item.publish_status === 0 && (
                          <Tag color="gray">草稿</Tag>
                        )}
                      </Space>
                      
                      <Typography.Paragraph 
                        ellipsis={{ rows: 2 }} 
                        style={{ color: "#6B7280", margin: "8px 0" }}
                      >
                        {item.content?.slice(0, 120)}...
                      </Typography.Paragraph>
                      
                      <Space wrap size="small">
                        <Typography.Text type="secondary">
                          发布时间：
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : "-"}
                        </Typography.Text>
                        <Typography.Text type="secondary">·</Typography.Text>
                        <Typography.Text type="secondary">
                          👍 {item.like_count || 0}
                        </Typography.Text>
                        <Typography.Text type="secondary">·</Typography.Text>
                        <Typography.Text type="secondary">
                          💬 {item.comment_count || 0}
                        </Typography.Text>
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
          <p style={{ margin: 0 }}>📝 <strong>您可以在这里管理和查看自己发布的所有帖子</strong></p>
          <p style={{ margin: "8px 0 0 0", fontSize: 13, opacity: 0.8 }}>
            点击"发布新帖"按钮创建新的内容，或点击帖子标题查看详情和进行编辑
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
