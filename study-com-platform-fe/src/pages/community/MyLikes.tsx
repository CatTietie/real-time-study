import {
  Card,
  Input,
  List,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyLikedPosts } from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";

const { Title } = Typography;

type LikeRow = {
  id: number;
  Post?: {
    id: number;
    title: string;
    content: string;
    category?: string;
    comment_count?: number;
    like_count?: number;
    User?: { nickname?: string; username?: string };
  };
};

export default function MyLikes() {
  const [data, setData] = useState<LikeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<string | undefined>();

  const loadData = useCallback(
    async (pageNo = page) => {
      setLoading(true);
      try {
        const res = await fetchMyLikedPosts({
          page: pageNo,
          pageSize,
          keyword: keyword.trim() || undefined,
          category: category || undefined,
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
    [category, keyword, page, pageSize],
  );

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  return (
    <div className="page-container">
      <Title level={3}>我的点赞</Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索标题/内容"
          style={{ width: 220 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => loadData(1)}
        />
        <Select
          placeholder="筛选分类"
          allowClear
          style={{ width: 180 }}
          options={["学习心得", "问题求助", "经验分享", "聊天交友"].map(
            (item) => ({ label: item, value: item }),
          )}
          value={category}
          onChange={(value) => {
            setCategory(value);
            loadData(1);
          }}
        />
      </Space>
      <Card>
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
                <Tag key="comments">评论 {item.Post?.comment_count || 0}</Tag>,
                <Tag key="likes">点赞 {item.Post?.like_count || 0}</Tag>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Link to={`/community/posts/${item.Post?.id}`}>
                    {item.Post?.title || "-"}
                  </Link>
                }
                description={
                  <Space direction="vertical">
                    <span>
                      作者：
                      {item.Post?.User?.nickname ||
                        item.Post?.User?.username ||
                        "未知"}
                    </span>
                    {item.Post?.category && (
                      <Tag color="blue">{item.Post.category}</Tag>
                    )}
                    <span>{item.Post?.content?.slice(0, 80)}...</span>
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
