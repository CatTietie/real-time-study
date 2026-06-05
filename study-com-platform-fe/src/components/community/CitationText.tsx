import { Tooltip } from "antd";
import type { CitationInfo } from "../../services/aiAssistant";

interface CitationTextProps {
  content: string;
  citations: CitationInfo[];
}

const CITATION_PATTERN = /\[\[cite:(\d+)\]\]/g;

export default function CitationText({ content, citations }: CitationTextProps) {
  if (!content) {
    return null;
  }

  if (!citations || citations.length === 0) {
    return <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{content}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(CITATION_PATTERN.source, "g");
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`t-${lastIndex}`}>
          {content.slice(lastIndex, match.index)}
        </span>,
      );
    }

    const citeIndex = parseInt(match[1]);
    const source = citations.find((c) => c.index === citeIndex);

    if (source && source.id && source.type) {
      const href =
        source.type === "post"
          ? `/community/post/${source.id}`
          : `/student/notes/${source.id}`;

      parts.push(
        <Tooltip key={`c-${match.index}`} title={`来源：${source.title || "未知"}`}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              color: "#1890ff",
              textDecoration: "underline",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: "0.9em",
            }}
          >
            [{citeIndex}]
          </a>
        </Tooltip>,
      );
    } else {
      // Index out of range or source data invalid — render original marker as plain text
      parts.push(
        <span key={`c-${match.index}`} style={{ color: "#999", fontSize: "0.85em" }}>
          {match[0]}
        </span>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(<span key={`t-${lastIndex}`}>{content.slice(lastIndex)}</span>);
  }

  return (
    <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {parts}
    </span>
  );
}
