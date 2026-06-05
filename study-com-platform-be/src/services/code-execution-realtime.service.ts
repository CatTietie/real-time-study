import { Server, Socket } from "socket.io";
import { PassThrough } from "stream";
import { verifyToken } from "../utils/jwt";
import { scanCode } from "./code-scanner.service";
import {
  acquireSlot,
  releaseSlot,
  IMAGES,
  buildCmd,
  docker,
} from "./code-executor.service";
import CodeExecution from "../models/code-execution.model";
import Question from "../models/question.model";
import Docker from "dockerode";

const MAX_OUTPUT_BYTES = 64 * 1024;

export const initCodeExecutionSockets = (io: Server) => {
  const ns = io.of("/code-execution");

  ns.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("未提供认证令牌"));
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error("认证令牌无效或已过期"));
    }
    (socket as any).userId = decoded.id;
    next();
  });

  ns.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId as number;
    let activeContainer: Docker.Container | null = null;

    socket.on("execute_code", async (payload: { questionId: number; language: string; code: string }) => {
      const { questionId, language, code } = payload;

      if (!questionId || !language || !code) {
        socket.emit("code:error", { message: "缺少必要参数" });
        return;
      }

      if (!["python", "javascript"].includes(language)) {
        socket.emit("code:error", { message: "不支持的语言" });
        return;
      }

      if (code.length > 50000) {
        socket.emit("code:error", { message: "代码长度超限（最大50KB）" });
        return;
      }

      const question = await Question.findByPk(questionId);
      if (!question || question.type !== 6) {
        socket.emit("code:error", { message: "题目不存在或非编程题" });
        return;
      }

      const scanResult = scanCode(code, language as "python" | "javascript");
      if (!scanResult.safe) {
        await CodeExecution.create({
          user_id: userId,
          question_id: questionId,
          language,
          code,
          status: "blocked",
          blocked_reason: scanResult.violations.join("; "),
        });
        socket.emit("code:done", { status: "blocked", violations: scanResult.violations, executionTimeMs: 0 });
        return;
      }

      await acquireSlot();
      let container: Docker.Container | null = null;

      try {
        const codeBase64 = Buffer.from(code).toString("base64");
        const inputBase64 = Buffer.from("").toString("base64");

        container = await docker.createContainer({
          Image: IMAGES[language],
          Cmd: buildCmd(language),
          Env: [`CODE=${codeBase64}`, `INPUT=${inputBase64}`],
          Tty: false,
          NetworkDisabled: true,
          HostConfig: {
            NanoCpus: 1_000_000_000,
            Memory: 128 * 1024 * 1024,
            MemorySwap: 128 * 1024 * 1024,
            PidsLimit: 50,
            ReadonlyRootfs: true,
            SecurityOpt: ["no-new-privileges"],
            Tmpfs: { "/tmp": "rw,noexec,nosuid,size=10m" },
          },
        });

        activeContainer = container;

        const stream = await container.attach({ stream: true, stdout: true, stderr: true });
        const startTime = Date.now();
        await container.start();

        const stdoutStream = new PassThrough();
        const stderrStream = new PassThrough();
        (docker.modem as any).demuxStream(stream, stdoutStream, stderrStream);

        let totalStdout = "";
        let totalStderr = "";
        let totalBytes = 0;
        let finished = false;

        stdoutStream.on("data", (chunk: Buffer) => {
          if (finished) return;
          const text = chunk.toString("utf8");
          totalBytes += chunk.length;
          if (totalBytes <= MAX_OUTPUT_BYTES) {
            totalStdout += text;
            socket.emit("code:stdout", { data: text });
          } else if (totalBytes - chunk.length < MAX_OUTPUT_BYTES) {
            socket.emit("code:stdout", { data: "\n[输出已截断]" });
          }
        });

        stderrStream.on("data", (chunk: Buffer) => {
          if (finished) return;
          const text = chunk.toString("utf8");
          totalStderr += text;
          socket.emit("code:stderr", { data: text });
        });

        const timeoutMs = 10000;
        const waitPromise = container.wait();
        const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
        const result = await Promise.race([waitPromise, timeoutPromise]);

        finished = true;
        stdoutStream.destroy();
        stderrStream.destroy();

        let status: string;
        let executionTimeMs: number;

        if (result === null) {
          try { await container.kill(); } catch {}
          status = "timeout";
          executionTimeMs = timeoutMs;
          socket.emit("code:done", { status: "timeout", executionTimeMs, stdout: totalStdout, stderr: "执行超时" });
        } else {
          executionTimeMs = Date.now() - startTime;
          const inspectData = await container.inspect();
          if (inspectData.State.OOMKilled) {
            status = "oom";
            socket.emit("code:done", { status: "oom", executionTimeMs, stdout: totalStdout, stderr: "内存超限" });
          } else {
            const exitCode = (result as any).StatusCode ?? -1;
            status = exitCode === 0 ? "success" : "error";
            socket.emit("code:done", { status, exitCode, executionTimeMs, stdout: totalStdout, stderr: totalStderr });
          }
        }

        await CodeExecution.create({
          user_id: userId,
          question_id: questionId,
          language,
          code,
          stdout: totalStdout.slice(0, MAX_OUTPUT_BYTES),
          stderr: totalStderr.slice(0, MAX_OUTPUT_BYTES),
          exit_code: status === "timeout" ? -1 : ((result as any)?.StatusCode ?? -1),
          execution_time_ms: executionTimeMs,
          status: status as any,
        });
      } catch (err: any) {
        socket.emit("code:error", { message: "执行服务异常: " + (err.message || "未知错误") });
      } finally {
        if (container) {
          try { await container.remove({ force: true }); } catch {}
        }
        activeContainer = null;
        releaseSlot();
      }
    });

    socket.on("disconnect", async () => {
      if (activeContainer) {
        try { await activeContainer.kill(); } catch {}
        try { await activeContainer.remove({ force: true }); } catch {}
        activeContainer = null;
      }
    });
  });
};
