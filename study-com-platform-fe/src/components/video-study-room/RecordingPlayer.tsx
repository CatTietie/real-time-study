import { useRef, useState, useEffect, useCallback } from "react";
import { Slider, Select, Button, Tooltip } from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons";

interface RecordingPlayerProps {
  url: string;
  title?: string;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const RecordingPlayer = ({ url, title }: RecordingPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  const handleSeek = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  }, []);

  const handleRateChange = useCallback((rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    <div ref={containerRef} className="bg-black rounded-lg overflow-hidden">
      {title && (
        <div className="px-3 py-2 text-white text-sm font-medium bg-gray-800">
          {title}
        </div>
      )}
      <div className="relative cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={url}
          className="w-full aspect-video"
          preload="metadata"
        />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <PlayCircleOutlined className="text-5xl text-white opacity-80" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-3 py-2 bg-gray-900 space-y-2">
        <Slider
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          tooltip={{ formatter: (val) => formatTime(val || 0) }}
          className="m-0"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="text"
              size="small"
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="text-white"
            />
            <span className="text-gray-300 text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Select
              size="small"
              value={playbackRate}
              onChange={handleRateChange}
              options={[
                { value: 0.5, label: "0.5x" },
                { value: 1, label: "1x" },
                { value: 1.5, label: "1.5x" },
                { value: 2, label: "2x" },
              ]}
              className="w-16"
              popupMatchSelectWidth={false}
            />
            <Tooltip title={isFullscreen ? "退出全屏" : "全屏"}>
              <Button
                type="text"
                size="small"
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                className="text-white"
              />
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};
