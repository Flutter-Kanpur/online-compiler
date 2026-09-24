# Contributing to Sparx

Sparx is an online coding platform built to help developers build the habit of solving problems every week. It also supports live interview monitoring for web and Flutter developers — no screen share needed.

## Before you start

- **Stack**: React, Vite, Tailwind CSS, Supabase (auth + database), Judge0 (code execution), WebSocket relay server
- **Node version**: 18 or newer (`node --version`)
- **Package manager**: npm

## Set up locally

```bash
git clone https://github.com/Flutter-Kanpur/online-compiler.git
cd online-compiler
npm install
cp .env.example .env
```

Fill in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You need a free Supabase project — create one at [supabase.com](https://supabase.com), then run the migration SQL in the Supabase SQL editor:

```
supabase/migrations/0001_init.sql
```

Seed the problem catalog (one-time):

```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=xxx \
node scripts/seed-problems.mjs
```

Start the app:

```bash
npm run dev          # app only
npm run dev:all      # app + live interview relay server
```

Open `http://localhost:5173`.

> Don't have Supabase keys? Ask in the Flutter Kanpur WhatsApp group — a maintainer will share test credentials.

## Project structure

```
src/
  App.jsx           → routing, auth gate, app shell
  problems.js       → problem catalog (offline fallback)
  lib/
    supabaseClient.js → Supabase client
    auth.jsx          → AuthProvider, useAuth hook
    db.js             → all database queries
  pages/
    ProblemPage.jsx   → code editor + submission
    AdminPage.jsx     → admin panel
    interview/        → live interview candidate/interviewer views
  interview/          → WebSocket client for live interviews
server/
  index.js          → relay server for live interview rooms
scripts/
  seed-problems.mjs → loads problems into Supabase
supabase/
  migrations/       → database schema
```

## What to pick up

Look for issues labelled **`good first issue`** on GitHub. Good areas to start:

- **UI improvements** — problem list layout, editor theme, mobile responsiveness
- **New problems** — add problems to `src/problems.js` following the existing format
- **Language support** — improve starter code templates for existing languages
- **User experience** — submission history, solved problem badges, streak tracking
- **Bug fixes** — reported issues with code execution, auth flow, or live interviews

## How to contribute

1. **Pick an issue** — comment on it so others know you're working on it
2. **Fork and branch** — branch name: `fix/issue-title` or `feat/feature-name`
3. **Make your change** — keep it focused; one issue per PR
4. **Test it** — run the app locally, try submitting a solution, check on mobile
5. **Open a PR** — describe what you changed and why, link the issue

```bash
git checkout -b fix/your-issue-title
# make changes
git commit -m "fix: short description"
git push origin fix/your-issue-title
# open PR on GitHub
```

## Adding a new problem

Open `src/problems.js` and add a new object following this format:

```js
{
  id: "unique-slug",           // lowercase, url-safe
  title: "Problem Title",
  difficulty: "easy",          // "starter" | "easy" | "medium"
  tags: ["arrays", "loops"],
  statement: `Problem description here.`,
  examples: [
    { input: "5", output: "120" }
  ],
  tests: [
    { input: "5", expected: "120" },
    { input: "0", expected: "1" },
  ],
  starter: {
    python:     "# your code here",
    cpp:        "#include <iostream>\nint main() { return 0; }",
    java:       "public class Main { public static void main(String[] a) {} }",
    javascript: "// your code here",
    c:          "#include <stdio.h>\nint main() { return 0; }",
  },
}
```

Save — the app hot-reloads. Test your problem by running it locally before opening a PR.

## Code style

- Keep components in `src/pages/` or extract to `src/components/` if reused
- Use Tailwind classes — avoid inline styles
- Keep functions small and named clearly
- No `console.log` in PRs

## Need help?

Drop a message in the Flutter Kanpur WhatsApp group or comment on the issue. No question is too small — we want first-time contributors to succeed.
