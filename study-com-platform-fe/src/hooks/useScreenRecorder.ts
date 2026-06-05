import { useState, useRef, useCallback } from "react";

interface UseScreenRecorderProps {
  onRecordingComplete?: (blob: Blob, duration: number) => void;
}

export const useScreenRecorder = ({ onRecordingComplete }: UseScreenRecorderProps = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const durationIntervalRef = useRef<number>(0);

  const getSupportedMimeType = () => {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "video/webm";
  };

  const startRecording = useCallback((stream: MediaStream) => {
    if (!stream || stream.getTracks().length === 0) return;

    chunksRef.current = [];
    const mimeType = getSupportedMimeType();

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 1_500_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const duration = (Date.now() - startTimeRef.current) / 1000;
      setIsRecording(false);
      clearInterval(durationIntervalRef.current);
      setRecordingDuration(0);
      onRecordingComplete?.(blob, duration);
    };

    recorder.start(1000);
    recorderRef.current = recorder;
    startTimeRef.current = Date.now();
    setIsRecording(true);

    durationIntervalRef.current = window.setInterval(() => {
      setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
  }, []);

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
  };
};
