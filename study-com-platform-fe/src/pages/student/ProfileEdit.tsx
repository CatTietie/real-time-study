import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Button,
  Avatar,
  Upload,
  message,
  Space,
  Typography,
  Divider,
  InputNumber
} from "antd";
import { PlusOutlined, MinusOutlined } from "@ant-design/icons";
import {
  UserOutlined,
  LockOutlined,
  CameraOutlined,
  SaveOutlined,
  RollbackOutlined,
  FireOutlined,
  MessageOutlined,
  TrophyOutlined,
  StarOutlined,
  EditOutlined
} from "@ant-design/icons";
import { useState, useEffect } from "react";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const { Title, Text } = Typography;

// 自定义带步长按钮的输入组件
interface InputNumberWithStepProps {
  value?: number;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  addonAfter?: React.ReactNode;
  parser?: (value: string | undefined) => number | null;
  formatter?: (value: number | undefined) => string;
  size?: 'large' | 'middle' | 'small';
  style?: React.CSSProperties;
  [key: string]: unknown;
}

const InputNumberWithStep: React.FC<InputNumberWithStepProps> = ({
  value,
  onChange,
  min,
  max,
  step = 100,
  addonAfter,
  parser,
  formatter,
  size = 'large',
  style,
  ...rest
}) => {
  const handleStep = (type: 'plus' | 'minus') => {
    const currentValue = value ?? 0;
    let newValue = type === 'plus' ? currentValue + step : currentValue - step;
    // 限制在 min/max 范围内
    if (min !== undefined) newValue = Math.max(min, newValue);
    if (max !== undefined) newValue = Math.min(max, newValue);
    onChange?.(newValue);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', ...style }}>
      <Button
        icon={<MinusOutlined />}
        onClick={() => handleStep('minus')}
        size={size}
        disabled={min !== undefined && value !== undefined && value <= min}
      />
      <InputNumber
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={1}
        parser={parser}
        formatter={formatter}
        size={size}
        addonAfter={addonAfter}
        style={{ width: '100%', margin: '0 8px' }}
        {...rest}
      />
      <Button
        icon={<PlusOutlined />}
        onClick={() => handleStep('plus')}
        size={size}
        disabled={max !== undefined && value !== undefined && value >= max}
      />
    </div>
  );
};

interface ProfileFormData {
  nickname: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  avatar: string;
  goalPosts: number;
  goalComments: number;
  goalHotPosts: number;
  goalPoints: number;
}

