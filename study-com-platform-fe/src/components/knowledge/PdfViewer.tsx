import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button, Space, Spin, InputNumber } from "antd";
import { LeftOutlined, RightOutlined, ZoomInOutlined, ZoomOutOutlined } from "@ant-design/icons";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  onPageChange?: (page: number) => void;
  renderAnnotationLayer?: (pageNumber: number) => React.ReactNode;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url, onPageChange, renderAnnotationLayer }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (delta: number) => {
    const newPage = Math.min(Math.max(1, pageNumber + delta), numPages);
    setPageNumber(newPage);
    onPageChange?.(newPage);
  };

  const goToPage = (page: number | null) => {
    if (page && page >= 1 && page <= numPages) {
      setPageNumber(page);
      onPageChange?.(page);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ marginBottom: 12, position: "sticky", top: 0, zIndex: 10, background: "#fff", padding: "8px 0", width: "100%" }}>
        <Space style={{ display: "flex", justifyContent: "center" }}>
          <Button icon={<LeftOutlined />} disabled={pageNumber <= 1} onClick={() => changePage(-1)} />
          <span>
            <InputNumber
              min={1}
              max={numPages}
              value={pageNumber}
              onChange={goToPage}
              style={{ width: 60 }}
              size="small"
            />
            {" / "}
            {numPages}
          </span>
          <Button icon={<RightOutlined />} disabled={pageNumber >= numPages} onClick={() => changePage(1)} />
          <Button icon={<ZoomOutOutlined />} onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} />
          <Button icon={<ZoomInOutlined />} onClick={() => setScale((s) => Math.min(3, s + 0.2))} />
          <span>{Math.round(scale * 100)}%</span>
        </Space>
      </div>

      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<Spin size="large" style={{ margin: "100px 0" }} />}
        error={<div style={{ color: "#ff4d4f", padding: 24 }}>PDF loading failed</div>}
      >
        <div style={{ position: "relative" }}>
          <Page pageNumber={pageNumber} scale={scale} />
          {renderAnnotationLayer && (
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              {renderAnnotationLayer(pageNumber)}
            </div>
          )}
        </div>
      </Document>
    </div>
  );
};

export default PdfViewer;
