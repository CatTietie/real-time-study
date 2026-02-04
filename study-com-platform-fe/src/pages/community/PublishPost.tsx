import {
  Button,
  Card,
  Form,
  Input,
  Radio,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import type { UploadFile } from "antd";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import {
  createCommunityPost,
  fetchCommunityTagSuggestions,
} from "../../services/communityPublic";
import CommunityFooter from "../../components/community/CommunityFooter";

const { Title, Text } = Typography;
const { TextArea } = Input;

const CATEGORY_OPTIONS = ["学习心得", "问题求助", "经验分享", "聊天交友"];

type PublishForm = {
  title: string;
  content: string;
  category: string;
  tags?: string[];
};

export default function PublishPost() {
  const navigate = useNavigate();
  const { token } = useAppSelector((state: RootState) => state.auth);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<PublishForm>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [tagFetching, setTagFetching] = useState(false);
  const tagTimerRef = useRef<number | null>(null);
  const watchedTags = Form.useWatch("tags", form) || [];

  const handleSubmit = async (values: PublishForm) => {
    if (!token) {
      messageApi.warning("请先登录再发帖");
      navigate("/admin/login");
      return;
    }

    const formData = new FormData();
    formData.append("title", values.title.trim());
    formData.append("content", values.content.trim());
    formData.append("category", values.category);
    if (values.tags && values.tags.length) {
      formData.append("tags", values.tags.join(","));
    }

    fileList.forEach((file) => {
      if (file.originFileObj) {
        formData.append("images", file.originFileObj);
      }
    });

    try {
      setSubmitting(true);
      await createCommunityPost(formData);
      messageApi.success("发帖成功，等待审核");
      form.resetFields();
      setFileList([]);
      window.setTimeout(() => {
        navigate("/community");
      }, 300);
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : "发帖失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTagSearch = (value: string) => {
    if (!value || value.trim().length < 1) {
      setTagOptions([]);
      return;
    }
    if (tagTimerRef.current) {
      window.clearTimeout(tagTimerRef.current);
    }
    tagTimerRef.current = window.setTimeout(async () => {
      try {
        setTagFetching(true);
        const res = await fetchCommunityTagSuggestions(value.trim());
        setTagOptions((res?.data as string[]) || []);
      } catch {
        setTagOptions([]);
      } finally {
        setTagFetching(false);
      }
    }, 300);
  };

  const handleTagsChange = (values: string[]) => {
    const deduped = Array.from(new Set(values.map((v) => v.trim()))).filter(
      (v) => v.length > 0,
    );
    form.setFieldsValue({ tags: deduped.slice(0, 5) });
  };

  return (
    <div className="page-container">
      {contextHolder}
      <Card style={{ marginBottom: 16 }}>
        <Space
          align="center"
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Title level={4} style={{ margin: 0 }}>
            学习社区
          </Title>
          <Space>
            <Button onClick={() => navigate("/community")}>社区首页</Button>
            <Button onClick={() => navigate("/community/posts")}>
              我的帖子
            </Button>
            <Button onClick={() => navigate("/community/favorites")}>
              我的收藏
            </Button>
            <Button onClick={() => navigate("/community/leaderboard")}>
              排行榜
            </Button>
            <Button danger onClick={() => navigate("/community")}>
              取消
            </Button>
          </Space>
        </Space>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: 16,
        }}
      >
        <Card>
          <Title level={4}>发布新帖</Title>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="标题"
              name="title"
              rules={[
                { required: true, message: "请输入标题" },
                { min: 2, max: 100, message: "标题长度为2-100字符" },
              ]}
            >
              <Input
                placeholder="在此输入帖子标题，2-100字符"
                maxLength={100}
                showCount
              />
            </Form.Item>

            <Form.Item
              label="分类选择"
              name="category"
              rules={[{ required: true, message: "请选择分类" }]}
            >
              <Radio.Group optionType="button" buttonStyle="solid">
                {CATEGORY_OPTIONS.map((item) => (
                  <Radio.Button key={item} value={item}>
                    {item}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>

            <Form.Item
              label="内容编辑区"
              name="content"
              rules={[{ required: true, message: "请输入内容" }]}
            >
              <TextArea
                placeholder="内容编辑区域（高度自适应，最小高度300px）"
                maxLength={5000}
                autoSize={{ minRows: 10 }}
                style={{ minHeight: 300 }}
              />
            </Form.Item>

            <Form.Item label="标签" name="tags">
              <Select
                mode="tags"
                maxTagCount={5}
                placeholder="输入标签，按Enter添加"
                options={tagOptions.map((tag) => ({ label: tag, value: tag }))}
                onSearch={handleTagSearch}
                onChange={handleTagsChange}
                loading={tagFetching}
              />
            </Form.Item>
            <Text type="secondary">
              已添加：
              {watchedTags.length
                ? watchedTags.map((tag: string) => `#${tag}`).join(" ")
                : "-"}
            </Text>

            <Form.Item label="图片上传（最多4张，可选）">
              <Upload
                listType="picture-card"
                fileList={fileList}
                onChange={({ fileList: next }) => setFileList(next.slice(0, 4))}
                beforeUpload={(file) => {
                  const isImage = file.type.startsWith("image/");
                  if (!isImage) {
                    messageApi.error("仅支持图片格式");
                    return Upload.LIST_IGNORE;
                  }
                  return false;
                }}
                maxCount={4}
                accept="image/*"
              >
                {fileList.length >= 4 ? null : "上传"}
              </Upload>
            </Form.Item>

            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                发布帖子
              </Button>
            </Space>
          </Form>
        </Card>

        <Space direction="vertical" style={{ width: "100%" }}>
          <Card title="发布指南">
            <Space direction="vertical">
              <Text>📌 标题要明确具体</Text>
              <Text>📌 内容需详细完整</Text>
              <Text>📌 选择合适分类和标签</Text>
              <Text>📌 优质帖子可能获得加精和额外积分</Text>
            </Space>
          </Card>
          <Card title="格式示例">
            <Space direction="vertical">
              <Text>【问题求助】</Text>
              <Text>1. 问题描述</Text>
              <Text>2. 已尝试的解决方案</Text>
              <Text>3. 期望结果</Text>
              <Text>【经验分享】</Text>
              <Text>1. 资源介绍</Text>
              <Text>2. 适用人群</Text>
              <Text>3. 使用建议</Text>
            </Space>
          </Card>
          <Card title="社区规则">
            <Space direction="vertical">
              <Text>• 禁止发布广告内容</Text>
              <Text>• 禁止人身攻击和辱骂</Text>
              <Text>• 尊重他人知识产权</Text>
            </Space>
          </Card>
        </Space>
      </div>

      <CommunityFooter />
    </div>
  );
}
