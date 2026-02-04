"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const errorMiddleware = (err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
};
exports.errorMiddleware = errorMiddleware;
//# sourceMappingURL=error.middleware.js.map