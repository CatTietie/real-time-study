"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateURL = exports.validateUsername = exports.validatePassword = exports.validateEmail = void 0;
// 验证工具
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    return password.length >= 8;
};
exports.validatePassword = validatePassword;
const validateUsername = (username) => {
    return username.length >= 3 && username.length <= 20;
};
exports.validateUsername = validateUsername;
const validateURL = (url) => {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
};
exports.validateURL = validateURL;
//# sourceMappingURL=validator.js.map