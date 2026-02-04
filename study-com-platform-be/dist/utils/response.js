"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginatedResponse = exports.errorResponse = exports.successResponse = void 0;
// 响应工具
const successResponse = (data, message = "Success") => {
    return {
        success: true,
        message,
        data,
    };
};
exports.successResponse = successResponse;
const errorResponse = (message, error) => {
    return {
        success: false,
        message,
        error,
    };
};
exports.errorResponse = errorResponse;
const paginatedResponse = (data, total, page, pageSize) => {
    return {
        success: true,
        data,
        pagination: {
            total,
            page,
            pageSize,
            pages: Math.ceil(total / pageSize),
        },
    };
};
exports.paginatedResponse = paginatedResponse;
//# sourceMappingURL=response.js.map