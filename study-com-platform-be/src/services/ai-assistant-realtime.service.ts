import { Server, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";
import Post from "../models/post.model";
import AiChatHistory from "../models/ai-chat-history.model";
import {
  searchRelevantSources,
  type CitationSource,
} from "./relevance-search.service";

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY || "sk-825e5b20c9224a6b938d09e0f1cdd0f1";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const MAX_POST_CONTENT_LENGTH = 6000;

const activeStreams = new Map<string, AbortController>();

interface SSEEvent {
  event?: string;
  data: string;
}

function parseSSEBuffer(buffer: string): { events: SSEEvent[]; remaining: string } {
  const events: SSEEvent[] = [];
  const blocks = buffer.split("\n\n");
  const remaining = blocks.pop() || "";

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventType: string | undefined;
    const dataLines: string[] = [];

    const lines = block.split("\n");
    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      } else if (line.startsWith("data: ")) {
        dataLines.push(line.slice(6));
      }
    }

    if (dataLines.length > 0) {
      events.push({ event: eventType, data: dataLines.join("\n") });
    }
  }

  return { events, remaining };
}

async function saveHistory(
  userId: number,
  postId: number,
  question: string,
  answer: string,
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
  sources: CitationSource[] | null = null,
) {
  try {
    const record = await AiChatHistory.create({
      user_id: userId,
      post_id: postId,
      question: question.trim(),
      answer,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      model: "deepseek-chat",
      sources_json: sources && sources.length > 0
        ? JSON.stringify(sources.map((s) => ({ type: s.type, id: s.id, title: s.title, snippet: s.snippet })))
        : null,
    });
    return record.id;
  } catch (err) {
    console.error("[AI助手] 保存历史记录失败:", err);
    return null;
  }
}

function truncateAtSafeBoundary(text: string): string {
  if (!text || !text.trim()) return "";

  const trimmed = text.trimEnd();

  const lastChar = trimmed[trimmed.length - 1];
  const isSafeTail =
    /[一-鿿　-〿＀-￯]/.test(lastChar) ||
    /[。！？；：，、""''（）\[\]{}.,!?;:\-—]/.test(lastChar) ||
    /\s/.test(lastChar);

  if (isSafeTail) {
    return trimmed + "...";
  }

  for (let i = trimmed.length - 1; i >= 0; i--) {
    const ch = trimmed[i];
    const isBreakPoint =
      /[一-鿿　-〿＀-￯]/.test(ch) ||
      /[。！？；：，、""''（）\[\]{}.,!?;:\-—\n]/.test(ch) ||
      /\s/.test(ch);

    if (isBreakPoint) {
      const sliced = trimmed.substring(0, i + 1).trimEnd();
      if (sliced.length > 0) {
        return sliced + "...";
      }
    }
  }

  return trimmed + "...";
}

function buildSystemPrompt(hasSources: boolean): string {
  const base = `你是一个学习社区的AI助手，帮助学生理解社区帖子内容。请基于帖子原文${hasSources ? "和提供的参考资料" : ""}回答用户的问题，回答要准确、简洁、易懂。`;

  const citationGuide = hasSources
    ? `\n\n当你引用参考资料中的内容时，请在引用内容后使用 [[cite:N]] 标记（N为参考资料编号，从1开始）。例如：根据相关讨论，这个概念的关键点是... [[cite:1]]\n\n注意事项：\n- 只在确实引用了某个参考资料的内容时才添加引用标记\n- 引用标记放在相关句子或段落末尾\n- 不要对当前帖子本身的内容添加引用标记，引用标记只用于参考资料`
    : "";

  return base + citationGuide + "\n\n如果问题与帖子内容无关，请友好地引导用户提出与帖子相关的问题。请使用中文回答。";
}

function buildUserMessage(
  postTitle: string,
  postContent: string,
  question: string,
  sources: CitationSource[],
): string {
  let content = `帖子标题：${postTitle}\n\n帖子内容：${postContent}\n\n`;

  if (sources.length > 0) {
    content += `参考资料：\n`;
    sources.forEach((src, idx) => {
      const typeLabel = src.type === "post" ? "帖子" : "笔记";
      content += `[${idx + 1}] 【${typeLabel}】${src.title}\n${src.snippet}\n\n`;
    });
  }

  content += `我的问题：${question}`;
  return content;
}

