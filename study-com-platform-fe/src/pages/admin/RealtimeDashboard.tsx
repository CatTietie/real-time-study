import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Card, Badge, Typography, Button, Tooltip } from "antd";
import { FullscreenOutlined, FullscreenExitOutlined } from "@ant-design/icons";
import { useDashboardSocket } from "../../hooks/useDashboardSocket";
import KpiCards from "../../components/admin/dashboard/KpiCards";
import ChinaHeatmap from "../../components/admin/dashboard/ChinaHeatmap";
import OnlineUsersChart from "../../components/admin/dashboard/OnlineUsersChart";
import RealtimePostFeed from "../../components/admin/dashboard/RealtimePostFeed";

const { Title } = Typography;

const RealtimeDashboard: React.FC = () => {
  const { data, isConnected } = useDashboardSocket();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      setIsFullscreen(true);
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        exitFullscreen();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isFullscreen, exitFullscreen]);

  const renderContent = (darkMode: boolean) => {
    const bg = darkMode ? "#0f1423" : undefined;
    const cardBg = darkMode ? "#161b2e" : undefined;
    const cardBorder = darkMode ? "1px solid #2a2f45" : undefined;

    return (
      <div style={{ padding: darkMode ? 24 : 0, background: bg, minHeight: darkMode ? "100vh" : undefined, color: darkMode ? "#e0e0e0" : undefined }}>
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Title level={4} style={{ margin: 0, color: darkMode ? "#fff" : undefined }}>实时监控大屏</Title>
            <Badge
              status={isConnected ? "success" : "error"}
              text={<span style={{ color: darkMode ? "#aaa" : undefined }}>{isConnected ? "已连接" : "连接断开"}</span>}
            />
          </div>
          <Tooltip title={darkMode ? "退出全屏" : "全屏大屏模式"}>
            <Button
              type={darkMode ? "primary" : "default"}
              icon={darkMode ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={darkMode ? exitFullscreen : enterFullscreen}
            >
              {darkMode ? "退出全屏" : "全屏大屏"}
            </Button>
          </Tooltip>
        </div>

        <KpiCards data={data?.kpiCards || null} darkMode={darkMode} />

        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          <Card
            style={{ flex: 3, borderRadius: 8, background: cardBg, border: cardBorder }}
            styles={{ body: { height: 420, padding: 16 } }}
          >
            <ChinaHeatmap data={data?.provinceHeatmap || []} darkMode={darkMode} />
          </Card>
          <Card
            style={{ flex: 2, borderRadius: 8, background: cardBg, border: cardBorder }}
            styles={{ body: { height: 420, padding: 16 } }}
          >
            <OnlineUsersChart
              timeSeries={data?.onlineUsers.timeSeries || []}
              current={data?.onlineUsers.current || 0}
              darkMode={darkMode}
            />
          </Card>
        </div>

        <Card
          title={<span style={{ color: darkMode ? "#e0e0e0" : undefined }}>帖子实时动态</span>}
          style={{ marginTop: 16, borderRadius: 8, background: cardBg, border: cardBorder }}
          styles={{ header: { borderBottom: darkMode ? "1px solid #2a2f45" : undefined }, body: { height: 320, padding: 0 } }}
        >
          <RealtimePostFeed posts={data?.recentPosts || []} darkMode={darkMode} />
        </Card>

        <style>{`
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  };

  return (
    <>
      {renderContent(false)}
      {isFullscreen && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, overflow: "auto", background: "#0f1423" }}>
          {renderContent(true)}
        </div>,
        document.body
      )}
    </>
  );
};

export default RealtimeDashboard;
