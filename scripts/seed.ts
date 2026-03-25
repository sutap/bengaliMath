/**
 * Seed script — loads curriculum.ts data into Supabase.
 * Usage:
 *   VITE_SUPABASE_URL=https://xxx.supabase.co \
 *   VITE_SUPABASE_ANON_KEY=eyJ... \
 *   npx tsx scripts/seed.ts
 *
 * Requires service-role key (or anon key if RLS insert policy is added).
 * Set SUPABASE_SERVICE_ROLE_KEY to bypass RLS during seeding.
 */

import { createClient } from '@supabase/supabase-js';
import { curriculum } from '../src/data/curriculum';

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function seed() {
  let chaptersInserted = 0;
  let topicsInserted = 0;
  let questionsInserted = 0;

  for (const classData of curriculum) {
    for (const chapter of classData.chapters) {
      // Upsert chapter
      const { error: ce } = await supabase.from('chapters').upsert({
        id: chapter.id,
        class_id: classData.id,
        name: chapter.name,
        description: chapter.description,
      });
      if (ce) { console.error('Chapter error:', ce.message); continue; }
      chaptersInserted++;

      for (const topic of chapter.topics) {
        // Upsert topic
        const { error: te } = await supabase.from('topics').upsert({
          id: topic.id,
          chapter_id: chapter.id,
          name: topic.name,
          description: topic.description,
        });
        if (te) { console.error('Topic error:', te.message); continue; }
        topicsInserted++;

        for (const q of topic.questions) {
          // Upsert question
          const { error: qe } = await supabase.from('questions').upsert({
            id: q.id,
            topic_id: topic.id,
            type: q.type,
            text: q.text,
            options: q.options ?? null,
            answer: String(q.answer),
            solution: q.solution,
            difficulty: q.difficulty,
          });
          if (qe) { console.error('Question error:', qe.message); continue; }
          questionsInserted++;
        }
      }
    }
  }

  console.log(`✓ Seeded: ${chaptersInserted} chapters, ${topicsInserted} topics, ${questionsInserted} questions`);
}

seed().catch(console.error);