const CITATION_REGEX = /^\[\[cite:(\d+)\]\]$/;
const CITATION_PREFIX = "[[cite:";

function isValidCitationPrefix(buffer: string): boolean {
  // Check if buffer could still grow into [[cite:N]]
  if (buffer.length <= CITATION_PREFIX.length) {
    return CITATION_PREFIX.startsWith(buffer);
  }
  if (!buffer.startsWith(CITATION_PREFIX)) return false;
  const rest = buffer.slice(CITATION_PREFIX.length);
  // After "[[cite:" we expect: digits, optionally followed by ] or ]]
  return /^\d+\]{0,2}$/.test(rest);
}

class CitationStreamProcessor {
  private buffer = "";
  private socket: Socket;
  private sources: CitationSource[];
  public fullAnswer = "";

  constructor(socket: Socket, sources: CitationSource[]) {
    this.socket = socket;
    this.sources = sources;
  }

  processDelta(deltaContent: string) {
    for (const char of deltaContent) {
      this.buffer += char;

      if (this.buffer[0] !== "[") {
        // Not building a citation at all, flush immediately
        this.flush();
        continue;
      }

      // Buffer starts with "[", check if it's still a valid citation prefix
      if (!isValidCitationPrefix(this.buffer)) {
        // Diverged from valid pattern, can never become a citation — flush
        this.flush();
        continue;
      }

      // Still a valid prefix, check if it's now a complete citation
      const match = this.buffer.match(CITATION_REGEX);
      if (match) {
        const sourceIndex = parseInt(match[1]) - 1;
        const source = this.sources[sourceIndex];
        if (source) {
          this.socket.emit("ai:citation", {
            index: sourceIndex + 1,
            type: source.type,
            id: source.id,
            title: source.title,
          });
        } else {
          // Index out of range, emit as plain text
          this.socket.emit("ai:token", { content: this.buffer });
        }
        this.fullAnswer += this.buffer;
        this.buffer = "";
      }
      // Otherwise keep buffering — still a valid prefix
    }
  }

  flush() {
    if (this.buffer.length > 0) {
      this.socket.emit("ai:token", { content: this.buffer });
      this.fullAnswer += this.buffer;
      this.buffer = "";
    }
  }
}

