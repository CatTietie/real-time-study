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
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fetchCommunityPosts } from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";

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
  const [data, setData] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(
    async (pageNo = page) => {
      setLoading(true);
      try {
        const keyword = searchParams.get("keyword")?.trim() || undefined;
        const category = searchParams.get("category") || undefined;
        const res = await fetchCommunityPosts({
          page: pageNo,
          pageSize,
          keyword,
          category,
        });
        setData(res?.data || []);
        setTotal(res?.pagination?.total || 0);
        setPage(pageNo);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, searchParams],
  );

  useEffect(() => {
    loadData(1);
  }, [loadData, searchParams]);

  return (
    <div className="page-container">
      <Title level={3}>社区帖子</Title>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={() => navigate("/community/publish")}>
            发帖
          </Button>
        </Space>
        <List
          loading={loading}
          dataSource={data}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p) => loadData(p),
          }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Tag key="comments">评论 {item.comment_count || 0}</Tag>,
                <Tag key="likes">点赞 {item.like_count || 0}</Tag>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Link to={`/community/posts/${item.id}`}>{item.title}</Link>
                }
                description={
                  <Space direction="vertical">
                    <span>
                      作者：
                      {item.User?.nickname || item.User?.username || "未知"}
                    </span>
                    {item.category && <Tag color="blue">{item.category}</Tag>}
                    <span>{item.content?.slice(0, 80)}...</span>
                    {item.images && item.images.length > 0 && (
                      <Image width={120} src={item.images[0]} preview={false} />
                    )}
                    {item.tags && (
                      <Space wrap>
                        {(() => {
                          try {
                            return JSON.parse(item.tags);
                          } catch {
                            return [];
                          }
                        })().map((tag: string) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </Space>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
      <CommunityFooter />
    </div>
  );
}
