import {
  Button,
  Card,
  Form,
  InputNumber,
  Radio,
  Typography,
  message,
  Spin,
  Descriptions,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { fetchAuditConfig, updateAuditConfig } from "../../services/auditConfig";
import PermissionGuard from "../../components/admin/PermissionGuard";
import { SaveOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function AuditConfig() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAuditConfig();
      if (res.success && res.data) {
        form.setFieldsValue({
          audit_mode: res.data.audit_mode,
          new_user_days_threshold: res.data.new_user_days_threshold,
          auto_approve_hours: res.data.auto_approve_hours,
        });
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载配置失败");
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const res = await updateAuditConfig(values);
      if (res.success) {
        message.success("审核策略已更新");
      } else {
        message.error(res.message || "更新失败");
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGuard required="community.post.review">
      <div className="page-container">
        <Title level={3}>审核策略配置</Title>

        <Spin spinning={loading}>
          <Card style={{ maxWidth: 640 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              initialValues={{
                audit_mode: "smart",
                new_user_days_threshold: 7,
                auto_approve_hours: 0,
              }}
            >
              <Form.Item
                name="audit_mode"
                label="审核模式"
                rules={[{ required: true }]}
                extra={
                  <Descriptions size="small" column={1} style={{ marginTop: 8 }}>
                    <Descriptions.Item label="全量审核">所有帖子均需管理员审核后才可展示</Descriptions.Item>
                    <Descriptions.Item label="智能审核">仅新用户、触发敏感词的帖子需审核，老用户直接发布</Descriptions.Item>
                    <Descriptions.Item label="关闭审核">所有帖子直接发布，无需审核</Descriptions.Item>
                  </Descriptions>
                }
              >
                <Radio.Group>
                  <Radio.Button value="full">全量审核</Radio.Button>
                  <Radio.Button value="smart">智能审核</Radio.Button>
                  <Radio.Button value="off">关闭审核</Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="new_user_days_threshold"
                label="新用户天数阈值"
                rules={[{ required: true, message: "请输入天数" }]}
                extra="注册天数在此范围内的用户视为新用户，其帖子在智能审核模式下需要审核"
              >
                <InputNumber min={1} max={30} addonAfter="天" style={{ width: 180 }} />
              </Form.Item>

              <Form.Item
                name="auto_approve_hours"
                label="自动通过时限"
                rules={[{ required: true, message: "请输入小时数" }]}
                extra="待审帖子超过指定小时后自动通过审核，设为0表示禁用此功能"
              >
                <InputNumber min={0} max={168} addonAfter="小时" style={{ width: 180 }} />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                  icon={<SaveOutlined />}
                >
                  保存配置
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Spin>
      </div>
    </PermissionGuard>
  );
}
