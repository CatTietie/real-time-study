import { useEffect, useState } from "react";
import { Tag, message, Spin, Tooltip } from "antd";
import {
  EyeOutlined,
  HeartOutlined,
  MessageOutlined,
  StarOutlined,
  CloseOutlined,
  TeamOutlined,
  ArrowRightOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  fetchRecommendations,
  submitRecommendationFeedback,
} from "../../services/communityPublic";

interface RecommendationItem {
  id: number;
  target_type: "post" | "study_room";
  target_id: number;
  score: number;
  reason: string;
  detail: any;
}

export default function RecommendationSection() {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const res = await fetchRecommendations();
      if (res.success) {
        setRecommendations((res.data || []).slice(0, 5));
      }
    } catch {
      // 静默处理，不影响其他模块
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (item: RecommendationItem) => {
    try {
      await submitRecommendationFeedback(item.id, "click");
    } catch {}
    if (item.target_type === "post") {
      navigate(`/community/posts/${item.target_id}`);
    } else {
      navigate(`/student/study-rooms`);
    }
  };

  const handleDismiss = async (e: React.MouseEvent, item: RecommendationItem) => {
    e.stopPropagation();
    try {
      await submitRecommendationFeedback(item.id, "dismiss");
      setRecommendations((prev) => prev.filter((r) => r.id !== item.id));
    } catch {
      message.error("操作失败");
    }
  };

  const handleFavorite = async (e: React.MouseEvent, item: RecommendationItem) => {
    e.stopPropagation();
    try {
      await submitRecommendationFeedback(item.id, "favorite");
      message.success("已收藏");
    } catch {
      message.error("收藏失败");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="dashboard-card-body" style={{ textAlign: "center", padding: "40px" }}>
          <Spin />
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-card-title">
          <div
            className="dashboard-card-title-icon"
            style={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              color: "#fff",
            }}
          >
            <BulbOutlined />
          </div>
          <span>为你推荐</span>
        </div>
      </div>
      <div className="dashboard-card-body">
        <div className="recommendation-list">
          {recommendations.map((item) => (
            <div
              key={item.id}
              className={`recommendation-card ${item.target_type}`}
              onClick={() => handleClick(item)}
            >
              <div className="recommendation-card-main">
                {item.target_type === "post" ? (
                  <PostCard item={item} />
                ) : (
                  <RoomCard item={item} />
                )}
              </div>
              <div className="recommendation-reason">
                <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
                  {item.reason}
                </Tag>
              </div>
              <div className="recommendation-actions">
                {item.target_type === "post" && (
                  <Tooltip title="收藏">
                    <button
                      className="recommendation-action-btn"
                      onClick={(e) => handleFavorite(e, item)}
                    >
                      <StarOutlined />
                    </button>
                  </Tooltip>
                )}
                <Tooltip title="不感兴趣">
                  <button
                    className="recommendation-action-btn dismiss"
                    onClick={(e) => handleDismiss(e, item)}
                  >
                    <CloseOutlined />
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PostCard({ item }: { item: RecommendationItem }) {
  const { detail } = item;
  return (
    <>
      <div className="recommendation-title">{detail.title}</div>
      <div className="recommendation-meta">
        {detail.category && (
          <Tag color="blue" style={{ marginRight: 8, fontSize: 11 }}>
            {detail.category}
          </Tag>
        )}
        <span className="recommendation-stat">
          <EyeOutlined /> {detail.view_count || 0}
        </span>
        <span className="recommendation-stat">
          <HeartOutlined /> {detail.like_count || 0}
        </span>
        <span className="recommendation-stat">
          <MessageOutlined /> {detail.comment_count || 0}
        </span>
      </div>
    </>
  );
}

function RoomCard({ item }: { item: RecommendationItem }) {
  const { detail } = item;
  return (
    <>
      <div className="recommendation-title">{detail.name}</div>
      <div className="recommendation-meta">
        <span className="recommendation-stat">
          <TeamOutlined /> {detail.current_occupancy || 0}/{detail.capacity}人
        </span>
        {detail.description && (
          <span className="recommendation-room-desc">
            {detail.description.slice(0, 30)}
            {detail.description.length > 30 ? "..." : ""}
          </span>
        )}
      </div>
    </>
  );
}
