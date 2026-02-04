import { Button, Card, Space, Tag, Typography, message } from "antd";
import type { ProColumns } from "@ant-design/pro-components";
import { useEffect, useState } from "react";
import ProTableEnhanced from "../../../components/admin/ProTableEnhanced";
import PermissionGuard from "../../../components/admin/PermissionGuard";
import {
  fetchCommunityPosts,
  updateCommunityPostStatus,
} from "../../../services/community";

const { Title } = Typography;

type CommunityPostRow = {
  key: number;
  id: number;
  title: string;
  author: string;
  status: number;
  createdAt?: string;
};

type CommunityPostApi = {
  id: number;
  title: string;
  status: number;
  createdAt?: string;
  User?: { nickname?: string; username?: string };
};

export default function CommunityPosts() {
  const [data, setData] = useState<CommunityPostRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchCommunityPosts({ page: 1, pageSize: 50 });
      const list = (res?.data || []).map((item: CommunityPostApi) => ({
        key: item.id,
        id: item.id,
        title: item.title,
        author: item.User?.nickname || item.User?.username || "未知",
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
      await updateCommunityPostStatus(id, { status });
      message.success("操作成功");
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  const columns: ProColumns<CommunityPostRow>[] = [
    { title: "标题", dataIndex: "title" },
    { title: "作者", dataIndex: "author" },
    { title: "创建时间", dataIndex: "createdAt", valueType: "dateTime" },
    {
      title: "状态",
      dataIndex: "status",
      render: (_, record) => (
        <Tag
          color={
            record.status === 1
              ? "green"
              : record.status === 2
                ? "red"
                : "orange"
          }
        >
          {record.status === 1
            ? "已通过"
            : record.status === 2
              ? "已驳回"
              : "待审核"}
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
            onClick={() => handleUpdateStatus(record.id, 2)}
          >
            驳回
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PermissionGuard required="community.post.manage">
      <div className="page-container">
        <Title level={3}>帖子管理</Title>
        <Card loading={loading}>
          <ProTableEnhanced columns={columns} dataSource={data} />
        </Card>
      </div>
    </PermissionGuard>
  );
}
