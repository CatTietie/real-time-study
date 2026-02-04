"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterSensitiveWords = exports.checkSensitiveWords = void 0;
// 敏感词服务
const sensitiveWords = ["word1", "word2", "word3"];
const checkSensitiveWords = (text) => {
    return sensitiveWords.some((word) => text.toLowerCase().includes(word));
};
exports.checkSensitiveWords = checkSensitiveWords;
const filterSensitiveWords = (text) => {
    let filtered = text;
    sensitiveWords.forEach((word) => {
        const regex = new RegExp(word, "gi");
        filtered = filtered.replace(regex, "*".repeat(word.length));
    });
    return filtered;
};
exports.filterSensitiveWords = filterSensitiveWords;
//# sourceMappingURL=sensitive-word.service.js.map