"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearSensitiveWordCache = exports.filterSensitiveWords = exports.checkSensitiveWords = void 0;
// 敏感词服务
const sensitive_word_model_1 = __importDefault(require("../models/sensitive-word.model"));
const CACHE_TTL = 60 * 1000;
let cachedWords = null;
const loadSensitiveWords = async () => {
    const now = Date.now();
    if (cachedWords && cachedWords.expiredAt > now) {
        return cachedWords.words;
    }
    const rows = await sensitive_word_model_1.default.findAll({
        where: { status: 1 },
        attributes: ["word"],
    });
    const words = rows
        .map((row) => String(row.word || "").trim())
        .filter((word) => word.length > 0);
    cachedWords = { words, expiredAt: now + CACHE_TTL };
    return words;
};
const checkSensitiveWords = async (text) => {
    const words = await loadSensitiveWords();
    if (!text || words.length === 0) {
        return { hit: false, matches: [] };
    }
    const lower = text.toLowerCase();
    const matches = words.filter((word) => lower.includes(word.toLowerCase()));
    return { hit: matches.length > 0, matches };
};
exports.checkSensitiveWords = checkSensitiveWords;
const filterSensitiveWords = async (text) => {
    const words = await loadSensitiveWords();
    let filtered = text;
    words.forEach((word) => {
        const regex = new RegExp(word, "gi");
        filtered = filtered.replace(regex, "*".repeat(word.length));
    });
    return filtered;
};
exports.filterSensitiveWords = filterSensitiveWords;
const clearSensitiveWordCache = () => {
    cachedWords = null;
};
exports.clearSensitiveWordCache = clearSensitiveWordCache;
//# sourceMappingURL=sensitive-word.service.js.map