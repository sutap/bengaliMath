/**
 * db.ts — Supabase-backed curriculum service.
 *
 * Loads all curriculum data once from Supabase and caches it in memory.
 * After `loadCurriculum()` resolves, the synchronous helpers (getClassData,
 * getAllQuestions, etc.) work identically to the old curriculum.ts exports,
 * so existing components need no changes.
 */

import { supabase } from '../lib/supabase';
import type { ClassData, Chapter, Topic, Question } from '../types';

// ── In-memory cache ──────────────────────────────────────────────────────────
let cache: ClassData[] | null = null;

// ── Raw DB row types ─────────────────────────────────────────────────────────
interface ChapterRow {
  id: string;
  class_id: number;
  name: string;
  description: string;
}

interface TopicRow {
  id: string;
  chapter_id: string;
  name: string;
  description: string;
}

interface QuestionRow {
  id: string;
  topic_id: string;
  type: 'mcq' | 'short';
  text: string;
  options: string[] | null;
  answer: string;
  solution: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ── Load & cache ─────────────────────────────────────────────────────────────
export async function loadCurriculum(): Promise<ClassData[]> {
  if (cache) return cache;

  const [{ data: chapterRows, error: ce }, { data: topicRows, error: te }, { data: questionRows, error: qe }] =
    await Promise.all([
      supabase.from('chapters').select('*').order('class_id').order('id'),
      supabase.from('topics').select('*').order('id'),
      supabase.from('questions').select('*').order('id'),
    ]);

  if (ce || te || qe) {
    throw new Error(`DB load failed: ${ce?.message ?? te?.message ?? qe?.message}`);
  }

  // Index topics and questions for O(1) lookup
  const topicsByChapter = new Map<string, TopicRow[]>();
  for (const t of (topicRows as TopicRow[])) {
    const arr = topicsByChapter.get(t.chapter_id) ?? [];
    arr.push(t);
    topicsByChapter.set(t.chapter_id, arr);
  }

  const questionsByTopic = new Map<string, QuestionRow[]>();
  for (const q of (questionRows as QuestionRow[])) {
    const arr = questionsByTopic.get(q.topic_id) ?? [];
    arr.push(q);
    questionsByTopic.set(q.topic_id, arr);
  }

  // Group chapters by class_id
  const classBuckets = new Map<number, ChapterRow[]>();
  for (const c of (chapterRows as ChapterRow[])) {
    const arr = classBuckets.get(c.class_id) ?? [];
    arr.push(c);
    classBuckets.set(c.class_id, arr);
  }

  const CLASS_NAMES: Record<number, string> = {
    5: 'পঞ্চম শ্রেণী',
    6: 'ষষ্ঠ শ্রেণী',
    7: 'সপ্তম শ্রেণী',
    8: 'অষ্টম শ্রেণী',
    9: 'নবম শ্রেণী',
    10: 'দশম শ্রেণী',
  };

  cache = Array.from(classBuckets.entries())
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

  return cache;
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
