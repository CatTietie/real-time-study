import { ProTable, type ProColumns } from "@ant-design/pro-components";

export interface ProTableEnhancedProps<T extends { key: React.Key }> {
  columns: ProColumns<T>[];
  dataSource: T[];
  search?: boolean;
  rowKey?: string;
}

export default function ProTableEnhanced<T extends { key: React.Key }>(
  props: ProTableEnhancedProps<T>,
) {
  const { columns, dataSource, search = false, rowKey = "key" } = props;

  return (
    <ProTable<T>
      columns={columns}
      dataSource={dataSource}
      rowKey={rowKey}
      search={search ? {} : false}
      pagination={{ pageSize: 10 }}
      options={false}
    />
  );
}
