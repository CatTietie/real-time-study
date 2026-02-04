import type { ProColumns } from "@ant-design/pro-components";
import type { TableColumnsType } from "antd";
import ProTableEnhanced from "../admin/ProTableEnhanced";
import SimpleTable from "../student/SimpleTable";

interface SmartTableProps<T extends { key: React.Key }> {
  mode: "admin" | "student";
  proColumns?: ProColumns<T>[];
  columns?: TableColumnsType<T>;
  dataSource: T[];
}

export default function SmartTable<T extends { key: React.Key }>(
  props: SmartTableProps<T>,
) {
  const { mode, proColumns, columns, dataSource } = props;

  if (mode === "admin") {
    return (
      <ProTableEnhanced columns={proColumns || []} dataSource={dataSource} />
    );
  }

  return <SimpleTable columns={columns} dataSource={dataSource} />;
}
