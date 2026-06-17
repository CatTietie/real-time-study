import { useEffect, useRef, useCallback, useState } from "react";

interface UseScreenShareCompositorProps {
  screenVideoRef: React.RefObject<HTMLVideoElement | null>;
  tldrawCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  fps?: number;
}

export const useScreenShareCompositor = ({
  screenVideoRef,
  tldrawCanvasRef,
  enabled,
  fps = 15,
}: UseScreenShareCompositorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const [compositedStream, setCompositedStream] = useState<MediaStream | null>(null);
  const lastFrameTimeRef = useRef(0);
  const frameInterval = 1000 / fps;

  const startCompositing = useCallback(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (timestamp: number) => {
      if (!enabled) return;

      if (timestamp - lastFrameTimeRef.current < frameInterval) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameTimeRef.current = timestamp;

      const video = screenVideoRef.current;
      if (video && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const tldrawCanvas = tldrawCanvasRef.current;
        if (tldrawCanvas && tldrawCanvas.width > 0) {
          ctx.drawImage(tldrawCanvas, 0, 0, canvas.width, canvas.height);
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    const stream = canvas.captureStream(fps);
    setCompositedStream(stream);
  }, [enabled, fps, frameInterval, screenVideoRef, tldrawCanvasRef]);

  const stopCompositing = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (compositedStream) {
      compositedStream.getTracks().forEach((t) => t.stop());
      setCompositedStream(null);
    }
  }, [compositedStream]);

  useEffect(() => {
    if (enabled) {
      startCompositing();
    } else {
      stopCompositing();
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [enabled, startCompositing, stopCompositing]);

  return { compositedStream, compositorCanvas: canvasRef };
};
