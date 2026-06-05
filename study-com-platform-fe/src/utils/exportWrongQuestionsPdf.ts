import type { ExerciseResultDetail, ExerciseResultData } from "../services/questionBankPublic";

const typeLabels: Record<number, string> = {
  1: "单选题",
  2: "多选题",
  3: "判断题",
  4: "填空题",
  5: "主观题",
};

const parseOptions = (options: any): { label: string; text: string }[] | null => {
  if (!options) return null;
  if (Array.isArray(options)) return options;
  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

function renderChoiceHtml(detail: ExerciseResultDetail): string {
  const options = parseOptions(detail.options);
  if (!options || options.length === 0) return "";

  const correctSet = new Set(
    detail.correctAnswer.toUpperCase().split(",").map((s) => s.trim())
  );
  const userSet = new Set(
    (detail.userAnswer || "").toUpperCase().split(",").map((s) => s.trim()).filter(Boolean)
  );

  const optionsHtml = options.map((opt) => {
    const isCorrectOption = correctSet.has(opt.label.toUpperCase());
    const isUserSelected = userSet.has(opt.label.toUpperCase());
    let bg = "#fff";
    let borderColor = "#d9d9d9";
    let icon = "";

    if (isCorrectOption && isUserSelected) {
      bg = "#f6ffed";
      borderColor = "#52c41a";
      icon = '<span style="float:right;color:#52c41a">✓</span>';
    } else if (isCorrectOption) {
      bg = "#f6ffed";
      borderColor = "#52c41a";
      icon = '<span style="float:right;color:#52c41a">✓</span>';
    } else if (isUserSelected) {
      bg = "#fff1f0";
      borderColor = "#f5222d";
      icon = '<span style="float:right;color:#f5222d">✗</span>';
    }

    return `<div style="padding:8px 12px;margin:4px 0;border:1px solid ${borderColor};border-radius:6px;background:${bg}">
      <span style="font-weight:bold">${opt.label}.</span> ${opt.text}${icon}
    </div>`;
  }).join("");

  return `<div style="margin:8px 0">${optionsHtml}</div>
    <div style="margin-top:8px">
      <span style="color:#666">你的答案：</span><span style="color:#f5222d;font-weight:500">${detail.userAnswer || "（未作答）"}</span>
      &nbsp;&nbsp;
      <span style="color:#666">正确答案：</span><span style="color:#52c41a;font-weight:bold">${detail.correctAnswer}</span>
    </div>`;
}

function renderTrueFalseHtml(detail: ExerciseResultDetail): string {
  const correct = detail.correctAnswer.toLowerCase();
  const user = (detail.userAnswer || "").toLowerCase();

  const items = [
    { value: "true", label: "正确" },
    { value: "false", label: "错误" },
  ];

  const boxesHtml = items.map((item) => {
    const isCorrectOption = correct === item.value;
    const isUserSelected = user === item.value;
    let bg = "#fff";
    let borderColor = "#d9d9d9";
    let icon = "";

    if (isCorrectOption && isUserSelected) {
      bg = "#f6ffed";
      borderColor = "#52c41a";
      icon = ' <span style="color:#52c41a">✓</span>';
    } else if (isCorrectOption) {
      bg = "#f6ffed";
      borderColor = "#52c41a";
      icon = ' <span style="color:#52c41a">✓</span>';
    } else if (isUserSelected) {
      bg = "#fff1f0";
      borderColor = "#f5222d";
      icon = ' <span style="color:#f5222d">✗</span>';
    }

    return `<span style="display:inline-block;padding:6px 18px;border:1px solid ${borderColor};border-radius:6px;background:${bg};margin-right:12px">${item.label}${icon}</span>`;
  }).join("");

  const userLabel = user === "true" ? "正确" : user === "false" ? "错误" : "（未作答）";
  const correctLabel = correct === "true" ? "正确" : "错误";

  return `<div style="margin:8px 0">${boxesHtml}</div>
    <div style="margin-top:8px">
      <span style="color:#666">你的答案：</span><span style="color:#f5222d;font-weight:500">${userLabel}</span>
      &nbsp;&nbsp;
      <span style="color:#666">正确答案：</span><span style="color:#52c41a;font-weight:bold">${correctLabel}</span>
    </div>`;
}

function renderFillOrSubjectiveHtml(detail: ExerciseResultDetail): string {
  let html = `<div style="margin:8px 0">
    <div style="margin-bottom:6px">
      <span style="color:#666">你的答案：</span>
      <span style="color:${detail.isCorrect ? '#52c41a' : '#f5222d'}">${detail.userAnswer || "（未作答）"}</span>
    </div>
    <div>
      <span style="color:#666">参考答案：</span>
      <span style="color:#52c41a;font-weight:bold">${detail.correctAnswer}</span>
    </div>`;

  if (detail.type === 5 && detail.reviewStatus === 2) {
    html += `<div style="margin-top:10px;padding:10px 14px;background:#f6ffed;border-radius:6px;border:1px solid #b7eb8f">
      <div><span style="color:#666">教师评分：</span><span style="color:#1890ff;font-weight:bold">${detail.reviewScore} / ${detail.score} 分</span></div>
      ${detail.reviewComment ? `<div style="margin-top:4px"><span style="color:#666">教师评语：</span>${detail.reviewComment}</div>` : ""}
    </div>`;
  }

  html += "</div>";
  return html;
}

function renderQuestionHtml(detail: ExerciseResultDetail, index: number): string {
  let answerHtml = "";
  if (detail.type === 1 || detail.type === 2) {
    answerHtml = renderChoiceHtml(detail);
  } else if (detail.type === 3) {
    answerHtml = renderTrueFalseHtml(detail);
  } else {
    answerHtml = renderFillOrSubjectiveHtml(detail);
  }

  const analysisHtml = detail.analysis
    ? `<div style="margin-top:12px;padding:10px 14px;background:#fafafa;border-radius:6px;border-left:3px solid #667eea">
        <div style="font-size:12px;color:#999;margin-bottom:4px">解析</div>
        <div style="color:#333">${detail.analysis}</div>
      </div>`
    : "";

  return `<div class="question-block" style="margin-bottom:10px;padding:14px 16px;border:1px solid #e8e8e8;border-radius:8px;border-left:4px solid #f5222d">
    <div style="display:flex;align-items:center;margin-bottom:8px">
      <span style="display:inline-block;padding:2px 8px;background:#f0f0f0;border-radius:4px;font-size:12px;color:#666;margin-right:10px">${typeLabels[detail.type] || "未知"}</span>
      <span style="font-weight:bold;font-size:14px">第 ${index + 1} 题</span>
      <span style="margin-left:auto;color:#999;font-size:12px">${detail.earnedPoints} / ${detail.score} 分</span>
    </div>
    <div style="font-size:14px;line-height:1.6;margin-bottom:10px;color:#333;word-break:break-word;overflow-wrap:break-word">${detail.content}</div>
    ${answerHtml}
    ${analysisHtml}
  </div>`;
}

export function generateWrongQuestionsPdfContent(
  details: ExerciseResultDetail[],
  record: ExerciseResultData["record"]
): string {
  const date = new Date(record.submitTime).toLocaleDateString("zh-CN");
  const totalWrong = details.length;

  const questionsHtml = details.map((d, i) => renderQuestionHtml(d, i)).join("");

  return `<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .question-block {
    break-inside: avoid;
    page-break-inside: avoid;
  }
</style>
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#333;line-height:1.5;padding:0;width:100%;overflow:hidden">
  <div style="text-align:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #667eea">
    <h1 style="font-size:18px;color:#333;margin:0 0 6px 0">错题记录</h1>
    <div style="font-size:11px;color:#999">
      练习日期：${date} &nbsp;|&nbsp; 错题数量：${totalWrong} 题 &nbsp;|&nbsp; 得分：${record.score} / ${record.totalScore}
    </div>
  </div>
  ${questionsHtml}
  <div style="text-align:center;margin-top:16px;padding-top:12px;border-top:1px solid #e8e8e8;font-size:10px;color:#bbb">
    由学习社区平台生成 · ${date}
  </div>
</div>`;
}

function createContainer(htmlContent: string): HTMLDivElement {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.boxSizing = "border-box";
  container.style.width = "794px";
  container.style.background = "#ffffff";
  container.style.padding = "24px 32px";
  container.style.zIndex = "99999";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  container.innerHTML = htmlContent;
  document.body.appendChild(container);
  return container;
}

function addPageNumbers(pdf: any): void {
  const totalPages = pdf.internal.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `- ${i} / ${totalPages} -`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }
}

