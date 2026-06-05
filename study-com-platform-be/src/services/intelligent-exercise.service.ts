import { Op } from "sequelize";
import Question from "../models/question.model";
import UserTagMastery from "../models/user-tag-mastery.model";
import UserAnswerDetail from "../models/user-answer-detail.model";
import UserExerciseRecord from "../models/user-exercise-record.model";
import WrongBook from "../models/wrong-book.model";

const HALF_LIFE_DAYS = 14;
const MIN_EFFECTIVE_MASTERY = 5;

export function computeEffectiveMastery(rawRate: number, lastPracticeTime: Date): number {
  const daysSince = (Date.now() - new Date(lastPracticeTime).getTime()) / (1000 * 60 * 60 * 24);
  const lambda = Math.LN2 / HALF_LIFE_DAYS;
  const decayFactor = Math.exp(-lambda * daysSince);
  return Math.max(MIN_EFFECTIVE_MASTERY, rawRate * decayFactor);
}

export function parseTags(tagsStr: string | null | undefined): string[] {
  if (!tagsStr) return [];
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [tagsStr];
  } catch {
    return tagsStr.split(",").map((t: string) => t.trim()).filter(Boolean);
  }
}

export async function updateTagMastery(
  userId: number,
  answerDetails: Array<{ questionId: number; isCorrect: number }>,
): Promise<void> {
  const questionIds = answerDetails.map((a) => a.questionId);
  const questions = await Question.findAll({
    where: { id: { [Op.in]: questionIds } },
    attributes: ["id", "tags"],
  });

  const questionMap = new Map<number, string>(
    questions.map((q: any) => [q.id, q.tags]),
  );

  const tagResults = new Map<string, { total: number; correct: number }>();

  for (const detail of answerDetails) {
    const tagsStr = questionMap.get(detail.questionId);
    const tags = parseTags(tagsStr);
    for (const tag of tags) {
      const stat = tagResults.get(tag) || { total: 0, correct: 0 };
      stat.total++;
      if (detail.isCorrect === 1) stat.correct++;
      tagResults.set(tag, stat);
    }
  }

  for (const [tag, result] of tagResults) {
    const existing = await UserTagMastery.findOne({
      where: { user_id: userId, tag },
    });

    if (existing) {
      const newTotal = (existing as any).total_count + result.total;
      const newCorrect = (existing as any).correct_count + result.correct;
      const newRate = newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 0;
      await existing.update({
        total_count: newTotal,
        correct_count: newCorrect,
        mastery_rate: newRate,
        last_practice_time: new Date(),
      });
    } else {
      const rate = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
      await UserTagMastery.create({
        user_id: userId,
        tag,
        total_count: result.total,
        correct_count: result.correct,
        mastery_rate: rate,
        last_practice_time: new Date(),
      });
    }
  }
}

