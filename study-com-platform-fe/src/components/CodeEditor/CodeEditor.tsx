import { useRef, useCallback, useState, lazy, Suspense } from "react";
import { loader, type OnMount } from "@monaco-editor/react";
import { Select } from "antd";

loader.config({ "vs/nls": { availableLanguages: { "*": "" } } });

const Editor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.default })));

interface CodeEditorProps {
  language: "python" | "javascript";
  onLanguageChange: (lang: "python" | "javascript") => void;
  value: string;
  onChange: (code: string) => void;
  languages?: string[];
  readOnly?: boolean;
  height?: number;
  onHeightChange?: (h: number) => void;
  onRun?: () => void;
  onSubmit?: () => void;
}

const languageOptions = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
];

function EditorLoadingPlaceholder({ height }: { height: number }) {
  return (
    <div
      style={{
        height: `${height}px`,
        background: "#1e1e1e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6a6a6a",
        fontSize: 13,
        fontFamily: "'Fira Code', 'Consolas', monospace",
      }}
    >
      编辑器加载中...
    </div>
  );
}

export default function CodeEditor({
  language,
  onLanguageChange,
  value,
  onChange,
  languages = ["python", "javascript"],
  readOnly = false,
  height = 400,
  onHeightChange,
  onRun,
  onSubmit,
}: CodeEditorProps) {
  const filteredOptions = languageOptions.filter((opt) =>
    languages.includes(opt.value)
  );

  const monacoLanguage = language === "javascript" ? "javascript" : "python";
  const onRunRef = useRef(onRun);
  const onSubmitRef = useRef(onSubmit);
  onRunRef.current = onRun;
  onSubmitRef.current = onSubmit;

  const [editorReady, setEditorReady] = useState(false);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    setEditorReady(true);
    editor.addAction({
      id: "run-code",
      label: "运行代码",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => { onRunRef.current?.(); },
    });
    editor.addAction({
      id: "submit-code",
      label: "提交代码",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter],
      run: () => { onSubmitRef.current?.(); },
    });
  }, []);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = height;

      const onMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientY - startY;
        const newH = Math.min(800, Math.max(200, startHeight + delta));
        onHeightChange?.(newH);
      };
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [height, onHeightChange]
  );

  return (
    <div className="code-editor-wrapper">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          background: "#1e1e1e",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottom: "1px solid #333",
        }}
      >
        <Select
          value={language}
          onChange={onLanguageChange}
          options={filteredOptions}
          size="small"
          style={{ width: 140 }}
          variant="borderless"
          popupMatchSelectWidth={false}
        />
      </div>
      <Suspense fallback={<EditorLoadingPlaceholder height={height} />}>
        <Editor
          height={`${height}px`}
          language={monacoLanguage}
          value={value}
          onChange={(val) => onChange(val || "")}
          theme="vs-dark"
          onMount={handleEditorMount}
          loading={<EditorLoadingPlaceholder height={height} />}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            readOnly,
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
            tabSize: language === "python" ? 4 : 2,
            padding: { top: 12 },
          }}
        />
      </Suspense>
      {onHeightChange && (
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            height: 6,
            cursor: "row-resize",
            background: "linear-gradient(to bottom, #2d2d2d, #1e1e1e)",
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 32, height: 2, background: "#555", borderRadius: 1 }} />
        </div>
      )}
    </div>
  );
}
