import { Card, Select, Table, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { fetchCommunityLeaderboardByType } from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";

const { Title } = Typography;

type LeaderboardRow = {
  key: string | number;
  id?: number;
  nickname?: string;
  username?: string;
  points?: number;
  level?: number;
  likeCount?: number;
  Post?: { title?: string; User?: { nickname?: string; username?: string } };
  title?: string;
  like_count?: number;
  comment_count?: number;
  user?: { nickname?: string; username?: string; points?: number };
};

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("total");

  const loadData = useCallback(
    async (targetType = type) => {
      setLoading(true);
      try {
        const res = await fetchCommunityLeaderboardByType(targetType);
        const list = ((res?.data as LeaderboardRow[] | undefined) || []).map(
          (item, index) => ({
            ...item,
            key: item.key ?? item.id ?? index,
          }),
        );
        setData(list);
      } catch (err) {
        message.error(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [type],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    {
      title: "排名",
      render: (_value: unknown, _record: LeaderboardRow, index: number) =>
        index + 1,
    },
    ...(type === "post_like"
      ? [
          {
            title: "标题",
            render: (_value: unknown, record: LeaderboardRow) =>
              record.title || record.Post?.title || "-",
          },
          {
            title: "作者",
            render: (_value: unknown, record: LeaderboardRow) =>
              record.Post?.User?.nickname || record.Post?.User?.username || "-",
          },
          {
            title: "点赞",
            render: (_value: unknown, record: LeaderboardRow) =>
              record.like_count ?? "-",
          },
          { title: "评论", dataIndex: "comment_count" },
        ]
      : type === "comment_like"
        ? [
            {
              title: "用户",
              render: (_value: unknown, record: LeaderboardRow) =>
                record.user?.nickname || record.user?.username || "-",
            },
            {
              title: "获赞",
              render: (_value: unknown, record: LeaderboardRow) =>
                record.likeCount ?? "-",
            },
            {
              title: "等级",
              render: (_value: unknown, record: LeaderboardRow) =>
                record.level ?? "-",
            },
          ]
        : [
            {
              title: "昵称",
              render: (_value: unknown, record: LeaderboardRow) =>
                record.nickname || record.user?.nickname || "-",
            },
            {
              title: "账号",
              render: (_value: unknown, record: LeaderboardRow) =>
                record.username || record.user?.username || "-",
            },
            {
              title: "积分",
              render: (_value: unknown, record: LeaderboardRow) =>
                record.points ?? record.user?.points ?? "-",
            },
            {
              title: "等级",
              render: (_value: unknown, record: LeaderboardRow) =>
                record.level ?? "-",
            },
          ]),
  ];

  return (
    <div className="page-container">
      <Title level={3}>排行榜</Title>
      <Select
        value={type}
        style={{ width: 220, marginBottom: 16 }}
        onChange={(value) => {
          setType(value);
          loadData(value);
        }}
        options={[
          { label: "总积分榜", value: "total" },
          { label: "月度活跃榜", value: "month" },
          { label: "周活跃榜", value: "week" },
          { label: "新星榜", value: "newbie" },
          { label: "优质内容榜", value: "post_like" },
          { label: "热心助人榜", value: "comment_like" },
        ]}
      />
      <Card loading={loading}>
        <Table
          rowKey="key"
          dataSource={data}
          pagination={false}
          columns={columns}
        />
      </Card>
      <CommunityFooter />
    </div>
  );
}
