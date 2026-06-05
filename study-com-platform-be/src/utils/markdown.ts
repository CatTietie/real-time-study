import { marked } from "marked";
import xss, { IFilterXSSOptions, getDefaultWhiteList } from "xss";

const xssConfig: IFilterXSSOptions = {
  whiteList: {
    ...getDefaultWhiteList(),
    pre: ["class"],
    code: ["class"],
    span: ["class", "style"],
    div: ["class"],
    img: ["src", "alt", "title", "width", "height"],
    a: ["href", "title", "target", "rel"],
    table: ["class"],
    thead: [],
    tbody: [],
    tr: [],
    th: ["align"],
    td: ["align"],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style", "noscript"],
};

export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false }) as string;
  return xss(html, xssConfig);
}