export const initAiAssistantSockets = (io: Server) => {
  const aiNamespace = io.of("/ai-assistant");

  aiNamespace.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("未提供认证令牌"));
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error("认证令牌无效或已过期"));
    }
    (socket as any).userId = decoded.id;
    (socket as any).username = decoded.username;
    next();
  });

  aiNamespace.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId as number;
    console.log(`[AI助手] 用户 ${userId} 已连接, socket: ${socket.id}`);

    socket.on("ai:ask", async (data: { postId: number; question: string }) => {
      const { postId, question } = data;

      if (!postId || !question?.trim()) {
        socket.emit("ai:error", { message: "请提供帖子ID和问题内容" });
        return;
      }

      try {
        const post = await Post.findByPk(postId, {
          attributes: ["id", "title", "content"],
        });

        if (!post) {
          socket.emit("ai:error", { message: "帖子不存在" });
          return;
        }

        const postContent = (post as any).content?.substring(0, MAX_POST_CONTENT_LENGTH);
        const postTitle = (post as any).title || "";

        // RAG: 检索相关来源
        let sources: CitationSource[] = [];
        try {
          sources = await searchRelevantSources(question, postId, 5);
        } catch (err) {
          console.warn("[AI助手] 检索相关来源失败，将仅使用当前帖子:", err);
        }

        const abortController = new AbortController();
        activeStreams.set(socket.id, abortController);

        let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        let streamDone = false;

        const processor = new CitationStreamProcessor(socket, sources);

        const messages = [
          {
            role: "system",
            content: buildSystemPrompt(sources.length > 0),
          },
          {
            role: "user",
            content: buildUserMessage(postTitle, postContent, question, sources),
          },
        ];

        const response = await fetch(DEEPSEEK_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages,
            stream: true,
            stream_options: { include_usage: true },
            max_tokens: 2048,
            temperature: 0.7,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[AI助手] DeepSeek API 错误:", response.status, errorText);
          socket.emit("ai:error", {
            message: `AI 服务暂时不可用 (${response.status})`,
          });
          activeStreams.delete(socket.id);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          socket.emit("ai:error", { message: "无法读取AI响应流" });
          activeStreams.delete(socket.id);
          return;
        }

        const decoder = new TextDecoder();
        let sseBuffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });

            const { events, remaining } = parseSSEBuffer(sseBuffer);
            sseBuffer = remaining;

            for (const sseEvent of events) {
              const rawData = sseEvent.data.trim();

              if (rawData === "[DONE]") {
                streamDone = true;
                break;
              }

              try {
                const parsed = JSON.parse(rawData);

                const delta = parsed.choices?.[0]?.delta;
                if (delta?.content) {
                  processor.processDelta(delta.content);
                }

                const finishReason = parsed.choices?.[0]?.finish_reason;
                if (finishReason === "stop" || finishReason === "length") {
                  streamDone = true;
                }

                if (parsed.usage) {
                  usage = {
                    prompt_tokens: parsed.usage.prompt_tokens || 0,
                    completion_tokens: parsed.usage.completion_tokens || 0,
                    total_tokens: parsed.usage.total_tokens || 0,
                  };
                }
              } catch {
                // 跳过格式异常的 JSON 块
              }
            }

            if (streamDone) {
              reader.cancel();
              break;
            }
          }
        } catch (err: any) {
          if (err.name === "AbortError") {
            activeStreams.delete(socket.id);
            processor.flush();
            const truncatedAnswer = truncateAtSafeBoundary(processor.fullAnswer);
            if (truncatedAnswer) {
              const historyId = await saveHistory(userId, postId, question, truncatedAnswer, usage, sources);
              socket.emit("ai:stopped", {
                answer: truncatedAnswer,
                historyId,
                usage,
                sources: sources.map((s, i) => ({ index: i + 1, type: s.type, id: s.id, title: s.title })),
              });
            } else {
              socket.emit("ai:stopped", { answer: "", historyId: null });
            }
            return;
          }
          console.error("[AI助手] 流式读取错误:", err);
          socket.emit("ai:error", { message: "AI 响应中断" });
          activeStreams.delete(socket.id);
          return;
        }

        // 正常结束 — flush 剩余 buffer 并持久化
        processor.flush();
        activeStreams.delete(socket.id);

        const fullAnswer = processor.fullAnswer;
        if (fullAnswer) {
          const historyId = await saveHistory(userId, postId, question, fullAnswer, usage, sources);
          socket.emit("ai:done", {
            usage,
            historyId,
            sources: sources.map((s, i) => ({ index: i + 1, type: s.type, id: s.id, title: s.title })),
          });
        } else {
          socket.emit("ai:done", { usage, historyId: null, sources: [] });
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("[AI助手] 处理问题时出错:", err);
          socket.emit("ai:error", { message: "处理问题时出错，请稍后再试" });
        }
        activeStreams.delete(socket.id);
      }
    });

    // 用户反馈
    socket.on("ai:feedback", async (data: { historyId: number; feedback: "helpful" | "unhelpful" }) => {
      const { historyId, feedback } = data;

      if (!historyId || !["helpful", "unhelpful"].includes(feedback)) {
        socket.emit("ai:feedback:result", { success: false, historyId, feedback: null });
        return;
      }

      try {
        const record = await AiChatHistory.findOne({
          where: { id: historyId, user_id: userId },
        });

        if (!record) {
          socket.emit("ai:feedback:result", { success: false, historyId, feedback: null });
          return;
        }

        // 切换：重复提交相同反馈则取消
        const newFeedback = record.feedback === feedback ? null : feedback;
        await record.update({ feedback: newFeedback });

        socket.emit("ai:feedback:result", { success: true, historyId, feedback: newFeedback });
      } catch (err) {
        console.error("[AI助手] 保存反馈失败:", err);
        socket.emit("ai:feedback:result", { success: false, historyId, feedback: null });
      }
    });

    socket.on("ai:stop", () => {
      const controller = activeStreams.get(socket.id);
      if (controller) {
        controller.abort();
      }
    });

    socket.on("disconnect", () => {
      const controller = activeStreams.get(socket.id);
      if (controller) {
        controller.abort();
        activeStreams.delete(socket.id);
      }
      console.log(`[AI助手] 用户 ${userId} 已断开, socket: ${socket.id}`);
    });
  });
};
