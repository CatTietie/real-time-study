import { Progress, Space, Typography } from "antd";
import type { ProgressProps } from "antd";

const { Text } = Typography;

interface LearningProgressProps extends ProgressProps {
  title?: string;
  description?: string;
  showPercentage?: boolean;
}

export default function LearningProgress({ 
  title, 
  description, 
  showPercentage = true,
  percent = 0,
  ...props 
}: LearningProgressProps) {
  return (
    <div className="learning-progress">
      {(title || description) && (
        <Space direction="vertical" style={{ marginBottom: 12 }}>
          {title && <Text strong>{title}</Text>}
          {description && <Text type="secondary">{description}</Text>}
        </Space>
      )}
      
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <Progress 
            percent={percent}
            showInfo={showPercentage}
            className="student-progress"
            {...props}
          />
        </div>
        {showPercentage && (
          <Text strong style={{ minWidth: 40, textAlign: "right" }}>
            {Math.round(percent)}%
          </Text>
        )}
      </div>
    </div>
  );
}