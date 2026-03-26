/**
 * db.ts — IndexedDB-backed curriculum service (via Dexie).
 *
 * On first visit the curriculum is seeded from the bundled curriculum.ts into
 * the browser's IndexedDB.  Every subsequent visit reads straight from the DB.
 * After loadCurriculum() resolves, the synchronous helpers below work
 * identically to the old curriculum.ts, so existing components need no changes.
 */

import { localDb } from '../lib/localDb';
import { curriculum as staticCurriculum } from '../data/curriculum';
import type { ClassData, Chapter, Topic, Question } from '../types';

// ── In-memory cache + in-flight promise (prevents double-load in StrictMode) ──
let cache: ClassData[] | null = null;
let loading: Promise<ClassData[]> | null = null;

// ── Seed helpers ─────────────────────────────────────────────────────────────
async function seedIfEmpty(): Promise<void> {
  const count = await localDb.chapters.count();
  if (count > 0) return; // already seeded

  const chapters = [];
  const topics = [];
  const questions = [];

  for (const cls of staticCurriculum) {
    for (const ch of cls.chapters) {
      chapters.push({ id: ch.id, class_id: cls.id, name: ch.name, description: ch.description });
      for (const tp of ch.topics) {
        topics.push({ id: tp.id, chapter_id: ch.id, name: tp.name, description: tp.description });
        for (const q of tp.questions) {
          questions.push({
            id: q.id,
            topic_id: tp.id,
            type: q.type,
            text: q.text,
            options: q.options ?? null,
            answer: String(q.answer),
            solution: q.solution,
            difficulty: q.difficulty,
          });
        }
      }
    }
  }

  await localDb.transaction('rw', localDb.chapters, localDb.topics, localDb.questions, async () => {
    await localDb.chapters.bulkPut(chapters);
    await localDb.topics.bulkPut(topics);
    await localDb.questions.bulkPut(questions);
  });

  console.log(`[DB] Seeded: ${chapters.length} chapters, ${topics.length} topics, ${questions.length} questions`);
}

// ── Build ClassData[] from DB rows ────────────────────────────────────────────
async function buildCache(): Promise<ClassData[]> {
  const [chapterRows, topicRows, questionRows] = await Promise.all([
    localDb.chapters.orderBy('id').toArray(),
    localDb.topics.orderBy('id').toArray(),
    localDb.questions.orderBy('id').toArray(),
  ]);

  const topicsByChapter = new Map<string, typeof topicRows>();
  for (const t of topicRows) {
    const arr = topicsByChapter.get(t.chapter_id) ?? [];
    arr.push(t);
    topicsByChapter.set(t.chapter_id, arr);
  }

  const questionsByTopic = new Map<string, typeof questionRows>();
  for (const q of questionRows) {
    const arr = questionsByTopic.get(q.topic_id) ?? [];
    arr.push(q);
    questionsByTopic.set(q.topic_id, arr);
  }

  const classBuckets = new Map<number, typeof chapterRows>();
  for (const c of chapterRows) {
    const arr = classBuckets.get(c.class_id) ?? [];
    arr.push(c);
    classBuckets.set(c.class_id, arr);
  }

  const CLASS_NAMES: Record<number, string> = {
    5: 'পঞ্চম শ্রেণী', 6: 'ষষ্ঠ শ্রেণী', 7: 'সপ্তম শ্রেণী',
    8: 'অষ্টম শ্রেণী', 9: 'নবম শ্রেণী', 10: 'দশম শ্রেণী',
  };

  return Array.from(classBuckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([classId, chapters]): ClassData => ({
      id: classId,
      name: `Class ${classId}`,
      bengaliName: CLASS_NAMES[classId] ?? `শ্রেণী ${classId}`,
      chapters: chapters.map((ch): Chapter => ({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        topics: (topicsByChapter.get(ch.id) ?? []).map((tp): Topic => ({
          id: tp.id,
          name: tp.name,
          description: tp.description,
          questions: (questionsByTopic.get(tp.id) ?? []).map((q): Question => ({
            id: q.id,
            type: q.type,
            text: q.text,
            options: q.options ?? undefined,
            answer: q.type === 'mcq' ? parseInt(q.answer, 10) : q.answer,
            solution: q.solution,
            difficulty: q.difficulty,
          })),
        })),
      })),
    }));
}

// ── Public: load once ─────────────────────────────────────────────────────────
export function loadCurriculum(): Promise<ClassData[]> {
  if (cache) return Promise.resolve(cache);
  if (loading) return loading;
  loading = (async () => {
    await seedIfEmpty();
    cache = await buildCache();
    return cache;
  })();
  return loading;
}

// ── Synchronous helpers (same API as old curriculum.ts) ──────────────────────
export function getClassData(classId: number): ClassData | undefined {
  return cache?.find(c => c.id === classId);
}

export function getChapter(classId: number, chapterId: string): Chapter | undefined {
  return getClassData(classId)?.chapters.find(ch => ch.id === chapterId);
}

export function getTopic(classId: number, topicId: string): Topic | undefined {
  return getClassData(classId)
    ?.chapters.flatMap(ch => ch.topics)
    .find(t => t.id === topicId);
}

export function getAllQuestions(
  classId: number,
  chapterId?: string,
  topicId?: string,
  difficulty?: string,
): Question[] {
  const classData = getClassData(classId);
  if (!classData) return [];

  let topics = classData.chapters.flatMap(ch => ch.topics);
  if (chapterId) topics = topics.filter(t => t.id.startsWith(chapterId));
  if (topicId)   topics = topics.filter(t => t.id === topicId);

  let questions = topics.flatMap(t => t.questions);
  if (difficulty) questions = questions.filter(q => q.difficulty === difficulty);
  return questions;
}
