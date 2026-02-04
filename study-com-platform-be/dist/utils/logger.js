"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.error = exports.log = void 0;
// 日志工具
const log = (message, data) => {
    const timestamp = new Date().toISOString();
    if (data) {
        console.log(`[${timestamp}] ${message}`, data);
    }
    else {
        console.log(`[${timestamp}] ${message}`);
    }
};
exports.log = log;
const error = (message, err) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, err);
};
exports.error = error;
//# sourceMappingURL=logger.js.map