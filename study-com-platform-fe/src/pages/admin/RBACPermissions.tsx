import { Card, Table, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { fetchPermissions } from "../../services/admin";

const { Title } = Typography;

export default function RBACPermissions() {
  interface PermissionItem {
    id: number;
    name: string;
    code: string;
    module?: string;
    description?: string;
  }

  interface PermissionRow extends PermissionItem {
    key: number;
  }

  const [data, setData] = useState<PermissionRow[]>([]);

  const loadPermissions = useCallback(async () => {
    const res = await fetchPermissions();
    setData(
      ((res.data as PermissionItem[] | undefined) || []).map((item) => ({
        ...item,
        key: item.id,
      })),
    );
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPermissions();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPermissions]);
  return (
    <div className="page-container">
      <Title level={3}>权限点</Title>
      <Card>
        <Table
          dataSource={data}
          columns={[
            { title: "权限ID", dataIndex: "id", width: 100 },
            { title: "权限名称", dataIndex: "name" },
            { title: "权限说明", dataIndex: "description" },
          ]}
        />
      </Card>
    </div>
  );
}
