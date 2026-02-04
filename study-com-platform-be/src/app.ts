// Express 应用配置
import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { loggerMiddleware } from "./middlewares/logger.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

// 中间件
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// 日志中间件
app.use(loggerMiddleware);

// 路由
app.use("/api", routes);

// 健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 错误处理中间件
app.use(errorMiddleware);

export default app;
