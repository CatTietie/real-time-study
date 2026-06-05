import api from "./api";

export interface CitationInfo {
  index: number;
  type: "post" | "note";
  id: number;
  title: string;
}

export interface AiChatRecord {
  id: number;
  user_id: number;
  post_id: number;
  question: string;
  answer: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  model: string;
  feedback: "helpful" | "unhelpful" | null;
  sources_json: string | null;
  created_at: string;
}

export const getAiChatHistory = async (
  postId: number,
  limit = 20,
  offset = 0,
): Promise<{ total: number; records: AiChatRecord[] }> => {
  const res = await api.get(`/ai-assistant/history/${postId}`, {
    params: { limit, offset },
  });
  return res.data.data;
};

export const submitAiFeedback = async (
  historyId: number,
  feedback: "helpful" | "unhelpful",
): Promise<{ success: boolean; data: { historyId: number; feedback: string | null } }> => {
  const res = await api.put(`/ai-assistant/feedback/${historyId}`, { feedback });
  return res.data;
};

export function parseSources(sourcesJson: string | null): CitationInfo[] {
  if (!sourcesJson) return [];
  try {
    const parsed = JSON.parse(sourcesJson);
    return parsed.map((s: any, idx: number) => ({
      index: idx + 1,
      type: s.type,
      id: s.id,
      title: s.title,
    }));
  } catch {
    return [];
  }
}
