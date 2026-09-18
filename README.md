# Sparx — local setup

Sparx, by Flutter Kanpur — a DSA practice platform with real accounts, a real database, and real submission
history — powered by Supabase (Postgres + auth) and the public Judge0 sandbox for code execution.

---

## Prerequisites

- **Node.js 18 or newer** — check with `node --version`, install from [nodejs.org](https://nodejs.org/) if needed.
- **A free [Supabase](https://supabase.com) account** — this is where users, problems, and submissions
  actually live. Nothing works (sign-in, solving, admin) without it.

---

## Run it locally

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

At [supabase.com](https://supabase.com) → New project (free tier is plenty for this). Once it's ready:

- **Project Settings → API** → copy the **Project URL** and the **anon public** key.
- **SQL Editor** → paste the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → Run.
  This creates the `profiles` / `problems` / `submissions` / `solved_problems` tables, Row Level Security
  policies, and a trigger that auto-creates a profile whenever someone signs up.
- **Authentication → Providers** → email/password is on by default; to enable **Google sign-in**, turn on
  the Google provider and add its client ID/secret (see Supabase's own Google-auth guide — it's a few
  clicks in the Google Cloud console).

### 3. Configure the app

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from step 2.

### 4. Seed the problem catalog (one-time)

The 10 hand-written problems in `src/problems.js` aren't loaded automatically — load them into your new
database once:

```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=xxx \
node scripts/seed-problems.mjs
```

(The **service_role** key, not the anon key — Project Settings → API. This only ever runs on your machine.)

### 5. Start the app and become admin

```bash
npm run dev
```

Open `http://localhost:5173`, sign up for an account through the app's own sign-up form. Then, back in
Supabase's SQL editor, promote yourself:

```sql
select id, username from public.profiles;              -- find your id
update public.profiles set role = 'admin' where id = '<your-uuid>';
```

Reload the app — you now have the Admin panel (add/bulk-upload problems, create live interviews, see real
stats).

That's it — the app will hot-reload as you edit files. Without a Supabase project configured, the app shows
a "Supabase isn't configured yet" screen instead of crashing, so you'll know immediately if a step was missed.

---

## Live interviews (DSA coding round)

For running an actual interview, an organizer creates a room from **Admin → Live interviews**, picks 1–3
problems, and gets two links: a **candidate link** (they solve, in their own browser) and an **interviewer
link** (you watch their code and Run/Submit verdicts update live, no screen share needed).

This needs the small relay server in `server/index.js` running alongside Vite — it's what keeps the
candidate and interviewer tabs in sync over WebSocket. It holds rooms in memory only (nothing persists to
disk; ending the app clears them), and it never executes candidate code itself — that still goes straight
from the candidate's browser to Judge0, same as normal problem-solving.

```bash
# Runs the Vite dev server AND the relay server together
npm run dev:all
```

(Or run them separately in two terminals: `npm run dev` and `npm run server`.)

Candidate/interviewer links only work while both `npm run dev:all` (or the two separate processes) stay
running — closing the terminal ends every open interview room.

---

## What you should see

When the app loads:

1. **Landing page** with 10 problems (warmup → easy → medium)
2. Click any problem → opens the editor
3. Choose a language (Python, C++, Java, JavaScript, C)
4. Write code, hit **run** (tests against visible examples) or **submit** (tests against all hidden tests)
5. Real verdict appears: AC (accepted), WA (wrong answer), TLE (too slow), CE (compile error), RE (runtime error)
6. If all tests pass → "nice one!" and the problem gets a "done" badge

Try **say hi to the world** first — fastest way to confirm everything works.

---

## Using the public Judge0 sandbox — important caveats

By default, the app calls `https://ce.judge0.com` — a free, public Judge0 instance.

**This works out of the box but has limits:**
- **Rate limiting**: if you submit a bunch of times fast, you'll get throttled. Wait a few seconds and try again.
- **Reliability**: the public instance can be slow or briefly down. Errors on submission ≠ your code is broken; it's usually the public instance.
- **Not for production**: don't deploy a real platform pointed at this instance.

**If you want unlimited submissions (recommended for serious testing):**

Self-host Judge0 in 5 minutes. You need a Linux box (any cloud VPS or even WSL on Windows):

```bash
# On the Linux box / VM
git clone https://github.com/judge0/judge0.git
cd judge0
docker compose up -d db redis
sleep 10
docker compose up -d
# Now Judge0 is running at http://your-machine:2358
```

Then in **`src/pages/ProblemPage.jsx`**, change ONE line:

```js
const JUDGE0_URL = "http://your-machine:2358";
```

Restart `npm run dev` and you're now using your own private Judge0. Unlimited submissions.

---

## Project structure

```
flutter-kanpur-compiler/
├── README.md                    ← you are here
├── package.json                 ← dependencies (Vite, React, Tailwind)
├── vite.config.js               ← dev server config
├── tailwind.config.js
├── postcss.config.js
├── index.html                   ← root HTML
├── public/
│   └── favicon.svg              ← lightning bolt icon
├── src/
│   ├── main.jsx                 ← React entry point
│   ├── App.jsx                  ← top-level routing + auth gate + shell
│   ├── problems.js              ← offline fallback catalog (used if Supabase is unreachable)
│   ├── index.css                ← Tailwind imports
│   ├── lib/
│   │   ├── supabaseClient.js     ← Supabase client + isSupabaseConfigured check
│   │   ├── auth.jsx              ← AuthProvider / useAuth (sign in/up/out, profile, isAdmin)
│   │   └── db.js                 ← every real query (problems, submissions, stats, admin)
│   ├── interview/                ← candidate ⇄ interviewer WebSocket client
│   └── pages/interview/          ← candidate + interviewer live-view pages
├── supabase/
│   └── migrations/0001_init.sql ← run this once in Supabase's SQL editor
├── server/
│   └── index.js                 ← relay server for live interviews (see below)
├── scripts/
│   ├── seed-problems.mjs        ← loads src/problems.js into your Supabase database
│   └── import-apps.py           ← optional: import 50+ problems from the APPS dataset
└── .env.example                 ← copy to .env, fill in your Supabase project's values
```

---

## Adding more problems

You have two options. Pick one based on how much effort you want to spend.

### Option A — Hand-write more problems

Open `src/problems.js`. Copy any of the existing problem objects and modify it. Each problem needs:

```js
{
  id: "unique-slug",                 // url-safe, lowercase
  title: "lowercase title",          // displayed at the top
  vibe: "easy",                      // just a label
  difficulty: "easy",                // "starter" | "easy" | "medium"
  tags: ["arrays", "math"],          // for the tag chips
  statement: `problem description here.
                multiple lines OK.
                use \`backticks\` for inline code.`,
  examples: [                        // visible to user (used for "Run")
    { input: "5", output: "120" }
  ],
  tests: [                           // includes hidden tests (used for "Submit")
    { input: "5", expected: "120" },
    { input: "0", expected: "1" },
    { input: "10", expected: "3628800" }
  ],
  starter: {                         // starter code per language
    python:     "n = int(input())\n# your code here",
    cpp:        "#include <iostream>\nint main() { return 0; }",
    java:       "public class Main { public static void main(String[] a) {} }",
    javascript: "const n = parseInt(require('fs').readFileSync(0));",
    c:          "#include <stdio.h>\nint main() { return 0; }",
  },
}
```

Save the file. The app hot-reloads automatically.

### Option B — Import 50+ problems from the APPS dataset

[APPS](https://huggingface.co/datasets/codeparrot/apps) is an MIT-licensed dataset of 10,000 coding problems with full test cases. The included Python script downloads it and converts it into this app's problem format.

**You need Python 3.8+** for this step:

```bash
# Install the HuggingFace datasets library (one-time)
pip install datasets

# Run the importer (downloads ~few hundred MB the first time)
python scripts/import-apps.py --difficulty introductory --limit 50 --output data/apps-problems.json
```

Then adapt `scripts/seed-problems.mjs` to read from `data/apps-problems.json` instead of `src/problems.js`
and upsert those rows into Supabase — the live catalog is the `problems` table now, not the static file, so
importing means writing to the database, not swapping a JS import.

---

## Common issues + fixes

**`npm install` fails with permission errors**
On macOS/Linux, never run `sudo npm install`. If you have permission issues, fix npm's prefix per [the official guide](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally).

**`npm run dev` says "command not found"**
Run `npm install` first, then `npm run dev`. The `dev` script is defined in `package.json`.

**Port 5173 is already in use**
Either close whatever is using port 5173, or edit `vite.config.js` and change `port: 5173` to something else.

**Submission errors / "judge0 create failed"**
99% of the time this is the public Judge0 instance rate-limiting you. Wait 30 seconds. If it persists, self-host Judge0 (instructions above).

**Compile errors that look weird**
Each language has a specific version pinned by Judge0:
- Python 3.8 (no walrus operator-fancy newer features)
- C++ GCC 9.2 (C++17)
- Java 13
- Node 12 (no top-level await)
- C GCC 9.2

If your code uses very new language features, downgrade the syntax. The Judge0 language list at [ce.judge0.com/languages](https://ce.judge0.com/languages) shows all available versions.

**The app looks fine but nothing happens when I click submit**
Open browser DevTools (F12) → Console tab. Look for errors. Usually it's a CORS issue or the Judge0 endpoint being unreachable. Try `curl https://ce.judge0.com/about` from your terminal — if that fails, your network is blocking it.

---

## What this is and isn't

**Is**: A real platform — real accounts (email/password + Google), a real Postgres database, real
persisted submissions and solved-state, real admin CRUD, and live interview rooms. Nothing left is mock data.

**Isn't**: Hardened for a large public launch. There's no rate limiting on submissions beyond what the
public Judge0 instance already imposes, no email verification enforcement beyond Supabase's defaults, and
the interview relay server keeps room state in memory only (see the "Live interviews" section above). Fine
for running a club's practice problems and interview rounds; self-host Judge0 and review Supabase's
production checklist before anything higher-stakes.

---

## License

MIT for the code. Problems are hand-written here; if you import APPS, that data is MIT too.

Judge0 itself is GPLv3 — you're calling its API, not redistributing its code, so it doesn't affect this project's license.
