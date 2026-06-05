import { useRef, useEffect, useState, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Spin,
  Modal,
  message,
  Empty,
  Skeleton,
} from "antd";
import {
  ShareAltOutlined,
  DownloadOutlined,
  FireOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import * as echarts from "echarts";
import { useAppSelector } from "../../app/hooks";
import type { RootState } from "../../app/store";
import {
  fetchLearningReport,
  type LearningReportData,
  type PointsSourceItem,
  type HeatmapData,
} from "../../services/communityPublic";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  post: "发帖",
  comment: "评论",
  like: "点赞",
  task: "任务",
  study: "学习",
  report: "举报",
  admin: "管理",
  system: "系统",
  remark: "备注",
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(null);
    }, 5000);

    img.onload = () => {
      clearTimeout(timeout);
      if (img.naturalWidth === 0) {
        resolve(null);
      } else {
        resolve(img);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    img.src = src;
  });
}

export default function LearningReport() {
  const { avatar, nickname } = useAppSelector(
    (state: RootState) => state.auth
  );

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LearningReportData | null>(null);
  const [chartsReady, setChartsReady] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareCardUrl, setShareCardUrl] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const reportContentRef = useRef<HTMLDivElement>(null);
  const heatmapChartRef = useRef<HTMLDivElement>(null);
  const radarChartRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);

  const heatmapInstance = useRef<echarts.ECharts | null>(null);
  const radarInstance = useRef<echarts.ECharts | null>(null);
  const trendInstance = useRef<echarts.ECharts | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setChartsReady(false);
    try {
      const res = await fetchLearningReport();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        message.error(res.message || "获取学习报告失败");
      }
    } catch {
      message.error("获取学习报告失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!data) return;

    let disposed = false;
    const initCharts = () => {
      if (disposed) return;

      if (heatmapChartRef.current) {
        if (heatmapInstance.current) heatmapInstance.current.dispose();
        const chart = echarts.init(heatmapChartRef.current);
        heatmapInstance.current = chart;
        const { range, calendarData } = buildHeatmapData(data.heatmap);
        chart.setOption({
          tooltip: {
            formatter: (params: any) => {
              const d = params.data;
              if (!d) return "";
              return `${d[0]}<br/>学习时长: ${d[1]} 分钟`;
            },
          },
          visualMap: {
            min: 0,
            max: Math.max(...calendarData.map((d: any) => d[1]), 60),
            show: true,
            orient: "horizontal",
            left: "center",
            bottom: 0,
            inRange: {
              color: ["#ebedf0", "#c6e48b", "#7bc96f", "#239a3b", "#196127"],
            },
            text: ["多", "少"],
            textStyle: { color: "#666" },
          },
          calendar: {
            range,
            cellSize: [16, 16],
            left: 60,
            right: 30,
            top: 20,
            bottom: 40,
            itemStyle: { borderWidth: 3, borderColor: "#fff" },
            yearLabel: { show: false },
            dayLabel: { nameMap: "ZH", color: "#999" },
            monthLabel: { nameMap: "ZH", color: "#999" },
          },
          series: [
            {
              type: "heatmap",
              coordinateSystem: "calendar",
              data: calendarData,
            },
          ],
        });
      }

      if (radarChartRef.current && data.pointsRadar.length >= 3) {
        if (radarInstance.current) radarInstance.current.dispose();
        const chart = echarts.init(radarChartRef.current);
        radarInstance.current = chart;
        const radarData = buildRadarData(data.pointsRadar);
        chart.setOption({
          tooltip: {},
          radar: {
            indicator: radarData.indicators,
            shape: "circle",
            splitArea: {
              areaStyle: {
                color: ["rgba(102,126,234,0.05)", "rgba(102,126,234,0.1)"],
              },
            },
            axisLine: { lineStyle: { color: "rgba(0,0,0,0.1)" } },
            splitLine: { lineStyle: { color: "rgba(0,0,0,0.1)" } },
          },
          series: [
            {
              type: "radar",
              data: [
                {
                  value: radarData.values,
                  name: "积分来源",
                  areaStyle: { color: "rgba(102,126,234,0.3)" },
                  lineStyle: { color: "#667eea", width: 2 },
                  itemStyle: { color: "#667eea" },
                },
              ],
            },
          ],
        });
      }

      if (trendChartRef.current) {
        if (trendInstance.current) trendInstance.current.dispose();
        const chart = echarts.init(trendChartRef.current);
        trendInstance.current = chart;
        const dates = data.trend30Days.map((d) => d.date.slice(5));
        const durations = data.trend30Days.map((d) => d.duration);
        chart.setOption({
          tooltip: {
            trigger: "axis",
            formatter: (params: any) => {
              const p = params[0];
              return `${p.axisValue}<br/>学习时长: ${p.value} 分钟`;
            },
          },
          grid: { left: 50, right: 20, top: 20, bottom: 30 },
          xAxis: {
            type: "category",
            data: dates,
            axisLabel: { interval: 4, color: "#999" },
            axisLine: { lineStyle: { color: "#eee" } },
          },
          yAxis: {
            type: "value",
            axisLabel: { color: "#999" },
            splitLine: { lineStyle: { color: "#f5f5f5" } },
          },
          series: [
            {
              type: "line",
              smooth: true,
              data: durations,
              symbol: "circle",
              symbolSize: 6,
              lineStyle: { color: "#667eea", width: 3 },
              itemStyle: { color: "#667eea" },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(102,126,234,0.4)" },
                  { offset: 1, color: "rgba(102,126,234,0.02)" },
                ]),
              },
            },
          ],
        });
      }

      if (!disposed) setChartsReady(true);
    };

    // Delay chart init to next frame so DOM refs are mounted
    const raf = requestAnimationFrame(initCharts);

    const handleResize = () => {
      heatmapInstance.current?.resize();
      radarInstance.current?.resize();
      trendInstance.current?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      heatmapInstance.current?.dispose();
      radarInstance.current?.dispose();
      trendInstance.current?.dispose();
      heatmapInstance.current = null;
      radarInstance.current = null;
      trendInstance.current = null;
    };
  }, [data]);

  const handleGenerateShareCard = async () => {
    if (!reportContentRef.current || !data) return;
    setGenerating(true);
    setShareModalVisible(true);
    setShareCardUrl("");

    try {
      const html2canvas = (await import("html2canvas")).default;
      const screenshot = await html2canvas(reportContentRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const cardWidth = 750;
      const headerHeight = 180;
      const screenshotHeight =
        screenshot.height * ((cardWidth - 60) / screenshot.width);
      const footerHeight = 60;
      const cardHeight = headerHeight + screenshotHeight + footerHeight;
      canvas.width = cardWidth;
      canvas.height = cardHeight;

      const gradient = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
      gradient.addColorStop(0, "#667eea");
      gradient.addColorStop(1, "#764ba2");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, cardWidth, cardHeight);

      // Load avatar with timeout and validation
      let avatarLoaded = false;
      if (avatar) {
        const avatarImg = await loadImage(avatar);
        if (avatarImg) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cardWidth / 2, 60, 36, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(avatarImg, cardWidth / 2 - 36, 24, 72, 72);
          ctx.restore();
          avatarLoaded = true;
        }
      }

      // Draw default avatar placeholder if image failed
      if (!avatarLoaded) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cardWidth / 2, 60, 36, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fill();
        ctx.restore();
        // Draw simple user icon
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "28px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("👤", cardWidth / 2, 62);
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(
        `${nickname || "同学"} 的学习报告`,
        cardWidth / 2,
        120
      );

      ctx.font = "16px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(
        `累计学习 ${data.summary.totalHours} 小时，超过平台 ${data.summary.percentile}% 用户`,
        cardWidth / 2,
        150
      );

      ctx.drawImage(
        screenshot,
        30,
        headerHeight,
        cardWidth - 60,
        screenshotHeight
      );

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "— 学习社区平台 —",
        cardWidth / 2,
        cardHeight - 20
      );

      setShareCardUrl(canvas.toDataURL("image/png"));
    } catch {
      message.error("生成分享卡片失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCard = () => {
    if (!shareCardUrl) return;
    const link = document.createElement("a");
    link.download = `学习报告_${new Date().toISOString().split("T")[0]}.png`;
    link.href = shareCardUrl;
    link.click();
  };

  if (loading) {
    return (
      <div style={{ padding: "0 0 24px" }}>
        <Card
          style={{
            marginBottom: 24,
            borderRadius: 16,
            overflow: "hidden",
          }}
          styles={{ body: { padding: "32px 24px" } }}
        >
          <Skeleton active paragraph={{ rows: 2 }} />
        </Card>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card style={{ borderRadius: 12 }}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card style={{ borderRadius: 12 }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card style={{ borderRadius: 12 }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  if (!data) {
    return <Empty description="暂无学习数据" />;
  }

  return (
    <div style={{ padding: "0 0 24px" }}>
      <div ref={reportContentRef}>
        {/* Summary Banner */}
        <Card
          style={{
            marginBottom: 24,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            borderRadius: 16,
          }}
          styles={{ body: { padding: "32px 24px" } }}
        >
          <div style={{ textAlign: "center", color: "#fff" }}>
            <div style={{ marginBottom: 8 }}>
              <TrophyOutlined style={{ fontSize: 36, marginRight: 12 }} />
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              累计学习{" "}
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  background: "rgba(255,255,255,0.2)",
                  padding: "2px 12px",
                  borderRadius: 8,
                }}
              >
                {data.summary.totalHours}
              </span>{" "}
              小时
            </div>
            <div style={{ fontSize: 16, opacity: 0.9 }}>
              <FireOutlined style={{ marginRight: 6 }} />
              超过平台{" "}
              <span style={{ fontWeight: 700, fontSize: 20 }}>
                {data.summary.percentile}%
              </span>{" "}
              用户
            </div>
          </div>
        </Card>

        {/* Charts */}
        <Row gutter={[16, 16]}>
          {/* Heatmap */}
          <Col span={24}>
            <Card
              title="学习时长热力图"
              style={{ borderRadius: 12 }}
              styles={{ body: { padding: "12px 16px", position: "relative" } }}
            >
              {!chartsReady && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#fff",
                    zIndex: 1,
                    borderRadius: 12,
                  }}
                >
                  <Spin tip="加载图表..." />
                </div>
              )}
              <div
                ref={heatmapChartRef}
                style={{
                  width: "100%",
                  height: 180,
                  opacity: chartsReady ? 1 : 0,
                  transition: "opacity 0.3s ease",
                }}
              />
            </Card>
          </Col>

          {/* Radar */}
          <Col xs={24} lg={12}>
            <Card
              title="积分来源分布"
              style={{ borderRadius: 12 }}
              styles={{ body: { padding: "12px 16px", position: "relative" } }}
            >
              {data.pointsRadar.length >= 3 ? (
                <>
                  {!chartsReady && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#fff",
                        zIndex: 1,
                        borderRadius: 12,
                      }}
                    >
                      <Spin tip="加载图表..." />
                    </div>
                  )}
                  <div
                    ref={radarChartRef}
                    style={{
                      width: "100%",
                      height: 300,
                      opacity: chartsReady ? 1 : 0,
                      transition: "opacity 0.3s ease",
                    }}
                  />
                </>
              ) : (
                <Empty
                  description="积分数据不足，至少需要3种来源"
                  style={{ padding: "60px 0" }}
                />
              )}
            </Card>
          </Col>

          {/* Trend */}
          <Col xs={24} lg={12}>
            <Card
              title="30天学习趋势"
              style={{ borderRadius: 12 }}
              styles={{ body: { padding: "12px 16px", position: "relative" } }}
            >
              {!chartsReady && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#fff",
                    zIndex: 1,
                    borderRadius: 12,
                  }}
                >
                  <Spin tip="加载图表..." />
                </div>
              )}
              <div
                ref={trendChartRef}
                style={{
                  width: "100%",
                  height: 300,
                  opacity: chartsReady ? 1 : 0,
                  transition: "opacity 0.3s ease",
                }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Share button */}
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Button
          type="primary"
          size="large"
          icon={<ShareAltOutlined />}
          onClick={handleGenerateShareCard}
          disabled={!chartsReady}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            borderRadius: 8,
            height: 48,
            paddingInline: 32,
            fontSize: 16,
          }}
        >
          生成分享卡片
        </Button>
      </div>

      {/* Share Modal */}
      <Modal
        title="分享卡片"
        open={shareModalVisible}
        onCancel={() => setShareModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setShareModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownloadCard}
            disabled={!shareCardUrl || generating}
          >
            下载图片
          </Button>,
        ]}
        width={420}
        centered
      >
        {generating ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin tip="正在生成分享卡片..." />
          </div>
        ) : shareCardUrl ? (
          <img
            src={shareCardUrl}
            alt="分享卡片"
            style={{
              width: "100%",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function buildHeatmapData(heatmap: HeatmapData[]) {
  if (heatmap.length === 0) {
    return { range: "", calendarData: [] };
  }

  const dates = heatmap.map((h) => h.date).sort();
  const range = [dates[0], dates[dates.length - 1]];
  const calendarData = heatmap.map((h) => [h.date, h.details.duration]);

  return { range, calendarData };
}

function buildRadarData(pointsRadar: PointsSourceItem[]) {
  const filtered = pointsRadar.filter((p) => p.totalPoints > 0);

  if (filtered.length < 3) {
    const allTypes = ["post", "comment", "like", "task", "study", "system"];
    const existing = new Set(filtered.map((f) => f.sourceType));
    for (const t of allTypes) {
      if (!existing.has(t) && filtered.length < 3) {
        filtered.push({ sourceType: t, totalPoints: 0, count: 0 });
        existing.add(t);
      }
    }
  }

  const maxVal = Math.max(...filtered.map((f) => f.totalPoints), 10);
  const indicators = filtered.map((f) => ({
    name: SOURCE_TYPE_LABELS[f.sourceType] || f.sourceType,
    max: maxVal,
  }));
  const values = filtered.map((f) => f.totalPoints);

  return { indicators, values };
}
