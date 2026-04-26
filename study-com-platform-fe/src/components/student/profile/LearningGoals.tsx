import { Card, Form, Typography, Button, Row, Col, Space } from "antd";
import { 
  FireOutlined, 
  MessageOutlined, 
  TrophyOutlined, 
  StarOutlined,
  PlusOutlined,
  MinusOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface GoalCardProps {
  icon: React.ReactNode;
  title: string;
  unit: string;
  description: string;
  name: string;
  min: number;
  max: number;
  step: number;
  colorClass: string;
  iconColor: string;
  initialValue?: number;
  form: ReturnType<typeof Form.useForm>;
}

function GoalCard({ 
  icon, 
  title, 
  unit, 
  description, 
  name, 
  min, 
  max, 
  step,
  colorClass,
  iconColor,
  initialValue,
  form
}: GoalCardProps) {
  const value = Form.useWatch(name, form);
  const currentValue = value ?? initialValue ?? 0;

  const handleStep = (type: 'plus' | 'minus') => {
    let newValue = type === 'plus' ? currentValue + step : currentValue - step;
    if (min !== undefined) newValue = Math.max(min, newValue);
    if (max !== undefined) newValue = Math.min(max, newValue);
    form.setFieldValue(name, newValue);
  };

  return (
    <div className={`goal-card ${colorClass} fade-in-up`}>
      <div className="goal-icon" style={{ color: iconColor }}>
        {icon}
      </div>
      <Title level={5} className="goal-title">
        {title}
      </Title>
      <Text className="goal-unit">
        {unit}
      </Text>
      
      <Form.Item
        name={name}
        initialValue={initialValue}
        style={{ margin: 0 }}
      >
        <div className="goal-input-wrapper">
          <Button
            icon={<MinusOutlined />}
            onClick={() => handleStep('minus')}
            className="goal-btn goal-btn-minus"
            disabled={currentValue <= min}
          />
          <div className="goal-value">
            {currentValue}
          </div>
          <Button
            icon={<PlusOutlined />}
            onClick={() => handleStep('plus')}
            className="goal-btn goal-btn-plus"
            disabled={currentValue >= max}
          />
        </div>
      </Form.Item>
      
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 12, color: "#64748b" }}>
        {description}
      </Text>
    </div>
  );
}

interface LearningGoalsProps {
  initialGoals?: {
    goalPosts?: number;
    goalComments?: number;
    goalHotPosts?: number;
    goalPoints?: number;
  };
}

export default function LearningGoals({ initialGoals = {} }: LearningGoalsProps) {
  const {
    goalPosts = 3,
    goalComments = 20,
    goalHotPosts = 1,
    goalPoints = 500
  } = initialGoals;

  const form = Form.useFormInstance();

  return (
    <Card
      title={
        <Space>
          <FireOutlined style={{ color: "#ff4d4f" }} />
          <span>学习目标设置</span>
        </Space>
      }
      className="profile-card fade-in-up"
    >
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={6}>
          <GoalCard
            icon={<FireOutlined style={{ fontSize: 40 }} />}
            title="发帖目标"
            unit="篇/天"
            description="每日发帖数量目标，积极分享您的学习心得"
            name="goalPosts"
            min={1}
            max={20}
            step={1}
            colorClass="goal-card-posts"
            iconColor="#1890ff"
            initialValue={goalPosts}
            form={form}
          />
        </Col>

        <Col xs={24} sm={12} md={6}>
          <GoalCard
            icon={<MessageOutlined style={{ fontSize: 40 }} />}
            title="评论目标"
            unit="条/天"
            description="每日评论数量目标，与同学互动交流学习"
            name="goalComments"
            min={5}
            max={100}
            step={5}
            colorClass="goal-card-comments"
            iconColor="#52c41a"
            initialValue={goalComments}
            form={form}
          />
        </Col>

        <Col xs={24} sm={12} md={6}>
          <GoalCard
            icon={<TrophyOutlined style={{ fontSize: 40 }} />}
            title="热榜任务"
            unit="篇/周"
            description="每周热榜帖子目标，创作高质量内容"
            name="goalHotPosts"
            min={0}
            max={10}
            step={1}
            colorClass="goal-card-hot"
            iconColor="#eb2f96"
            initialValue={goalHotPosts}
            form={form}
          />
        </Col>

        <Col xs={24} sm={12} md={6}>
          <GoalCard
            icon={<StarOutlined style={{ fontSize: 40 }} />}
            title="积分目标"
            unit="分/月"
            description="每月积分获取目标，解锁更多特权"
            name="goalPoints"
            min={100}
            max={5000}
            step={100}
            colorClass="goal-card-points"
            iconColor="#faad14"
            initialValue={goalPoints}
            form={form}
          />
        </Col>
      </Row>

      <div className="goals-tip-box">
        <Text>
          <strong>🎯 目标设定建议：</strong>
          根据您的学习习惯合理设定目标，循序渐进地提升社区活跃度。
          系统会根据您设定的目标跟踪每日进度并提供激励提醒，帮助您持续进步。
        </Text>
      </div>
    </Card>
  );
}
