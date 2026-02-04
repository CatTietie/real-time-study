import { ProForm, ProFormText } from "@ant-design/pro-components";

interface ProFormCustomProps {
  onFinish: (values: Record<string, string>) => Promise<void> | void;
  initialValues?: Record<string, string>;
}

export default function ProFormCustom({
  onFinish,
  initialValues,
}: ProFormCustomProps) {
  return (
    <ProForm onFinish={onFinish} initialValues={initialValues}>
      <ProFormText
        name="title"
        label="标题"
        placeholder="请输入标题"
        rules={[{ required: true, message: "请输入标题" }]}
      />
      <ProFormText name="desc" label="描述" placeholder="请输入描述" />
    </ProForm>
  );
}