export async function downloadWrongQuestionsPdf(
  details: ExerciseResultDetail[],
  record: ExerciseResultData["record"],
  onProgress?: (stage: string) => void
): Promise<void> {
  if (details.length === 0) {
    throw new Error("没有错题可导出");
  }

  onProgress?.("准备中...");

  const html2pdfModule = await import("html2pdf.js");
  const html2pdf = html2pdfModule.default || html2pdfModule;

  const filename = `错题记录_${new Date().toISOString().split("T")[0]}.pdf`;
  const htmlContent = generateWrongQuestionsPdfContent(details, record);
  const container = createContainer(htmlContent);

  await new Promise<void>((resolve) => setTimeout(resolve, 300));

  onProgress?.("渲染中...");

  try {
    await new Promise<void>((resolve, reject) => {
      try {
        (html2pdf as any)()
          .set({
            margin: [8, 0, 12, 0],
            filename,
            image: { type: "png" },
            html2canvas: {
              scale: 2,
              useCORS: true,
              logging: false,
              scrollX: 0,
              scrollY: 0,
            },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["css", "legacy"], avoid: [".question-block"] },
          })
          .from(container)
          .toPdf()
          .get("pdf")
          .then(function (pdf: any) {
            addPageNumbers(pdf);
          })
          .save()
          .then(() => resolve())
          .catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  } finally {
    document.body.removeChild(container);
  }

  onProgress?.("完成");
}
