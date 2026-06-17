import { useRef, useEffect, useState, useCallback } from "react";
import { Button, Tooltip } from "antd";
import { EditOutlined, StopOutlined } from "@ant-design/icons";

interface ScreenShareWhiteboardProps {
  screenStream: MediaStream;
  whiteboardEnabled: boolean;
  onCompositedStreamReady: (stream: MediaStream) => void;
  onToggle: (enabled: boolean) => void;
}

export const ScreenShareWhiteboard = ({
  screenStream,
  whiteboardEnabled,
  onCompositedStreamReady,
  onToggle,
}: ScreenShareWhiteboardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const compositedStreamRef = useRef<MediaStream | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [brushColor, setBrushColor] = useState("#ff0000");
  const [brushSize, setBrushSize] = useState(3);

  // Attach screen stream to hidden video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Run compositing loop: always composites screen video + optional whiteboard drawing
  // This produces the single stream used for both WebRTC peers AND recording
  useEffect(() => {
    const video = videoRef.current;
    const compositeCanvas = compositeCanvasRef.current;
    if (!video || !compositeCanvas) return;

    const ctx = compositeCanvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        if (compositeCanvas.width !== video.videoWidth || compositeCanvas.height !== video.videoHeight) {
          compositeCanvas.width = video.videoWidth;
          compositeCanvas.height = video.videoHeight;
        }

        // Draw screen capture frame
        ctx.drawImage(video, 0, 0);

        // Overlay whiteboard drawings if enabled and canvas has content
        if (whiteboardEnabled && drawCanvasRef.current) {
          ctx.drawImage(drawCanvasRef.current, 0, 0, compositeCanvas.width, compositeCanvas.height);
        }
      }
      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    // Create the composited stream once and reuse it
    if (!compositedStreamRef.current) {
      const stream = compositeCanvas.captureStream(15);
      // Also add audio track from screen stream if available
      const audioTracks = screenStream.getAudioTracks();
      audioTracks.forEach((track) => stream.addTrack(track));
      compositedStreamRef.current = stream;
      onCompositedStreamReady(stream);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };
  }, [screenStream, whiteboardEnabled, onCompositedStreamReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      compositedStreamRef.current = null;
    };
  }, []);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!whiteboardEnabled) return;
    isDrawingRef.current = true;
    lastPosRef.current = getCanvasPos(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !whiteboardEnabled) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPosRef.current = pos;
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ffffff", "#000000"];

  return (
    <div className="relative w-full h-full">
      {/* Visible video preview of the screen share */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />
      {/* Hidden composite canvas that produces the output stream */}
      <canvas ref={compositeCanvasRef} className="hidden" />

      {/* Drawing canvas overlaid on top of video (transparent background) */}
      <canvas
        ref={drawCanvasRef}
        width={1920}
        height={1080}
        className={`absolute inset-0 w-full h-full ${whiteboardEnabled ? "cursor-crosshair z-10" : "pointer-events-none z-10"}`}
        style={{ background: "transparent" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Whiteboard toolbar (only when enabled) */}
      {whiteboardEnabled && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-2 bg-black/60 rounded px-2 py-1">
          {colors.map((color) => (
            <button
              key={color}
              className="w-5 h-5 rounded-full border-2"
              style={{
                backgroundColor: color,
                borderColor: brushColor === color ? "#fff" : "transparent",
              }}
              onClick={() => setBrushColor(color)}
            />
          ))}
          <select
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="bg-gray-700 text-white text-xs rounded px-1"
          >
            <option value={2}>细</option>
            <option value={3}>中</option>
            <option value={6}>粗</option>
          </select>
          <button
            onClick={clearDrawing}
            className="text-white text-xs bg-red-600 px-2 py-0.5 rounded"
          >
            清除
          </button>
        </div>
      )}

      {/* Toggle button */}
      <div className="absolute bottom-2 right-2 z-20">
        <Tooltip title={whiteboardEnabled ? "关闭白板" : "开启白板涂鸦"}>
          <Button
            size="small"
            type={whiteboardEnabled ? "primary" : "default"}
            icon={whiteboardEnabled ? <StopOutlined /> : <EditOutlined />}
            onClick={() => onToggle(!whiteboardEnabled)}
          >
            {whiteboardEnabled ? "关闭涂鸦" : "白板涂鸦"}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};
