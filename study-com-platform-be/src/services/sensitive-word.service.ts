// 敏感词服务
import SensitiveWord from "../models/sensitive-word.model";

const CACHE_TTL = 60 * 1000;
let cachedWords: { words: string[]; expiredAt: number } | null = null;

const loadSensitiveWords = async () => {
  const now = Date.now();
  if (cachedWords && cachedWords.expiredAt > now) {
    return cachedWords.words;
  }

  const rows = await SensitiveWord.findAll({
    where: { status: 1 },
    attributes: ["word"],
  });
  const words = rows
    .map((row) => String((row as any).word || "").trim())
    .filter((word) => word.length > 0);

  cachedWords = { words, expiredAt: now + CACHE_TTL };
  return words;
};

export const checkSensitiveWords = async (text: string) => {
  const words = await loadSensitiveWords();
  if (!text || words.length === 0) {
    return { hit: false, matches: [] as string[] };
  }

  const lower = text.toLowerCase();
  const matches = words.filter((word) => lower.includes(word.toLowerCase()));

  return { hit: matches.length > 0, matches };
};

export const filterSensitiveWords = async (text: string) => {
  const words = await loadSensitiveWords();
  let filtered = text;
  words.forEach((word) => {
    const regex = new RegExp(word, "gi");
    filtered = filtered.replace(regex, "*".repeat(word.length));
  });
  return filtered;
};

export const clearSensitiveWordCache = () => {
  cachedWords = null;
};
