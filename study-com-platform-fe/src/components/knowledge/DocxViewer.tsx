import React, { useEffect, useRef } from "react";
import { Spin } from "antd";

interface DocxViewerProps {
  url: string;
}

const DocxViewer: React.FC<DocxViewerProps> = ({ url }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDocx = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to load document");
        const blob = await response.blob();

        const docxPreview = await import("docx-preview");

        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = "";
        await docxPreview.renderAsync(blob, containerRef.current, undefined, {
          className: "docx-preview-wrapper",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
        });

        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to render document");
          setLoading(false);
        }
      }
    };

    loadDocx();
    return () => { cancelled = true; };
  }, [url]);

  if (error) {
    return <div style={{ padding: 24, textAlign: "center", color: "#ff4d4f" }}>{error}</div>;
  }

  return (
    <div style={{ position: "relative", minHeight: 400 }}>
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <Spin size="large" tip="Loading document..." />
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", overflow: "auto" }} />
    </div>
  );
};

export default DocxViewer;
