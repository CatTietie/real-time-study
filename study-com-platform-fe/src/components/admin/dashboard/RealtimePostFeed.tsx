import React, { useEffect, useRef, useState } from "react";
import { Tag } from "antd";
import { LikeOutlined, MessageOutlined } from "@ant-design/icons";

interface Post {
  id: number;
  title: string;
  author: string;
  category: string;
  createdAt: string;
  status: number;
  likeCount: number;
  commentCount: number;
}

interface RealtimePostFeedProps {
  posts: Post[];
  darkMode?: boolean;
}

const statusMap: Record<number, { color: string; text: string }> = {
  0: { color: "orange", text: "待审核" },
  1: { color: "green", text: "已通过" },
  2: { color: "red", text: "已拒绝" },
};

const RealtimePostFeed: React.FC<RealtimePostFeedProps> = ({ posts, darkMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [posts[0]?.id]);

  useEffect(() => {
    if (isPaused || !containerRef.current) {
      if (scrollTimerRef.current) {
        clearInterval(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
      return;
    }

    scrollTimerRef.current = setInterval(() => {
      const el = containerRef.current;
      if (!el) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        el.scrollTop = 0;
      } else {
        el.scrollTop += 52;
      }
    }, 3000);

    return () => {
      if (scrollTimerRef.current) {
        clearInterval(scrollTimerRef.current);
      }
    };
  }, [isPaused]);

  const borderColor = darkMode ? "#2a2f45" : "#f0f0f0";
  const textColor = darkMode ? "#e0e0e0" : undefined;
  const subTextColor = darkMode ? "#8c8c8c" : "#8c8c8c";

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "0 4px",
        scrollBehavior: "smooth",
      }}
    >
      {posts.map((post, index) => {
        const status = statusMap[post.status] || { color: "default", text: "未知" };
        const time = post.createdAt
          ? new Date(post.createdAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "";

        return (
          <div
            key={post.id}
            style={{
              padding: "10px 12px",
              borderBottom: `1px solid ${borderColor}`,
              animation: index === 0 ? "fadeInDown 0.3s ease" : undefined,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{
                  fontWeight: 500,
                  fontSize: 14,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "55%",
                  color: textColor,
                }}
              >
                {post.title || "(无标题)"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: subTextColor, fontSize: 12 }}>
                  <LikeOutlined /> {post.likeCount || 0}
                </span>
                <span style={{ color: subTextColor, fontSize: 12 }}>
                  <MessageOutlined /> {post.commentCount || 0}
                </span>
                <Tag color={status.color} style={{ marginLeft: 4 }}>
                  {status.text}
                </Tag>
              </div>
            </div>
            <div style={{ marginTop: 4, color: subTextColor, fontSize: 12, display: "flex", gap: 12 }}>
              <span>{post.author}</span>
              {post.category && <span>{post.category}</span>}
              <span>{time}</span>
            </div>
          </div>
        );
      })}
      {posts.length === 0 && (
        <div style={{ textAlign: "center", color: "#bfbfbf", padding: 40 }}>
          暂无帖子数据
        </div>
      )}
    </div>
  );
};

export default RealtimePostFeed;
