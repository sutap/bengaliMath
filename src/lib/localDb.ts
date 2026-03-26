/**
 * localDb.ts — Dexie (IndexedDB) database definition.
 *
 * Three tables mirror the Supabase schema exactly so the same seed script
 * shape works for both backends.
 */

import Dexie, { type Table } from 'dexie';

export interface ChapterRow {
  id: string;
  class_id: number;
  name: string;
  description: string;
}

export interface TopicRow {
  id: string;
  chapter_id: string;
  name: string;
  description: string;
}

export interface QuestionRow {
  id: string;
  topic_id: string;
  type: 'mcq' | 'short';
  text: string;
  options: string[] | null;
  answer: string;
  solution: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

class GanitDB extends Dexie {
  chapters!: Table<ChapterRow, string>;
  topics!: Table<TopicRow, string>;
  questions!: Table<QuestionRow, string>;

  constructor() {
    super('ganitShiksha');
    this.version(1).stores({
      chapters:  'id, class_id',
      topics:    'id, chapter_id',
      questions: 'id, topic_id, difficulty',
    });
  }
}

export const localDb = new GanitDB();
