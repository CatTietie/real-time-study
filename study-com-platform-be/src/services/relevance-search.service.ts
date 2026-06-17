import { QueryTypes, Op } from "sequelize";
import { sequelize } from "../config/sequelize";
import Post from "../models/post.model";

export interface CitationSource {
  type: "post" | "note";
  id: number;
  title: string;
  snippet: string;
  relevanceScore: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export async function searchRelevantSources(
  question: string,
  currentPostId: number,
  limit: number = 5,
): Promise<CitationSource[]> {
  const searchTerm = question.trim();
  if (!searchTerm) return [];

  const postLimit = Math.min(3, limit);
  const noteLimit = Math.min(2, limit - postLimit);

  let postResults: CitationSource[] = [];
  let noteResults: CitationSource[] = [];

  // 尝试 FULLTEXT 搜索帖子
  try {
    const posts = (await sequelize.query(
      `SELECT id, title,
              SUBSTRING(content, 1, 300) as snippet,
              MATCH(title, content) AGAINST(:term IN NATURAL LANGUAGE MODE) as relevance
       FROM posts
       WHERE id != :currentPostId
         AND status = 1
         AND publish_status = 1
         AND MATCH(title, content) AGAINST(:term IN NATURAL LANGUAGE MODE)
       ORDER BY relevance DESC
       LIMIT :limit`,
      {
        replacements: { term: searchTerm, currentPostId, limit: postLimit },
        type: QueryTypes.SELECT,
      },
    )) as Array<{ id: number; title: string; snippet: string; relevance: number }>;

    postResults = posts.map((p) => ({
      type: "post" as const,
      id: p.id,
      title: p.title,
      snippet: stripHtml(p.snippet || "").substring(0, 200),
      relevanceScore: p.relevance,
    }));
  } catch {
    // FULLTEXT 索引可能尚未创建，使用兜底方案
  }

  // 兜底：FULLTEXT 无结果时使用 LIKE + 同类别
  if (postResults.length === 0) {
    try {
      const currentPost = await Post.findByPk(currentPostId, {
        attributes: ["category"],
      });
      const category = (currentPost as any)?.category;

      const keywords = searchTerm
        .replace(/[?？。！!,.，、\s]+/g, " ")
        .split(" ")
        .filter((k) => k.length >= 2)
        .slice(0, 3);

      if (keywords.length > 0) {
        const whereOr = keywords.map((kw) => ({
          [Op.or]: [
            { title: { [Op.like]: `%${kw}%` } },
            { content: { [Op.like]: `%${kw}%` } },
          ],
        }));

        const fallbackPosts = await Post.findAll({
          where: {
            id: { [Op.ne]: currentPostId },
            status: 1,
            publish_status: 1,
            [Op.or]: whereOr,
            ...(category ? { category } : {}),
          },
          attributes: ["id", "title", "content"],
          order: [["like_count", "DESC"]],
          limit: postLimit,
        });

        postResults = fallbackPosts.map((p: any) => ({
          type: "post" as const,
          id: p.id,
          title: p.title,
          snippet: stripHtml(p.content || "").substring(0, 200),
          relevanceScore: 0.5,
        }));
      }
    } catch {
      // 忽略兜底失败
    }
  }

  // 尝试 FULLTEXT 搜索笔记
  if (noteLimit > 0) {
    try {
      const notes = (await sequelize.query(
        `SELECT id, title,
                SUBSTRING(content_html, 1, 400) as snippet,
                MATCH(title, content_html) AGAINST(:term IN NATURAL LANGUAGE MODE) as relevance
         FROM collaborative_notes
         WHERE status = 'active'
           AND MATCH(title, content_html) AGAINST(:term IN NATURAL LANGUAGE MODE)
         ORDER BY relevance DESC
         LIMIT :limit`,
        {
          replacements: { term: searchTerm, limit: noteLimit },
          type: QueryTypes.SELECT,
        },
      )) as Array<{ id: number; title: string; snippet: string; relevance: number }>;

      noteResults = notes.map((n) => ({
        type: "note" as const,
        id: n.id,
        title: n.title || "未命名笔记",
        snippet: stripHtml(n.snippet || "").substring(0, 200),
        relevanceScore: n.relevance,
      }));
    } catch {
      // FULLTEXT 索引可能尚未创建，跳过笔记搜索
    }
  }

  // 合并并按相关性排序
  const allSources = [...postResults, ...noteResults]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  return allSources;
}
