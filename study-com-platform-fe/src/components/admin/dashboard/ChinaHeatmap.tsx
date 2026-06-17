import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";
import chinaGeoJson from "../../../assets/map/china.json";

let mapRegistered = false;

interface ChinaHeatmapProps {
  data: Array<{ name: string; value: number }>;
  darkMode?: boolean;
}

const ChinaHeatmap: React.FC<ChinaHeatmapProps> = ({ data, darkMode }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!mapRegistered) {
      echarts.registerMap("china", chinaGeoJson as any);
      mapRegistered = true;
    }

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
    if (!instanceRef.current) return;

    const maxValue = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 100;

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      title: {
        text: "活跃用户地区分布",
        left: "center",
        textStyle: {
          fontSize: 14,
          fontWeight: 500,
          color: darkMode ? "#e0e0e0" : "#333",
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => `${params.name}: ${params.value || 0} 人`,
      },
      visualMap: {
        min: 0,
        max: maxValue || 100,
        left: "left",
        bottom: 20,
        text: ["高", "低"],
        textStyle: { color: darkMode ? "#aaa" : "#333" },
        inRange: {
          color: darkMode
            ? ["#1a2a4a", "#1e5a8a", "#2196f3", "#64b5f6", "#bbdefb"]
            : ["#e0f7fa", "#80deea", "#26c6da", "#00acc1", "#006064"],
        },
        calculable: true,
      },
      series: [
        {
          name: "活跃用户",
          type: "map",
          map: "china",
          roam: true,
          label: { show: false },
          itemStyle: {
            borderColor: darkMode ? "#2a3a5a" : "#aaa",
            areaColor: darkMode ? "#1a2035" : "#e9ecef",
          },
          emphasis: {
            label: { show: true, fontSize: 12, color: darkMode ? "#fff" : "#333" },
            itemStyle: { areaColor: darkMode ? "#ffa726" : "#ffd54f" },
          },
          data: data,
        },
      ],
    };

    instanceRef.current.setOption(option, { notMerge: true });
  }, [data, darkMode]);

  return <div ref={chartRef} style={{ width: "100%", height: "100%" }} />;
};

export default ChinaHeatmap;
