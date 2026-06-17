import React, { useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";

interface OnlineUsersChartProps {
  timeSeries: Array<{ timestamp: number; count: number }>;
  current: number;
  darkMode?: boolean;
}

const OnlineUsersChart: React.FC<OnlineUsersChartProps> = ({ timeSeries, current, darkMode }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  const seriesData = useMemo(
    () => timeSeries.map((p) => [p.timestamp, p.count]),
    [timeSeries]
  );

  useEffect(() => {
    if (!chartRef.current) return;
    instanceRef.current = echarts.init(chartRef.current, darkMode ? "dark" : undefined);

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      instanceRef.current?.dispose();
    };
  }, [darkMode]);

  useEffect(() => {
    if (!instanceRef.current || seriesData.length === 0) return;

    const lineColor = darkMode ? "#40a9ff" : "#1890ff";

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      title: {
        text: `实时在线人数: ${current}`,
        left: "center",
        textStyle: {
          fontSize: 14,
          fontWeight: 500,
          color: darkMode ? "#e0e0e0" : "#333",
        },
      },
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const p = params[0];
          const time = new Date(p.value[0]).toLocaleTimeString("zh-CN");
          return `${time}<br/>在线人数: ${p.value[1]}`;
        },
      },
      grid: { top: 40, right: 20, bottom: 30, left: 50 },
      xAxis: {
        type: "time",
        splitLine: { show: false },
        axisLabel: {
          color: darkMode ? "#aaa" : "#666",
          formatter: (val: number) => new Date(val).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        },
        axisLine: { lineStyle: { color: darkMode ? "#3a3f55" : "#ccc" } },
      },
      yAxis: {
        type: "value",
        name: "人数",
        nameTextStyle: { color: darkMode ? "#aaa" : "#666" },
        min: 0,
        splitLine: { lineStyle: { type: "dashed", color: darkMode ? "#2a2f45" : "#e8e8e8" } },
        axisLabel: { color: darkMode ? "#aaa" : "#666" },
      },
      series: [
        {
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: lineColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: darkMode ? "rgba(64,169,255,0.35)" : "rgba(24,144,255,0.3)" },
              { offset: 1, color: darkMode ? "rgba(64,169,255,0.02)" : "rgba(24,144,255,0.02)" },
            ]),
          },
          data: seriesData,
        },
      ],
      animation: false,
    };

    instanceRef.current.setOption(option, { notMerge: false });
  }, [seriesData, current, darkMode]);

  return <div ref={chartRef} style={{ width: "100%", height: "100%" }} />;
};

export default OnlineUsersChart;
