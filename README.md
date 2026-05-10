# spark — local setup

A modern, playful DSA practice playground. Runs in your browser, executes code via the public Judge0 sandbox.

**One file = the whole app**: `src/App.jsx` (UI) + `src/problems.js` (problems + tests).

---

## Prerequisites

You need **one** thing installed: **Node.js 18 or newer**.

Check if you have it:

```bash
node --version
```

If you see something like `v18.x.x` or higher → you're good. If not, install from [nodejs.org](https://nodejs.org/) (just download the LTS installer for your OS).

That's it. No other dependencies. No Python, no Docker, no database.

---

## Run it locally (3 commands)

Open a terminal in the project folder, then:

```bash
# 1. Install dependencies (~30 seconds, ~100 MB on disk)
npm install

# 2. Start the dev server
npm run dev

# 3. Your browser will open automatically at http://localhost:5173
```

That's literally it. The app will hot-reload as you edit files.

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

Then in **`src/App.jsx`**, change ONE line:

```js
const JUDGE0_URL = "http://your-machine:2358";
```

Restart `npm run dev` and you're now using your own private Judge0. Unlimited submissions.

---

## Project structure

```
spark/
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
│   ├── App.jsx                  ← MAIN APP (~1100 lines, the entire UI)
│   ├── problems.js              ← THE PROBLEM CATALOG (edit to add more)
│   └── index.css                ← Tailwind imports
├── scripts/
│   └── import-apps.py           ← Optional: import 50+ problems from APPS dataset
└── data/                        ← (created when you run import-apps.py)
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

[APPS](https://huggingface.co/datasets/codeparrot/apps) is an MIT-licensed dataset of 10,000 coding problems with full test cases. The included Python script downloads it and converts it into the spark format.

**You need Python 3.8+** for this step:

```bash
# Install the HuggingFace datasets library (one-time)
pip install datasets

# Run the importer (downloads ~few hundred MB the first time)
python scripts/import-apps.py --difficulty introductory --limit 50 --output data/apps-problems.json
```

Then in `src/App.jsx`, replace:

```js
import { PROBLEMS } from "./problems.js";
```

with:

```js
import problemsJson from "../data/apps-problems.json";
const PROBLEMS = problemsJson;
```

Restart the dev server (`Ctrl+C` then `npm run dev`). You now have 50 real problems with real test cases.

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

**Is**: A working playground. A starting point. A demo of the full flow (catalog → editor → judge → verdict). All real, no mocks.

**Isn't**: A production platform. There's no auth, no database, no progress persistence (refresh = lose your "solved" state). For production, see the larger `codepit-scaffold` project (Next.js + Supabase + Judge0 self-hosted).

---

## License

MIT for the code. Problems are hand-written here; if you import APPS, that data is MIT too.

Judge0 itself is GPLv3 — you're calling its API, not redistributing its code, so it doesn't affect this project's license.