export default function ProfileEdit() {
  const authState = useAppSelector((state: RootState) => state.auth);
  const { username, nickname, userId } = authState;
  const navigate = useNavigate();
  const [form] = Form.useForm<ProfileFormData>();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [goalsLoading, setGoalsLoading] = useState(false);

  // 默认表单数据
  const defaultFormData: ProfileFormData = {
    nickname: nickname || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    avatar: "",
    goalPosts: 3,
    goalComments: 20,
    goalHotPosts: 1,
    goalPoints: 500
  };

  // 获取用户学习目标
  useEffect(() => {
    if (userId) {
      fetchLearningGoals();
    }
  }, [userId]);

  const fetchLearningGoals = async () => {
    setGoalsLoading(true);
    try {
      const response = await api.get('/learning-goals/me');
      if (response.data.success && response.data.data) {
        const goals = response.data.data;
        form.setFieldsValue({
          goalPosts: goals.goal_posts,
          goalComments: goals.goal_comments,
          goalHotPosts: goals.goal_hot_posts,
          goalPoints: goals.goal_points
        });
      }
    } catch (error) {
      console.error('获取学习目标失败:', error);
      message.warning('获取学习目标失败，使用默认值');
    } finally {
      setGoalsLoading(false);
    }
  };

  // 头像上传处理
  const handleAvatarUpload = (info: unknown) => {
    if (info.file.status === 'done') {
      // 模拟上传成功，实际应该调用后端API
      const mockUrl = URL.createObjectURL(info.file.originFileObj);
      setAvatarUrl(mockUrl);
      message.success('头像上传成功');
    } else if (info.file.status === 'error') {
      message.error('头像上传失败');
    }
  };

  // 表单提交处理
  const onFinish = async (values: ProfileFormData) => {
    setLoading(true);
    try {
      console.log('提交的表单数据:', values);
      
      // 保存学习目标
      const goalsResponse = await api.post('/learning-goals/me', {
        goal_posts: values.goalPosts,
        goal_comments: values.goalComments,
        goal_hot_posts: values.goalHotPosts,
        goal_points: values.goalPoints
      });
      
      if (!goalsResponse.data.success) {
        throw new Error(goalsResponse.data.message || '保存学习目标失败');
      }

      // 保存用户基本信息（如果有修改）
      if (values.nickname !== nickname) {
        await api.put(`/user/${userId}`, {
          nickname: values.nickname
        });
      }

      // 如果修改了密码
      if (values.newPassword) {
        await api.put(`/user/${userId}/password`, {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword
        });
      }

      message.success('个人资料更新成功！');
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 1500);
    } catch (error: unknown) {
      console.error('保存失败:', error);
      message.error(error.response?.data?.message || error.message || '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    navigate('/student/dashboard');
  };

  return (
    <div className="profile-edit-page">
      <div
        className="page-container"
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "16px 12px",
          position: "relative"
        }}
      >
        {/* 装饰背景 */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)"
        }} />

        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          position: "relative",
          zIndex: 1
        }}>
          {/* 标题区域 */}
          <div style={{
            textAlign: "center",
            marginBottom: 24,
            paddingTop: 16
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(255, 255, 255, 0.95)",
              padding: "16px 32px",
              borderRadius: 20,
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              marginBottom: 16,
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.3)"
            }}>
              <EditOutlined style={{ fontSize: 28, color: "#667eea" }} />
              <Title level={2} style={{
                margin: 0,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 800,
                fontSize: 32
              }}>
                个人资料设置
              </Title>
              <UserOutlined style={{ fontSize: 28, color: "#10B981" }} />
            </div>
            <Text type="secondary" style={{
              color: "rgba(255, 255, 255, 0.9)",
              fontSize: 15,
              maxWidth: 600,
              margin: "0 auto",
              display: "block"
            }}>
              管理您的个人信息和学习目标，定制专属的学习体验
            </Text>
          </div>

          {/* 返回按钮 */}
          <Button
            type="text"
            icon={<RollbackOutlined />}
            onClick={() => navigate('/student/dashboard')}
            style={{
              position: "absolute",
              top: 24,
              left: 24,
              zIndex: 10,
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: 12,
              padding: "12px 16px",
              color: "#667eea",
              fontWeight: 600,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
            }}
          >
            返回个人中心
          </Button>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={defaultFormData}
            style={{ maxWidth: 1200, margin: "0 auto" }}
          >
            {goalsLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                borderRadius: 16
              }}>
                <div>加载学习目标中...</div>
              </div>
            )}
            <Row gutter={[24, 24]}>
              {/* 左侧：基本信息 */}
              <Col xs={24} lg={12}>
                <Card 
                  title={
                    <Space>
                      <UserOutlined style={{ color: "#667eea" }} />
                      <span>基本信息</span>
                    </Space>
                  }
                  style={{ borderRadius: 16, height: "100%" }}
                >
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <Avatar
                        size={120}
                        src={avatarUrl}
                        icon={<UserOutlined />}
                        style={{
                          border: "4px solid #667eea",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        }}
                      />
                      <Upload
                        showUploadList={false}
                        beforeUpload={() => false}
                        onChange={handleAvatarUpload}
                        accept="image/*"
                      >
                        <Button
                          type="primary"
                          shape="circle"
                          icon={<CameraOutlined />}
                          style={{
                            position: "absolute",
                            bottom: 0,
                            right: 0,
                            background: "#667eea",
                            border: "3px solid white"
                          }}
                        />
                      </Upload>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Text type="secondary">点击相机图标上传新头像</Text>
                    </div>
                  </div>

                  <Divider />

                  <Form.Item
                    label={
                      <span>
                        <UserOutlined style={{ marginRight: 8, color: "#667eea" }} />
                        昵称
                      </span>
                    }
                    name="nickname"
                    rules={[
                      { required: true, message: "请输入昵称" },
                      { min: 2, max: 20, message: "昵称长度为2-20个字符" }
                    ]}
                  >
                    <Input
                      placeholder="请输入您的昵称"
                      size="large"
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        <UserOutlined style={{ marginRight: 8, color: "#1890ff" }} />
                        用户名
                      </span>
                    }
                  >
                    <Input
                      value={username}
                      disabled
                      size="large"
                      style={{ borderRadius: 8 }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      用户名不可修改
                    </Text>
                  </Form.Item>
                </Card>
              </Col>

              {/* 右侧：密码设置 */}
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <Space>
                      <LockOutlined style={{ color: "#faad14" }} />
                      <span>密码安全</span>
                    </Space>
                  }
                  style={{ borderRadius: 16, height: "100%" }}
                >
                  <Form.Item
                    label={
                      <span>
                        <LockOutlined style={{ marginRight: 8, color: "#faad14" }} />
                        当前密码
                      </span>
                    }
                    name="currentPassword"
                  >
                    <Input.Password
                      placeholder="请输入当前密码"
                      size="large"
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        <LockOutlined style={{ marginRight: 8, color: "#52c41a" }} />
                        新密码
                      </span>
                    }
                    name="newPassword"
                    rules={[
                      { min: 6, message: "密码至少6位" },
                      { max: 32, message: "密码最多32位" }
                    ]}
                  >
                    <Input.Password
                      placeholder="请输入新密码"
                      size="large"
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        <LockOutlined style={{ marginRight: 8, color: "#52c41a" }} />
                        确认新密码
                      </span>
                    }
                    name="confirmPassword"
                    dependencies={['newPassword']}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      placeholder="请再次输入新密码"
                      size="large"
                      style={{ borderRadius: 8 }}
                    />
                  </Form.Item>

                  <div style={{
                    background: "#fffbe6",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #ffe58f"
                  }}>
                    <Text type="warning">
                      <strong>💡 提示：</strong>如不修改密码，请留空当前密码和新密码字段
                    </Text>
                  </div>
                </Card>
              </Col>

              {/* 学习目标设置 */}
              <Col span={24}>
                <Card
                  title={
                    <Space>
                      <FireOutlined style={{ color: "#ff4d4f" }} />
                      <span>学习目标设置</span>
                    </Space>
                  }
                  style={{ borderRadius: 16 }}
                >
                  <Row gutter={[24, 24]}>
                    <Col xs={24} sm={12} md={6}>
                      <div style={{
                        background: "linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)",
                        padding: 24,
                        borderRadius: 12,
                        textAlign: "center",
                        border: "2px solid #91d5ff"
                      }}>
                        <FireOutlined style={{ fontSize: 32, color: "#1890ff", marginBottom: 12 }} />
                        <Title level={5} style={{ margin: "12px 0", color: "#1890ff" }}>
                          发帖目标
                        </Title>
                        <Form.Item
                          name="goalPosts"
                          style={{ margin: 0 }}
                        >
                          <InputNumberWithStep
                            min={1}
                            max={20}
                            step={1}
                            addonAfter="篇/天"
                            parser={(value) => value ? parseInt(value.replace(/[^\d]/g, ''), 10) : 0}
                            formatter={(value) => `${value}`}
                            size="large"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                          每日发帖数量目标
                        </Text>
                      </div>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <div style={{
                        background: "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)",
                        padding: 24,
                        borderRadius: 12,
                        textAlign: "center",
                        border: "2px solid #b7eb8f"
                      }}>
                        <MessageOutlined style={{ fontSize: 32, color: "#52c41a", marginBottom: 12 }} />
                        <Title level={5} style={{ margin: "12px 0", color: "#52c41a" }}>
                          评论目标
                        </Title>
                        <Form.Item
                          name="goalComments"
                          style={{ margin: 0 }}
                        >
                          <InputNumberWithStep
                            min={5}
                            max={100}
                            step={5}
                            addonAfter="条/天"
                            parser={(value) => value ? parseInt(value.replace(/[^\d]/g, ''), 10) : 0}
                            formatter={(value) => `${value}`}
                            size="large"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                          每日评论数量目标
                        </Text>
                      </div>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <div style={{
                        background: "linear-gradient(135deg, #fff0f6 0%, #ffd6e7 100%)",
                        padding: 24,
                        borderRadius: 12,
                        textAlign: "center",
                        border: "2px solid #ffadd2"
                      }}>
                        <TrophyOutlined style={{ fontSize: 32, color: "#eb2f96", marginBottom: 12 }} />
                        <Title level={5} style={{ margin: "12px 0", color: "#eb2f96" }}>
                          热榜任务
                        </Title>
                        <Form.Item
                          name="goalHotPosts"
                          style={{ margin: 0 }}
                        >
                          <InputNumberWithStep
                            min={0}
                            max={10}
                            step={1}
                            addonAfter="篇/周"
                            parser={(value) => value ? parseInt(value.replace(/[^\d]/g, ''), 10) : 0}
                            formatter={(value) => `${value}`}
                            size="large"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                          每周热榜帖子目标
                        </Text>
                      </div>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <div style={{
                        background: "linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)",
                        padding: 24,
                        borderRadius: 12,
                        textAlign: "center",
                        border: "2px solid #ffe58f"
                      }}>
                        <StarOutlined style={{ fontSize: 32, color: "#faad14", marginBottom: 12 }} />
                        <Title level={5} style={{ margin: "12px 0", color: "#faad14" }}>
                          积分目标
                        </Title>
                        <Form.Item
                          name="goalPoints"
                          style={{ margin: 0 }}
                        >
                          <InputNumberWithStep
                            min={100}
                            max={5000}
                            step={100}
                            addonAfter="分/月"
                            parser={(value) => value ? parseInt(value.replace(/[^\d]/g, ''), 10) : 0}
                            formatter={(value) => `${value}`}
                            size="large"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                          每月积分获取目标
                        </Text>
                      </div>
                    </Col>
                  </Row>

                  <div style={{
                    marginTop: 24,
                    padding: 16,
                    background: "#f0f5ff",
                    borderRadius: 8,
                    border: "1px solid #adc6ff"
                  }}>
                    <Text>
                      <strong>🎯 目标设定建议：</strong>
                      根据您的学习习惯合理设定目标，循序渐进地提升社区活跃度。
                      系统会根据您设定的目标跟踪每日进度并提供激励提醒。
                    </Text>
                  </div>
                </Card>
              </Col>

              {/* 操作按钮 */}
              <Col span={24}>
                <div style={{
                  textAlign: "center",
                  padding: "24px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 16,
                  backdropFilter: "blur(10px)"
                }}>
                  <Space size="large">
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      size="large"
                      icon={<SaveOutlined />}
                      style={{
                        padding: "0 32px",
                        height: 48,
                        fontSize: 16,
                        borderRadius: 24,
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        border: "none"
                      }}
                    >
                      保存设置
                    </Button>
                    <Button
                      onClick={handleCancel}
                      size="large"
                      icon={<RollbackOutlined />}
                      style={{
                        padding: "0 32px",
                        height: 48,
                        fontSize: 16,
                        borderRadius: 24,
                        borderColor: "#667eea",
                        color: "#667eea"
                      }}
                    >
                      取消
                    </Button>
                  </Space>
                </div>
              </Col>
            </Row>
          </Form>
        </div>
      </div>
    </div>
  );
}