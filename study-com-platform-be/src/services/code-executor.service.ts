import Docker from "dockerode";

const docker = new Docker();

const MAX_CONCURRENT = 5;
let runningCount = 0;
const waitQueue: Array<() => void> = [];

export function acquireSlot(): Promise<void> {
  if (runningCount < MAX_CONCURRENT) {
    runningCount++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waitQueue.push(() => {
      runningCount++;
      resolve();
    });
  });
}

export function releaseSlot() {
  runningCount--;
  if (waitQueue.length > 0) {
    const next = waitQueue.shift()!;
    next();
  }
}

export interface ExecutionRequest {
  code: string;
  language: "python" | "javascript";
  stdin?: string;
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  status: "success" | "error" | "timeout" | "oom";
}

const MAX_OUTPUT_BYTES = 64 * 1024;

export const IMAGES: Record<string, string> = {
  python: "python:3.11-slim",
  javascript: "node:20-slim",
};

const imageReady: Record<string, boolean> = { python: false, javascript: false };

export function buildCmd(language: string): string[] {
  if (language === "python") {
    return [
      "sh", "-c",
      'echo "$CODE" | base64 -d > /tmp/code.py && echo "$INPUT" | base64 -d > /tmp/input.txt && python3 /tmp/code.py < /tmp/input.txt',
    ];
  }
  return [
    "sh", "-c",
    'echo "$CODE" | base64 -d > /tmp/code.js && echo "$INPUT" | base64 -d > /tmp/input.txt && node /tmp/code.js < /tmp/input.txt',
  ];
}

async function pullImage(imageName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    docker.pull(imageName, (err: any, stream: NodeJS.ReadableStream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err2: any) => {
        if (err2) return reject(err2);
        resolve();
      });
    });
  });
}

export async function ensureImagesReady(): Promise<void> {
  for (const [lang, image] of Object.entries(IMAGES)) {
    try {
      await docker.getImage(image).inspect();
      imageReady[lang] = true;
    } catch {
      console.log(`镜像 ${image} 不存在，正在拉取...`);
      try {
        await pullImage(image);
        imageReady[lang] = true;
        console.log(`镜像 ${image} 拉取成功`);
      } catch (pullErr: any) {
        console.error(`镜像 ${image} 拉取失败:`, pullErr.message);
      }
    }
  }
}

function demuxStream(buffer: Buffer): { stdout: string; stderr: string } {
  let stdout = "";
  let stderr = "";
  let offset = 0;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) break;
    const streamType = buffer.readUInt8(offset);
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;

    if (offset + size > buffer.length) break;
    const payload = buffer.slice(offset, offset + size).toString("utf8");
    offset += size;

    if (streamType === 1) {
      stdout += payload;
    } else if (streamType === 2) {
      stderr += payload;
    }
  }

  return { stdout, stderr };
}

export async function executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
  const {
    code,
    language,
    stdin = "",
    timeoutMs = 10000,
    memoryLimitMb = 128,
  } = request;

  await acquireSlot();

  const startTime = Date.now();
  let container: Docker.Container | null = null;

  try {
    if (!imageReady[language]) {
      try {
        await pullImage(IMAGES[language]);
        imageReady[language] = true;
      } catch {
        return {
          stdout: "",
          stderr: "代码执行镜像未就绪，请稍后重试",
          exitCode: -1,
          executionTimeMs: Date.now() - startTime,
          status: "error",
        };
      }
    }

    const codeBase64 = Buffer.from(code).toString("base64");
    const inputBase64 = Buffer.from(stdin).toString("base64");

    const containerConfig = {
      Image: IMAGES[language],
      Cmd: buildCmd(language),
      Env: [`CODE=${codeBase64}`, `INPUT=${inputBase64}`],
      Tty: false,
      NetworkDisabled: true,
      HostConfig: {
        NanoCpus: 1_000_000_000,
        Memory: memoryLimitMb * 1024 * 1024,
        MemorySwap: memoryLimitMb * 1024 * 1024,
        PidsLimit: 50,
        ReadonlyRootfs: true,
        SecurityOpt: ["no-new-privileges"],
        Tmpfs: { "/tmp": "rw,noexec,nosuid,size=10m" },
      },
    };

    try {
      container = await docker.createContainer(containerConfig);
    } catch (createErr: any) {
      if (createErr.message?.includes("No such image") || createErr.message?.includes("not found")) {
        await pullImage(IMAGES[language]);
        imageReady[language] = true;
        container = await docker.createContainer(containerConfig);
      } else {
        throw createErr;
      }
    }

    await container.start();

    const waitPromise = container.wait();
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );

    const result = await Promise.race([waitPromise, timeoutPromise]);

    if (result === null) {
      try { await container.kill(); } catch {}
      return {
        stdout: "",
        stderr: "执行超时（已超过 " + (timeoutMs / 1000) + " 秒限制）",
        exitCode: -1,
        executionTimeMs: timeoutMs,
        status: "timeout",
      };
    }

    const logs = await container.logs({ stdout: true, stderr: true, follow: false });
    const logBuffer = Buffer.isBuffer(logs) ? logs : Buffer.from(logs as any);
    let { stdout, stderr } = demuxStream(logBuffer);

    if (stdout.length > MAX_OUTPUT_BYTES) {
      stdout = stdout.slice(0, MAX_OUTPUT_BYTES) + "\n[输出已截断]";
    }
    if (stderr.length > MAX_OUTPUT_BYTES) {
      stderr = stderr.slice(0, MAX_OUTPUT_BYTES) + "\n[输出已截断]";
    }

    const exitCode = (result as any).StatusCode ?? -1;
    const executionTimeMs = Date.now() - startTime;

    const inspectData = await container.inspect();
    if (inspectData.State.OOMKilled) {
      return {
        stdout,
        stderr: "内存超限（已超过 " + memoryLimitMb + "MB 限制）",
        exitCode,
        executionTimeMs,
        status: "oom",
      };
    }

    return {
      stdout,
      stderr,
      exitCode,
      executionTimeMs,
      status: exitCode === 0 ? "success" : "error",
    };
  } catch (err: any) {
    const executionTimeMs = Date.now() - startTime;
    return {
      stdout: "",
      stderr: "执行服务异常: " + (err.message || "未知错误"),
      exitCode: -1,
      executionTimeMs,
      status: "error",
    };
  } finally {
    if (container) {
      try { await container.remove({ force: true }); } catch {}
    }
    releaseSlot();
  }
}

export async function checkDockerAvailable(): Promise<{ available: boolean; imagesReady: boolean }> {
  try {
    await docker.ping();
    const ready = Object.values(imageReady).every(Boolean);
    return { available: true, imagesReady: ready };
  } catch {
    return { available: false, imagesReady: false };
  }
}

export { docker };
