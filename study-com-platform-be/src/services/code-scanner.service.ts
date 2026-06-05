export interface ScanResult {
  safe: boolean;
  violations: string[];
}

interface DangerousPattern {
  pattern: RegExp;
  description: string;
}

const pythonPatterns: DangerousPattern[] = [
  { pattern: /\bimport\s+(os|sys|subprocess|shutil|socket|ctypes|signal|resource|multiprocessing|threading)\b/, description: "禁止导入系统模块: $1" },
  { pattern: /\bfrom\s+(os|sys|subprocess|shutil|socket|ctypes|signal|resource|multiprocessing|threading)\s+import\b/, description: "禁止从系统模块导入" },
  { pattern: /\b__import__\s*\(/, description: "禁止使用 __import__()" },
  { pattern: /\bimportlib\b/, description: "禁止使用 importlib" },
  { pattern: /\beval\s*\(/, description: "禁止使用 eval()" },
  { pattern: /\bexec\s*\(/, description: "禁止使用 exec()" },
  { pattern: /\bcompile\s*\(/, description: "禁止使用 compile()" },
  { pattern: /\bopen\s*\(/, description: "禁止文件操作 open()" },
  { pattern: /\bglobals\s*\(\)/, description: "禁止使用 globals()" },
  { pattern: /\blocals\s*\(\)/, description: "禁止使用 locals()" },
  { pattern: /\b(urllib|requests|http\.client)\b/, description: "禁止网络操作" },
  { pattern: /\bbreakpoint\s*\(/, description: "禁止使用 breakpoint()" },
];

const javascriptPatterns: DangerousPattern[] = [
  { pattern: /\brequire\s*\(\s*['"](?:child_process|fs|net|dgram|cluster|worker_threads|os|vm|http|https|path)['"]/, description: "禁止导入 Node.js 系统模块" },
  { pattern: /\bimport\s+.*from\s+['"](?:child_process|fs|net|dgram|cluster|worker_threads|os|vm|http|https|path)['"]/, description: "禁止导入 Node.js 系统模块" },
  { pattern: /\beval\s*\(/, description: "禁止使用 eval()" },
  { pattern: /\bnew\s+Function\s*\(/, description: "禁止使用 new Function()" },
  { pattern: /\bprocess\s*\.\s*(exit|kill|binding|env|dlopen)/, description: "禁止访问 process 敏感属性" },
  { pattern: /\bglobal(This)?\s*\.\s*(process|require)/, description: "禁止通过全局对象访问系统功能" },
  { pattern: /\bchild_process\b/, description: "禁止使用 child_process" },
  { pattern: /\b(execSync|spawnSync)\s*\(/, description: "禁止执行系统命令" },
];

export function scanCode(code: string, language: "python" | "javascript"): ScanResult {
  const patterns = language === "python" ? pythonPatterns : javascriptPatterns;
  const violations: string[] = [];

  for (const { pattern, description } of patterns) {
    if (pattern.test(code)) {
      violations.push(description);
    }
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}
