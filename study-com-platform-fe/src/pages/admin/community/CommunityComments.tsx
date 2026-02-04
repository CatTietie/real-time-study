import { Button, Card, Space, Tag, Typography, message } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import { useEffect, useState } from "react";
import ProTableEnhanced from "../../../components/admin/ProTableEnhanced";
import PermissionGuard from "../../../components/admin/PermissionGuard";
import {
  fetchCommunityComments,
  updateCommunityCommentStatus,
} from "../../../services/community";

const { Title } = Typography;

type CommunityCommentRow = {
  key: number;
  id: number;
  content: string;
  author: string;
  postTitle: string;
  status: number;
  createdAt?: string;
};

type CommunityCommentApi = {
  id: number;
  content: string;
  status: number;
  createdAt?: string;
  User?: { nickname?: string; username?: string };
  Post?: { title?: string };
};

export default function CommunityComments() {
  const [data, setData] = useState<CommunityCommentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchCommunityComments({ page: 1, pageSize: 50 });
      const list = (res?.data || []).map((item: CommunityCommentApi) => ({
        key: item.id,
        id: item.id,
        content: item.content,
        author: item.User?.nickname || item.User?.username || "未知",
        postTitle: item.Post?.title || "-",
        status: item.status,
        createdAt: item.createdAt,
      }));
      setData(list);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: number, status: number) => {
    try {
      await updateCommunityCommentStatus(id, { status });
      message.success("操作成功");
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  const columns: ProColumns<CommunityCommentRow>[] = [
    { title: "内容", dataIndex: "content" },
    { title: "所属帖子", dataIndex: "postTitle" },
    { title: "作者", dataIndex: "author" },
    { title: "创建时间", dataIndex: "createdAt", valueType: "dateTime" },
    {
      title: "状态",
      dataIndex: "status",
      render: (_, record) => (
        <Tag color={record.status ? "green" : "orange"}>
          {record.status ? "显示" : "待处理"}
        </Tag>
      ),
    },
    {
      title: "操作",
      valueType: "option",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="primary"
            onClick={() => handleUpdateStatus(record.id, 1)}
          >
            通过
          </Button>
          <Button
            size="small"
            danger
            onClick={() => handleUpdateStatus(record.id, 0)}
          >
            隐藏
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PermissionGuard required="community.comment.manage">
      <div className="page-container">
        <Title level={3}>评论管理</Title>
        <Card loading={loading}>
          <ProTableEnhanced columns={columns} dataSource={data} />
        </Card>
      </div>
    </PermissionGuard>
  );
}
