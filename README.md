# গণিত শিক্ষা — Bengali Math Learning App

A Bengali-language mathematics learning app for WBBSE students (Class 5–10).
Built with React + TypeScript + Vite. Questions are stored in **Supabase** (free tier).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Database | Supabase (PostgreSQL, free tier) |
| Fonts | Hind Siliguri, Noto Sans Bengali |
| State | localStorage (class, theme, sessions, doubts) |

---

## Supabase Setup (one-time)

### 1. Create a free Supabase project
Go to [supabase.com](https://supabase.com) → New Project (free tier, no credit card).

### 2. Apply the schema
In the Supabase Dashboard → **SQL Editor**, paste and run `supabase/schema.sql`.

### 3. Configure environment variables
```bash
cp .env.example .env
```
Fill in `.env` with values from **Dashboard → Project Settings → API**:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # only needed for seeding
```

### 4. Seed the database
```bash
npx tsx scripts/seed.ts
```
This imports all questions from `src/data/curriculum.ts` into Supabase.
You only need to run this once (or whenever you add new questions to the TS file).

### 5. Run the app
```bash
npm install
npm run dev
```

---

## Adding / Editing Questions

**Option A — via Supabase Dashboard**
Go to Table Editor → `questions` / `topics` / `chapters` and edit rows directly.

**Option B — edit `src/data/curriculum.ts` then re-seed**
```bash
npx tsx scripts/seed.ts
```
The seed script uses `upsert`, so re-running it is safe and idempotent.

---

## Project Structure

```
src/
  components/   — UI components (Syllabus, Practice, DoubtSolver, …)
  data/         — curriculum.ts (source of truth for initial seed)
  lib/          — supabase.ts client
  services/     — db.ts (async loader + in-memory cache)
  utils/        — storage.ts (localStorage helpers)
  types.ts
supabase/
  schema.sql    — run once in Supabase SQL Editor
scripts/
  seed.ts       — populate DB from curriculum.ts
```
