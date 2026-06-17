import React, { useEffect, useState } from "react";
import { Button, Space, Spin, InputNumber } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";

interface SlideContent {
  texts: Array<{ text: string; x: number; y: number; fontSize: number; bold: boolean }>;
  images: Array<{ src: string; x: number; y: number; width: number; height: number }>;
}

interface PptxViewerProps {
  url: string;
  onPageChange?: (page: number) => void;
}

const PptxViewer: React.FC<PptxViewerProps> = ({ url, onPageChange }) => {
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPptx = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(url);
        if (!response.ok) throw new Error("文件加载失败");
        const arrayBuffer = await response.arrayBuffer();

        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(arrayBuffer);

        const slideFiles = Object.keys(zip.files)
          .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
            const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
            return numA - numB;
          });

        if (slideFiles.length === 0) {
          throw new Error("未找到幻灯片内容");
        }

        const relsMap = new Map<string, Map<string, string>>();
        for (const slideFile of slideFiles) {
          const slideNum = slideFile.match(/slide(\d+)/)?.[1] || "1";
          const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
          const relsFile = zip.file(relsPath);
          if (relsFile) {
            const relsContent = await relsFile.async("string");
            const relEntries = new Map<string, string>();
            const relRegex = /Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"[^>]+Type="[^"]*image[^"]*"/g;
            let match;
            while ((match = relRegex.exec(relsContent)) !== null) {
              relEntries.set(match[1], match[2]);
            }
            relsMap.set(slideFile, relEntries);
          }
        }

        const parsedSlides: SlideContent[] = [];

        for (const slideFile of slideFiles) {
          const content = await zip.file(slideFile)?.async("string");
          if (!content) {
            parsedSlides.push({ texts: [], images: [] });
            continue;
          }

          const texts: SlideContent["texts"] = [];
          const images: SlideContent["images"] = [];

          const spRegex = /<p:sp\b[\s\S]*?<\/p:sp>/g;
          let spMatch;
          while ((spMatch = spRegex.exec(content)) !== null) {
            const sp = spMatch[0];

            let x = 10, y = 10;
            const offMatch = sp.match(/<a:off[^>]+x="(\d+)"[^>]+y="(\d+)"/);
            if (offMatch) {
              x = Math.round(parseInt(offMatch[1]) / 91440 * 10);
              y = Math.round(parseInt(offMatch[2]) / 91440 * 10);
            }

            const paraRegex = /<a:p\b[\s\S]*?<\/a:p>/g;
            let paraMatch;
            let paraY = y;
            while ((paraMatch = paraRegex.exec(sp)) !== null) {
              const para = paraMatch[0];
              const runRegex = /<a:r>([\s\S]*?)<\/a:r>/g;
              let runMatch;
              let lineText = "";
              let fontSize = 18;
              let bold = false;

              while ((runMatch = runRegex.exec(para)) !== null) {
                const run = runMatch[1];
                const textMatch = run.match(/<a:t>([\s\S]*?)<\/a:t>/);
                if (textMatch) lineText += textMatch[1];

                const sizeMatch = run.match(/sz="(\d+)"/);
                if (sizeMatch) fontSize = Math.round(parseInt(sizeMatch[1]) / 100);

                if (run.includes('b="1"')) bold = true;
              }

              if (lineText.trim()) {
                texts.push({ text: lineText, x, y: paraY, fontSize: Math.max(12, Math.min(fontSize, 48)), bold });
              }
              paraY += fontSize + 8;
            }
          }

          const rels = relsMap.get(slideFile);
          if (rels) {
            const picRegex = /<p:pic\b[\s\S]*?<\/p:pic>/g;
            let picMatch;
            while ((picMatch = picRegex.exec(content)) !== null) {
              const pic = picMatch[0];
              const embedMatch = pic.match(/r:embed="([^"]+)"/);
              const offMatch2 = pic.match(/<a:off[^>]+x="(\d+)"[^>]+y="(\d+)"/);
              const extMatch = pic.match(/<a:ext[^>]+cx="(\d+)"[^>]+cy="(\d+)"/);

              if (embedMatch) {
                const relTarget = rels.get(embedMatch[1]);
                if (relTarget) {
                  const imagePath = `ppt/slides/${relTarget}`.replace(/\/\.\.\//g, "/").replace(/ppt\/slides\/\.\.\//, "ppt/");
                  const imageFile = zip.file(imagePath);
                  if (imageFile) {
                    const imageData = await imageFile.async("base64");
                    const ext = imagePath.split(".").pop()?.toLowerCase() || "png";
                    const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : "image/png";
                    images.push({
                      src: `data:${mimeType};base64,${imageData}`,
                      x: offMatch2 ? Math.round(parseInt(offMatch2[1]) / 91440 * 10) : 10,
                      y: offMatch2 ? Math.round(parseInt(offMatch2[2]) / 91440 * 10) : 10,
                      width: extMatch ? Math.round(parseInt(extMatch[1]) / 91440 * 10) : 200,
                      height: extMatch ? Math.round(parseInt(extMatch[2]) / 91440 * 10) : 150,
                    });
                  }
                }
              }
            }
          }

          parsedSlides.push({ texts, images });
        }

        if (!cancelled) {
          setSlides(parsedSlides);
          setCurrentSlide(1);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "PPT 解析失败");
          setLoading(false);
        }
      }
    };

    loadPptx();
    return () => { cancelled = true; };
  }, [url]);

  const changePage = (delta: number) => {
    const newPage = Math.min(Math.max(1, currentSlide + delta), slides.length);
    setCurrentSlide(newPage);
    onPageChange?.(newPage);
  };

  const goToPage = (page: number | null) => {
    if (page && page >= 1 && page <= slides.length) {
      setCurrentSlide(page);
      onPageChange?.(page);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Spin size="large" tip="正在解析 PPT..." />
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: 24, textAlign: "center", color: "#ff4d4f" }}>{error}</div>;
  }

  const slide = slides[currentSlide - 1];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ marginBottom: 12, position: "sticky", top: 0, zIndex: 10, background: "#fff", padding: "8px 0", width: "100%" }}>
        <Space style={{ display: "flex", justifyContent: "center" }}>
          <Button icon={<LeftOutlined />} disabled={currentSlide <= 1} onClick={() => changePage(-1)} />
          <span>
            <InputNumber
              min={1}
              max={slides.length}
              value={currentSlide}
              onChange={goToPage}
              style={{ width: 60 }}
              size="small"
            />
            {" / "}
            {slides.length}
          </span>
          <Button icon={<RightOutlined />} disabled={currentSlide >= slides.length} onClick={() => changePage(1)} />
        </Space>
      </div>

      <div
        style={{
          position: "relative",
          width: 800,
          maxWidth: "100%",
          height: 500,
          background: "#ffffff",
          border: "1px solid #e8e8e8",
          borderRadius: 4,
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {slide?.images.map((img, i) => (
          <img
            key={i}
            src={img.src}
            alt=""
            style={{
              position: "absolute",
              left: `${(img.x / 800) * 100}%`,
              top: `${(img.y / 500) * 100}%`,
              width: `${(img.width / 800) * 100}%`,
              height: `${(img.height / 500) * 100}%`,
              objectFit: "contain",
            }}
          />
        ))}
        {slide?.texts.map((t, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${Math.min((t.x / 800) * 100, 90)}%`,
              top: `${Math.min((t.y / 500) * 100, 90)}%`,
              maxWidth: "85%",
              fontSize: t.fontSize,
              fontWeight: t.bold ? 700 : 400,
              lineHeight: 1.4,
              color: "#333",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {t.text}
          </div>
        ))}
        {(!slide || (slide.texts.length === 0 && slide.images.length === 0)) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
            空白幻灯片
          </div>
        )}
      </div>
    </div>
  );
};

export default PptxViewer;