function weightedRandomSelect<T>(items: T[], count: number, weightFn: (item: T) => number): T[] {
  if (items.length <= count) return [...items];

  const weighted = items.map((item) => ({ item, weight: Math.max(0.1, weightFn(item)) }));
  const selected: T[] = [];
  const used = new Set<number>();

  for (let i = 0; i < count && used.size < items.length; i++) {
    const available = weighted.filter((_, idx) => !used.has(idx));
    const totalWeight = available.reduce((sum, w) => sum + w.weight, 0);
    let rand = Math.random() * totalWeight;

    for (let j = 0; j < weighted.length; j++) {
      if (used.has(j)) continue;
      rand -= weighted[j].weight;
      if (rand <= 0) {
        selected.push(weighted[j].item);
        used.add(j);
        break;
      }
    }
  }

  return selected;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface IntelligentPaperResult {
  questions: any[];
  bankName: string;
  questionCount: number;
  totalScore: number;
  distribution: {
    weaknessReinforce: number;
    wrongBookConsolidate: number;
    expansion: number;
  };
  targetTags: string[];
  coldStart: boolean;
}

export async function generateIntelligentPaper(
  userId: number,
  bankId: number,
  questionCount: number,
): Promise<IntelligentPaperResult> {
  const allQuestions = await Question.findAll({
    where: { bank_id: bankId, status: 1 },
    attributes: ["id", "type", "content", "options", "score", "difficulty", "tags", "resource_url"],
    order: [["id", "ASC"]],
  });

  if (allQuestions.length === 0) {
    return {
      questions: [],
      bankName: "智能组卷",
      questionCount: 0,
      totalScore: 0,
      distribution: { weaknessReinforce: 0, wrongBookConsolidate: 0, expansion: 0 },
      targetTags: [],
      coldStart: true,
    };
  }

  const effectiveCount = Math.min(questionCount, allQuestions.length);

  const masteryRecords = await UserTagMastery.findAll({
    where: { user_id: userId },
  });

  const masteryMap = new Map<string, { rate: number; rawRate: number; totalCount: number }>();
  for (const m of masteryRecords) {
    const mData = m as any;
    const effectiveRate = computeEffectiveMastery(mData.mastery_rate, mData.last_practice_time);
    masteryMap.set(mData.tag, { rate: effectiveRate, rawRate: mData.mastery_rate, totalCount: mData.total_count });
  }

  const isColdStart = masteryRecords.length === 0;

  if (isColdStart) {
    const sorted = [...allQuestions].sort((a: any, b: any) => {
      const diffA = Math.abs((a.difficulty || 3) - 3);
      const diffB = Math.abs((b.difficulty || 3) - 3);
      return diffA - diffB;
    });
    const selected = shuffle(sorted.slice(0, effectiveCount));
    const totalScore = selected.reduce((sum: number, q: any) => sum + (q.score || 1), 0);

    return {
      questions: selected.map((q: any) => ({
        id: q.id,
        type: q.type,
        content: q.content,
        options: q.options,
        score: q.score || 1,
        difficulty: q.difficulty,
        resource_url: q.resource_url,
        reason: "首次练习推荐题目，帮助建立知识基线",
      })),
      bankName: "智能组卷",
      questionCount: selected.length,
      totalScore,
      distribution: { weaknessReinforce: 0, wrongBookConsolidate: 0, expansion: selected.length },
      targetTags: [],
      coldStart: true,
    };
  }

  // Identify weak tags
  const weakTags = new Set<string>();
  for (const [tag, data] of masteryMap) {
    if (data.rate < 60 || data.totalCount < 3) {
      weakTags.add(tag);
    }
  }

  // Get wrong-book question IDs within this bank
  const wrongEntries = await WrongBook.findAll({ where: { user_id: userId } });
  const questionIdSet = new Set(allQuestions.map((q: any) => q.id));
  const wrongQuestionIds = new Set(
    wrongEntries
      .map((w: any) => w.question_id)
      .filter((id: number) => questionIdSet.has(id)),
  );

  // Get answered question IDs
  const userRecords = await UserExerciseRecord.findAll({
    where: { user_id: userId },
    attributes: ["id"],
  });
  const recordIds = userRecords.map((r: any) => r.id);
  let answeredQuestionIds = new Set<number>();
  if (recordIds.length > 0) {
    const answered = await UserAnswerDetail.findAll({
      where: { record_id: { [Op.in]: recordIds } },
      attributes: ["question_id"],
    });
    answeredQuestionIds = new Set(answered.map((a: any) => a.question_id));
  }

  // Target distribution: 50% weakness, 20% wrong-book, 30% expansion
  const selectedIds = new Set<number>();
  const targetTags = Array.from(weakTags).slice(0, 10);

  // Bucket 1: Weakness reinforcement (target 50%)
  const weaknessQuota = Math.floor(effectiveCount * 0.5);
  const weaknessPool = allQuestions.filter((q: any) => {
    const tags = parseTags(q.tags);
    return tags.some((t) => weakTags.has(t)) && !selectedIds.has(q.id);
  });

  const weaknessSelected = weightedRandomSelect(weaknessPool, weaknessQuota, (q: any) => {
    const tags = parseTags(q.tags);
    const tagRates = tags.map((t) => masteryMap.get(t)?.rate ?? 50);
    const avgRate = tagRates.length > 0 ? tagRates.reduce((a, b) => a + b, 0) / tagRates.length : 50;
    return (100 - avgRate) + (q.difficulty || 3) * 2;
  });

  for (const q of weaknessSelected) {
    selectedIds.add((q as any).id);
  }

  // Bucket 2: Wrong-book consolidation (target 20%, absorbs weakness surplus)
  const wrongBookBase = Math.floor(effectiveCount * 0.2);
  const weaknessSurplus = weaknessQuota - weaknessSelected.length;
  const wrongBookQuota = wrongBookBase + weaknessSurplus;

  const wrongPool = allQuestions.filter(
    (q: any) => wrongQuestionIds.has(q.id) && !selectedIds.has(q.id),
  );
  const wrongSelected = shuffle(wrongPool).slice(0, wrongBookQuota);
  for (const q of wrongSelected) {
    selectedIds.add((q as any).id);
  }

  // Bucket 3: Expansion (remaining quota, absorbs any prior surplus)
  const expansionQuota = effectiveCount - selectedIds.size;

  const expansionPool = allQuestions.filter(
    (q: any) => !answeredQuestionIds.has(q.id) && !selectedIds.has(q.id),
  );

  let expansionSelected: any[];
  if (expansionPool.length >= expansionQuota) {
    expansionSelected = weightedRandomSelect(expansionPool, expansionQuota, (q: any) => {
      const tags = parseTags(q.tags);
      const minCount = tags.length > 0
        ? Math.min(...tags.map((t) => masteryMap.get(t)?.totalCount ?? 0))
        : 0;
      return (1 / (minCount + 1)) * 10 + 2;
    });
  } else {
    expansionSelected = [...expansionPool];
  }

  for (const q of expansionSelected) {
    selectedIds.add((q as any).id);
  }

  // Final fill: if all buckets together still fall short, fill with any remaining questions
  const fillSelected: any[] = [];
  if (selectedIds.size < effectiveCount) {
    const remaining = allQuestions.filter((q: any) => !selectedIds.has(q.id));
    const fill = shuffle(remaining).slice(0, effectiveCount - selectedIds.size);
    for (const q of fill) {
      selectedIds.add((q as any).id);
      fillSelected.push(q);
    }
  }

  // Build reason map: for each question, check ALL applicable conditions and pick the core attribution
  const reasonMap = new Map<number, string>();
  const fillIdSet = new Set(fillSelected.map((q: any) => q.id));

  for (const q of [...weaknessSelected, ...wrongSelected, ...expansionSelected, ...fillSelected]) {
    const qData = q as any;
    if (reasonMap.has(qData.id)) continue;

    const tags = parseTags(qData.tags);
    const weakHitTags = tags.filter((t) => weakTags.has(t));
    const isInWrongBook = wrongQuestionIds.has(qData.id);
    const isUnseen = !answeredQuestionIds.has(qData.id);
    const hasWeakTag = weakHitTags.length > 0;

    let lowestRate = 100;
    let lowestTag = "";
    for (const t of weakHitTags) {
      const rate = Math.round(masteryMap.get(t)?.rate ?? 50);
      if (rate < lowestRate) {
        lowestRate = rate;
        lowestTag = t;
      }
    }

    let reason: string;

    if (isInWrongBook && hasWeakTag) {
      reason = `曾答错且关联薄弱知识点「${lowestTag}」(掌握率${lowestRate}%)，需重点攻克`;
    } else if (isInWrongBook) {
      reason = "该题曾答错，通过重复练习巩固记忆";
    } else if (hasWeakTag && isUnseen) {
      const tagDisplay = weakHitTags.slice(0, 2).join("、");
      reason = `知识点「${tagDisplay}」掌握率偏低(${lowestRate}%)，以新题强化训练`;
    } else if (hasWeakTag) {
      const tagDisplay = weakHitTags.slice(0, 2).join("、");
      reason = `知识点「${tagDisplay}」掌握率${lowestRate}%，需针对性强化`;
    } else if (isUnseen) {
      const newTags = tags.filter((t) => !masteryMap.has(t) || (masteryMap.get(t)?.totalCount ?? 0) < 2);
      if (newTags.length > 0) {
        reason = `拓展新知识点「${newTags.slice(0, 2).join("、")}」`;
      } else {
        reason = "拓展练习，扩大知识覆盖面";
      }
    } else if (fillIdSet.has(qData.id)) {
      reason = "综合巩固，保持练习覆盖度";
    } else {
      reason = "拓展练习，扩大知识覆盖面";
    }

    reasonMap.set(qData.id, reason);
  }

  // Build final question list
  const finalQuestions = shuffle(
    allQuestions.filter((q: any) => selectedIds.has(q.id)),
  );

  const totalScore = finalQuestions.reduce((sum: number, q: any) => sum + (q.score || 1), 0);

  return {
    questions: finalQuestions.map((q: any) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      options: q.options,
      score: q.score || 1,
      difficulty: q.difficulty,
      resource_url: q.resource_url,
      reason: reasonMap.get(q.id) || "智能推荐",
    })),
    bankName: "智能组卷",
    questionCount: finalQuestions.length,
    totalScore,
    distribution: {
      weaknessReinforce: weaknessSelected.length,
      wrongBookConsolidate: wrongSelected.length,
      expansion: finalQuestions.length - weaknessSelected.length - wrongSelected.length,
    },
    targetTags,
    coldStart: false,
  };
}

export async function getTagMasteryForBank(userId: number, bankId: number) {
  const questions = await Question.findAll({
    where: { bank_id: bankId, status: 1 },
    attributes: ["tags"],
  });

  const bankTags = new Set<string>();
  for (const q of questions) {
    const tags = parseTags((q as any).tags);
    for (const t of tags) bankTags.add(t);
  }

  if (bankTags.size === 0) {
    return { tags: [], overallMastery: 0 };
  }

  const masteryRecords = await UserTagMastery.findAll({
    where: { user_id: userId, tag: { [Op.in]: Array.from(bankTags) } },
    order: [["mastery_rate", "ASC"]],
  });

  const tags = masteryRecords.map((m: any) => ({
    tag: m.tag,
    totalCount: m.total_count,
    correctCount: m.correct_count,
    masteryRate: m.mastery_rate,
    effectiveMasteryRate: Math.round(computeEffectiveMastery(m.mastery_rate, m.last_practice_time)),
    lastPracticeTime: m.last_practice_time,
  }));

  const overallMastery = tags.length > 0
    ? Math.round(tags.reduce((sum, t) => sum + t.effectiveMasteryRate, 0) / tags.length)
    : 0;

  return { tags, overallMastery };
}
