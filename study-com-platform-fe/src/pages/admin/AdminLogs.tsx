import { Button, Card, Input, Space, Table, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { fetchAdminLogs } from "../../services/admin";

const { Title, Text } = Typography;

type AdminLogRow = {
  id: number;
  admin_id: number;
  action_type: string;
  target_table?: string;
  target_id?: number;
  detail?: string;
  createdAt?: string;
  created_at?: string;
  User?: { id: number; username?: string; nickname?: string };
};

export default function AdminLogs() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdminLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [adminId, setAdminId] = useState<string>("");
  const [actionType, setActionType] = useState<string>("");

  const loadData = async (nextPage = page, nextSize = pageSize) => {
    setLoading(true);
    try {
      const res = await fetchAdminLogs({
        page: nextPage,
        pageSize: nextSize,
        adminId: adminId ? Number(adminId) : undefined,
        actionType: actionType || undefined,
      });
      setData(res.data || []);
      setTotal(res.pagination?.total || 0);
      setPage(nextPage);
      setPageSize(nextSize);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1, pageSize);
  }, []);

  return (
    <div className="page-container">
      <Title level={3}>操作日志</Title>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Text>筛选：</Text>
          <Input
            placeholder="管理员ID"
            style={{ width: 140 }}
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
          />
          <Input
            placeholder="操作类型"
            style={{ width: 200 }}
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
          />
          <Button onClick={() => loadData(1, pageSize)}>查询</Button>
        </Space>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={data}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (nextPage, nextSize) => loadData(nextPage, nextSize),
          }}
          columns={[
            { title: "管理员ID", dataIndex: "admin_id", width: 100 },
            {
              title: "管理员",
              render: (_, record) =>
                record.User?.nickname ||
                record.User?.username ||
                record.admin_id,
            },
            { title: "操作类型", dataIndex: "action_type" },
            {
              title: "对象",
              render: (_, record) =>
                record.target_table
                  ? `${record.target_table}:${record.target_id ?? "-"}`
                  : "-",
            },
            { title: "详情", dataIndex: "detail" },
            {
              title: "时间",
              render: (_, record) =>
                record.createdAt || record.created_at
                  ? new Date(
                      (record.createdAt || record.created_at) as string,
                    ).toLocaleString()
                  : "-",
            },
          ]}
        />
      </Card>
    </div>
  );
}
