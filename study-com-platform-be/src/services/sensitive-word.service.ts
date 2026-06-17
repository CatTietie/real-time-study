// 敏感词服务
import SensitiveWord from "../models/sensitive-word.model";

interface CachedWord {
  word: string;
  level: number; // 1=屏蔽, 2=警告, 3=需审核
}

const CACHE_TTL = 60 * 1000;
let cachedWords: { words: CachedWord[]; expiredAt: number } | null = null;

const loadSensitiveWords = async (): Promise<CachedWord[]> => {
  const now = Date.now();
  if (cachedWords && cachedWords.expiredAt > now) {
    return cachedWords.words;
  }

  const rows = await SensitiveWord.findAll({
    where: { status: 1 },
    attributes: ["word", "level"],
  });
  const words: CachedWord[] = rows
    .map((row: any) => ({
      word: String(row.word || "").trim(),
      level: Number(row.level) || 3,
    }))
    .filter((item) => item.word.length > 0);

  cachedWords = { words, expiredAt: now + CACHE_TTL };
  return words;
};

export interface SensitiveWordsByLevelResult {
  hit: boolean;
  blocked: string[];  // level 1
  warned: string[];   // level 2
  reviewed: string[]; // level 3
}

export const checkSensitiveWordsByLevel = async (text: string): Promise<SensitiveWordsByLevelResult> => {
  const words = await loadSensitiveWords();
  if (!text || words.length === 0) {
    return { hit: false, blocked: [], warned: [], reviewed: [] };
  }

  const lower = text.toLowerCase();
  const blocked: string[] = [];
  const warned: string[] = [];
  const reviewed: string[] = [];

  for (const item of words) {
    if (lower.includes(item.word.toLowerCase())) {
      switch (item.level) {
        case 1:
          blocked.push(item.word);
          break;
        case 2:
          warned.push(item.word);
          break;
        case 3:
          reviewed.push(item.word);
          break;
      }
    }
  }

  const hit = blocked.length > 0 || warned.length > 0 || reviewed.length > 0;
  return { hit, blocked, warned, reviewed };
};

export const checkSensitiveWords = async (text: string) => {
  const words = await loadSensitiveWords();
  if (!text || words.length === 0) {
    return { hit: false, matches: [] as string[] };
  }

  const lower = text.toLowerCase();
  const matches = words
    .filter((item) => lower.includes(item.word.toLowerCase()))
    .map((item) => item.word);

  return { hit: matches.length > 0, matches };
};

export const filterSensitiveWords = async (text: string) => {
  const words = await loadSensitiveWords();
  let filtered = text;
  words.forEach((item) => {
    const regex = new RegExp(item.word, "gi");
    filtered = filtered.replace(regex, "*".repeat(item.word.length));
  });
  return filtered;
};

export const clearSensitiveWordCache = () => {
  cachedWords = null;
};
