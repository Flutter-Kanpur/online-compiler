// Minimal interview relay server.
//
// Holds interview "rooms" in memory (no database — rooms live only as long
// as this process runs) and relays live state between one candidate browser
// tab and any number of interviewer browser tabs over WebSocket:
//   - candidate code edits, language switches, active-problem switches
//   - run/submit verdicts (computed client-side against Judge0, then mirrored here)
//   - connect/disconnect presence
//
// The actual code execution still happens client-side against the public
// Judge0 sandbox (see src/pages/ProblemPage.jsx) — this server only relays
// state, it never runs candidate code.

import express from "express";
import cors from "cors";
import http from "http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { nanoid } from "nanoid";
import { createClient } from "@supabase/supabase-js";

// Manual .env loader — no `dotenv` dependency, and unlike Node's
// `--env-file` flag this doesn't throw when the file is absent (so
// `npm run server` / `npm run dev:all` keep working with zero setup for
// contributors who don't have Supabase credentials). Real shell-exported
// env vars still win (standard dotenv semantics).
function loadDotEnvIfPresent() {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnvIfPresent();

const PORT = process.env.PORT || 8787;
// Default room lifetime when the interviewer doesn't set one explicitly —
// each room actually expires per its own `expiresAfterHours` (see
// normalizeExpiresAfterHours/roomExpiryMs), not this global constant; it's
// only the fallback default and the boot-query's outer sanity bound.
const DEFAULT_ROOM_TTL_HOURS = 8;
const PERSIST_DEBOUNCE_MS = 900;

// Interview rooms persist to Supabase (interview_rooms table, see
// supabase/migrations/0005_interview_rooms.sql) so a restart/redeploy of
// this process doesn't wipe live rooms — but the in-memory `rooms` Map
// below stays the source of truth for live relay; Supabase is a durable
// backup written to (debounced) after the fact, never in the hot path.
// Falls back to in-memory-only if these aren't set, so local dev needs no
// Supabase credentials — same fallback philosophy as
// src/lib/supabaseClient.js's isSupabaseConfigured on the frontend.
//
// NOT distributed: two concurrent instances of this server would still
// silently partition live WS relaying (interviewerSockets/candidateSocket
// are process-local, Supabase doesn't mediate that) even though writes to
// the table itself wouldn't corrupt. Fine for a single instance (the
// actual deployment target); would need Postgres LISTEN/NOTIFY or Supabase
// Realtime to fan out across instances if this ever needs to scale beyond
// one.
const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

if (!supabase) {
  console.warn(
    "[interview-relay] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — " +
    "interview room persistence disabled; rooms live in memory only and " +
    "will be lost on restart."
  );
}

const app = express();
app.use(cors());
app.use(express.json());

/** @type {Map<string, Room>} */
const rooms = new Map();
/** @type {Map<string, NodeJS.Timeout>} */
const pendingPersists = new Map();
/** @type {Map<string, NodeJS.Timeout>} */
const autoEndTimers = new Map();

const DEFAULT_WEBUI = {
  html: `<div class="card">\n  <h1>Hello!</h1>\n  <p>Start building.</p>\n</div>`,
  css: `.card {\n  font-family: sans-serif;\n  padding: 24px;\n  border-radius: 12px;\n  background: #f4f4f5;\n}`,
  js: `// your code here`,
};

/** blank/0/invalid -> null ("no limit" — never schedules a timer, never shown in either UI). */
function normalizeTimeLimitMinutes(timeLimitMinutes) {
  const n = Number(timeLimitMinutes);
  return timeLimitMinutes != null && timeLimitMinutes !== "" && Number.isFinite(n) && n > 0
    ? Math.floor(n)
    : null;
}

/** blank/0/invalid -> the default (how long a room stays joinable before anyone's clicked the link). */
function normalizeExpiresAfterHours(expiresAfterHours) {
  const n = Number(expiresAfterHours);
  return expiresAfterHours != null && expiresAfterHours !== "" && Number.isFinite(n) && n > 0
    ? n
    : DEFAULT_ROOM_TTL_HOURS;
}

function roomExpiryMs(room) {
  return (room.expiresAfterHours ?? DEFAULT_ROOM_TTL_HOURS) * 60 * 60 * 1000;
}

function makeRoom({ title, problemIds, flutterRound, flutterGistId, flutterPrompt, webuiRound, webuiPrompt, timeLimitMinutes, expiresAfterHours, isTemplate }) {
  const id = nanoid(8);
  const room = {
    id,
    title: title && title.trim() ? title.trim() : "Interview",
    problemIds,
    flutterRound: !!flutterRound,
    flutterGistId: flutterGistId && flutterGistId.trim() ? flutterGistId.trim() : null,
    flutterPrompt: flutterPrompt && flutterPrompt.trim() ? flutterPrompt.trim() : null,
    webuiRound: !!webuiRound,
    webuiPrompt: webuiPrompt && webuiPrompt.trim() ? webuiPrompt.trim() : null,
    timeLimitMinutes: normalizeTimeLimitMinutes(timeLimitMinutes),
    expiresAfterHours: normalizeExpiresAfterHours(expiresAfterHours),
    isTemplate: !!isTemplate,
    createdAt: Date.now(),
    candidateSocket: null,
    interviewerSockets: new Set(),
    state: {
      activeProblemId: problemIds[0],
      language: "python",
      codeByProblem: {},
      lastResultByProblem: {},
      webui: { ...DEFAULT_WEBUI },
      candidateName: null,
      candidateConnected: false,
      testStartedAt: null,
    },
  };
  rooms.set(id, room);
  persistRoomInsert(room);
  return room;
}

// ---------------------------------------------------------------------------
// Supabase persistence — every function here is try/catch-wrapped and only
// ever logs a warning on failure. A DB hiccup must never throw into a route
// handler or block live relaying; it just means that moment isn't backed up.
// ---------------------------------------------------------------------------

function stateForPersist(state) {
  // candidateConnected is a live connection flag, not durable room data —
  // always recomputed as false on rehydration (a fresh process has no live
  // sockets yet), so don't persist it.
  const { candidateConnected, ...rest } = state;
  return rest;
}

function roomToRow(room) {
  return {
    id: room.id,
    title: room.title,
    problem_ids: room.problemIds,
    flutter_round: room.flutterRound,
    flutter_gist_id: room.flutterGistId,
    flutter_prompt: room.flutterPrompt,
    webui_round: room.webuiRound,
    webui_prompt: room.webuiPrompt,
    time_limit_minutes: room.timeLimitMinutes,
    expires_after_hours: room.expiresAfterHours,
    is_template: room.isTemplate,
    state: stateForPersist(room.state),
    created_at: new Date(room.createdAt).toISOString(),
  };
}

function rowToRoom(row) {
  return {
    id: row.id,
    title: row.title,
    problemIds: row.problem_ids || [],
    flutterRound: row.flutter_round,
    flutterGistId: row.flutter_gist_id,
    flutterPrompt: row.flutter_prompt,
    webuiRound: row.webui_round,
    webuiPrompt: row.webui_prompt,
    timeLimitMinutes: row.time_limit_minutes ?? null,
    expiresAfterHours: row.expires_after_hours ?? DEFAULT_ROOM_TTL_HOURS,
    isTemplate: !!row.is_template,
    createdAt: new Date(row.created_at).getTime(),
    candidateSocket: null,
    interviewerSockets: new Set(),
    state: { ...row.state, candidateConnected: false },
  };
}

async function persistRoomInsert(room) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("interview_rooms").insert(roomToRow(room));
    if (error) console.warn("[interview-relay] insert failed", room.id, error.message);
  } catch (err) {
    console.warn("[interview-relay] insert failed", room.id, err);
  }
}

async function persistRoomState(room) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from("interview_rooms")
      .update({ state: stateForPersist(room.state) })
      .eq("id", room.id);
    if (error) console.warn("[interview-relay] state persist failed", room.id, error.message);
  } catch (err) {
    console.warn("[interview-relay] state persist failed", room.id, err);
  }
}

/**
 * Logs one real submit attempt to the permanent interview_submissions table
 * so the admin panel can review completion/results after a session has
 * ended, not just live. Fire-and-forget from the caller, same as every
 * other persistence helper here — never blocks the live relay path.
 * result.time from Judge0 is in seconds; time_ms needs the same *1000
 * conversion ProblemPage.jsx's insertSubmission already applies.
 */
async function persistInterviewSubmission(room, problemId, result) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("interview_submissions").insert({
      room_id: room.id,
      room_title: room.title,
      candidate_name: room.state.candidateName,
      problem_id: problemId,
      kind: "submit",
      language: room.state.language,
      code: room.state.codeByProblem[problemId] || "",
      verdict: result.verdict,
      passed: result.passed ?? null,
      total: result.total ?? null,
      time_ms: (result.time ?? 0) * 1000,
      memory_kb: result.memory ?? null,
    });
    if (error) console.warn("[interview-relay] submission persist failed", room.id, error.message);
  } catch (err) {
    console.warn("[interview-relay] submission persist failed", room.id, err);
  }
}

async function deleteRoomRow(roomId) {
  if (!supabase) return;
  try {
    const { error } = await supabase.from("interview_rooms").delete().eq("id", roomId);
    if (error) console.warn("[interview-relay] delete failed", roomId, error.message);
  } catch (err) {
    console.warn("[interview-relay] delete failed", roomId, err);
  }
}

async function fetchRoomRow(roomId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("interview_rooms").select("*").eq("id", roomId).maybeSingle();
    if (error) {
      console.warn("[interview-relay] fetch failed", roomId, error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("[interview-relay] fetch failed", roomId, err);
    return null;
  }
}

/** Cache-miss fallback: queries Supabase for a room not currently in the in-memory Map. */
async function tryRehydrateOne(roomId) {
  const row = await fetchRoomRow(roomId);
  if (!row) return null;
  const room = rowToRoom(row);
  if (Date.now() - room.createdAt > roomExpiryMs(room)) {
    deleteRoomRow(roomId); // stale — the sweep hasn't reached it yet, don't resurrect it
    return null;
  }
  rooms.set(room.id, room);
  scheduleAutoEnd(room);
  return room;
}

/**
 * Bulk-loads still-live rooms from Supabase at boot. Non-blocking — never
 * delays server.listen(). Each room's own expiresAfterHours decides
 * whether it's actually still live (no single global cutoff, since rooms
 * can have different expiry windows) — this only bounds the initial fetch
 * to a generous 30 days as a sanity limit, not the real expiry check.
 */
async function rehydrateRoomsOnBoot() {
  if (!supabase) return;
  const outerBoundIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data, error } = await supabase.from("interview_rooms").select("*").gt("created_at", outerBoundIso);
    if (error) {
      console.warn("[interview-relay] boot rehydrate failed", error.message);
      return;
    }
    for (const row of data || []) {
      if (rooms.has(row.id)) continue;
      const room = rowToRoom(row);
      if (Date.now() - room.createdAt > roomExpiryMs(room)) {
        deleteRoomRow(row.id); // expired per its own window — don't resurrect it
        continue;
      }
      rooms.set(row.id, room);
      scheduleAutoEnd(room);
    }
    console.log(`[interview-relay] rehydrated ${data?.length ?? 0} room(s) from Supabase`);
  } catch (err) {
    console.warn("[interview-relay] boot rehydrate failed", err);
  }
}

/** Debounced (~900ms) per-room state write, so rapid typing doesn't hammer the DB. */
function schedulePersist(room) {
  if (!supabase) return;
  const existing = pendingPersists.get(room.id);
  if (existing) clearTimeout(existing);
  pendingPersists.set(room.id, setTimeout(() => {
    pendingPersists.delete(room.id);
    persistRoomState(room);
  }, PERSIST_DEBOUNCE_MS));
}

function clearPendingPersist(roomId) {
  const t = pendingPersists.get(roomId);
  if (t) {
    clearTimeout(t);
    pendingPersists.delete(roomId);
  }
}

/**
 * (Re)schedules a room's auto-end for when its time limit runs out, based on
 * room.state.testStartedAt. No-op if the room has no limit or hasn't
 * started yet. If the deadline has already passed — e.g. a room rehydrated
 * after the process was down past its limit — ends it immediately instead
 * of scheduling, so auto-end stays correct across a restart rather than
 * just resetting the clock.
 */
function scheduleAutoEnd(room) {
  clearAutoEndTimer(room.id);
  if (!room.timeLimitMinutes || !room.state.testStartedAt) return;
  const deadline = room.state.testStartedAt + room.timeLimitMinutes * 60 * 1000;
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    endInterviewRoom(room.id, "timeout");
    return;
  }
  autoEndTimers.set(room.id, setTimeout(() => endInterviewRoom(room.id, "timeout"), remaining));
}

function clearAutoEndTimer(roomId) {
  const t = autoEndTimers.get(roomId);
  if (t) {
    clearTimeout(t);
    autoEndTimers.delete(roomId);
  }
}

/**
 * The single place an interview room ever gets ended, however it's
 * triggered (interviewer clicking End, candidate clicking End test, or the
 * time-limit timer firing) — notifies both sides, tears down sockets, and
 * removes all durable/pending state for the room. Has no `await` before
 * `rooms.delete()`, so a manual end and an auto-end racing each other can't
 * double-fire: whichever call's synchronous prefix runs first wins, the
 * second sees `room` as undefined and just re-runs the already-idempotent
 * cleanup tail.
 */
async function endInterviewRoom(roomId, reason) {
  const room = rooms.get(roomId);
  if (room) {
    toCandidate(room, { type: "ended", reason });
    toInterviewers(room, { type: "ended", reason });
    closeAll(room.candidateSocket);
    room.interviewerSockets.forEach(closeAll);
  }
  rooms.delete(roomId);
  clearPendingPersist(roomId);
  clearAutoEndTimer(roomId);
  await deleteRoomRow(roomId);
}

function roomSummary(room) {
  return {
    roomId: room.id,
    title: room.title,
    problemIds: room.problemIds,
    flutterRound: room.flutterRound,
    flutterGistId: room.flutterGistId,
    flutterPrompt: room.flutterPrompt,
    webuiRound: room.webuiRound,
    webuiPrompt: room.webuiPrompt,
    timeLimitMinutes: room.timeLimitMinutes,
    expiresAfterHours: room.expiresAfterHours,
    isTemplate: !!room.isTemplate,
    testStartedAt: room.state.testStartedAt ?? null,
    createdAt: room.createdAt,
    candidateConnected: room.state.candidateConnected,
    candidateName: room.state.candidateName,
    interviewerCount: room.interviewerSockets.size,
  };
}

app.post("/api/interviews", (req, res) => {
  const { title, problemIds = [], flutterRound, flutterGistId, flutterPrompt, webuiRound, webuiPrompt, timeLimitMinutes, expiresAfterHours, isTemplate } = req.body || {};
  if (!Array.isArray(problemIds)) {
    return res.status(400).json({ error: "problemIds must be an array" });
  }
  if (problemIds.length === 0 && !flutterRound && !webuiRound) {
    return res.status(400).json({ error: "pick at least one problem, or include a Flutter or Web UI round" });
  }
  // Blank/0/omitted means "no limit" (valid); anything else must be a positive number.
  if (timeLimitMinutes != null && timeLimitMinutes !== "" && !(Number.isFinite(Number(timeLimitMinutes)) && Number(timeLimitMinutes) > 0)) {
    return res.status(400).json({ error: "timeLimitMinutes must be a positive number" });
  }
  // Blank/omitted means "use the default"; anything else must be a positive number.
  if (expiresAfterHours != null && expiresAfterHours !== "" && !(Number.isFinite(Number(expiresAfterHours)) && Number(expiresAfterHours) > 0)) {
    return res.status(400).json({ error: "expiresAfterHours must be a positive number" });
  }
  const room = makeRoom({ title, problemIds, flutterRound, flutterGistId, flutterPrompt, webuiRound, webuiPrompt, timeLimitMinutes, expiresAfterHours, isTemplate });
  res.json(roomSummary(room));
});

// Forks a reusable template room into a brand-new, fully independent room
// for one candidate — the only legitimate way a template ever turns into a
// real, joinable session (see the upgrade handler's matching guard below).
app.post("/api/interviews/:roomId/fork", async (req, res) => {
  let room = rooms.get(req.params.roomId);
  if (!room) room = await tryRehydrateOne(req.params.roomId);
  if (!room) return res.status(404).json({ error: "interview not found" });
  if (!room.isTemplate) return res.status(400).json({ error: "this interview is not a reusable link" });
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) return res.status(400).json({ error: "name is required" });
  const forked = makeRoom({
    title: room.title,
    problemIds: room.problemIds,
    flutterRound: room.flutterRound,
    flutterGistId: room.flutterGistId,
    flutterPrompt: room.flutterPrompt,
    webuiRound: room.webuiRound,
    webuiPrompt: room.webuiPrompt,
    timeLimitMinutes: room.timeLimitMinutes,
    expiresAfterHours: room.expiresAfterHours,
    isTemplate: false,
  });
  res.json(roomSummary(forked));
});

app.get("/api/interviews", (_req, res) => {
  const list = [...rooms.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(roomSummary);
  res.json({ interviews: list });
});

app.get("/api/interviews/:roomId", async (req, res) => {
  let room = rooms.get(req.params.roomId);
  if (!room) room = await tryRehydrateOne(req.params.roomId);
  if (!room) return res.status(404).json({ error: "interview not found" });
  res.json(roomSummary(room));
});

app.delete("/api/interviews/:roomId", async (req, res) => {
  await endInterviewRoom(req.params.roomId, "manual");
  res.json({ ok: true });
});

function closeAll(ws) {
  if (ws && ws.readyState === ws.OPEN) ws.close();
}

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://localhost");
  const match = url.pathname.match(/^\/ws\/interview\/([^/]+)$/);
  const role = url.searchParams.get("role");
  if (!match || (role !== "candidate" && role !== "interviewer")) {
    socket.destroy();
    return;
  }
  const roomId = match[1];
  (async () => {
    let room = rooms.get(roomId);
    if (!room) room = await tryRehydrateOne(roomId);
    // A template room is never itself a live session — the only legitimate
    // path onto a real one is fork-then-redirect (see the /fork route).
    if (!room || socket.destroyed || (role === "candidate" && room.isTemplate)) {
      if (!socket.destroyed) socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, { room, role });
    });
  })();
});

wss.on("connection", (ws, { room, role }) => {
  if (role === "candidate") {
    room.candidateSocket = ws;
    room.state.candidateConnected = true;
    toInterviewers(room, { type: "presence", role: "candidate", connected: true });
  } else {
    room.interviewerSockets.add(ws);
    toCandidate(room, {
      type: "presence",
      role: "interviewer",
      connected: true,
      count: room.interviewerSockets.size,
    });
  }

  ws.send(JSON.stringify({ type: "snapshot", state: room.state }));

  ws.on("message", (raw) => {
    if (role !== "candidate") return; // only the candidate socket may mutate state
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    applyCandidateMessage(room, msg);
    toInterviewers(room, msg);
    schedulePersist(room);
  });

  ws.on("close", () => {
    if (role === "candidate") {
      room.candidateSocket = null;
      room.state.candidateConnected = false;
      toInterviewers(room, { type: "presence", role: "candidate", connected: false });
    } else {
      room.interviewerSockets.delete(ws);
      toCandidate(room, {
        type: "presence",
        role: "interviewer",
        connected: room.interviewerSockets.size > 0,
        count: room.interviewerSockets.size,
      });
    }
  });
});

function applyCandidateMessage(room, msg) {
  switch (msg?.type) {
    case "name":
      room.state.candidateName = msg.name;
      // First time this room's candidate has ever identified themselves:
      // if a time limit is set, this is when the countdown starts (not
      // room-creation time — the candidate usually joins some time later).
      if (!room.state.testStartedAt && room.timeLimitMinutes) {
        room.state.testStartedAt = Date.now();
        scheduleAutoEnd(room);
        const timing = { type: "timing", testStartedAt: room.state.testStartedAt, timeLimitMinutes: room.timeLimitMinutes };
        toCandidate(room, timing);
        toInterviewers(room, timing);
      }
      break;
    case "code":
      room.state.codeByProblem[msg.problemId] = msg.code;
      room.state.language = msg.language;
      break;
    case "activeProblem":
      room.state.activeProblemId = msg.problemId;
      break;
    case "result":
      room.state.lastResultByProblem[msg.problemId] = msg.result;
      if (msg.result?.kind === "submit") {
        persistInterviewSubmission(room, msg.problemId, msg.result); // fire-and-forget, never blocks relay
      }
      break;
    case "webuiCode":
      room.state.webui = { html: msg.html ?? "", css: msg.css ?? "", js: msg.js ?? "" };
      break;
    default:
      break;
  }
}

function toInterviewers(room, msg) {
  const data = JSON.stringify(msg);
  for (const ws of room.interviewerSockets) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

function toCandidate(room, msg) {
  const ws = room.candidateSocket;
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

// Sweep stale rooms every 30 minutes so long-idle interviews don't leak
// memory. Each room has its own expiresAfterHours now (not one global
// cutoff), so this checks per-room in memory, then separately reconciles
// Supabase the same way rehydrateRoomsOnBoot does — fetching rows and
// filtering expiry client-side, since a single-column `.lt()` query can't
// express "compare to a per-row expiry window."
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > roomExpiryMs(room)) {
      rooms.delete(id);
      clearPendingPersist(id);
      clearAutoEndTimer(id);
    }
  }
  if (supabase) {
    (async () => {
      try {
        const { data, error } = await supabase.from("interview_rooms").select("id, created_at, expires_after_hours");
        if (error) {
          console.warn("[interview-relay] TTL sweep failed", error.message);
          return;
        }
        const expiredIds = (data || [])
          .filter((row) => now - new Date(row.created_at).getTime() > (row.expires_after_hours ?? DEFAULT_ROOM_TTL_HOURS) * 60 * 60 * 1000)
          .map((row) => row.id);
        if (expiredIds.length === 0) return;
        const { error: deleteError } = await supabase.from("interview_rooms").delete().in("id", expiredIds);
        if (deleteError) console.warn("[interview-relay] TTL sweep failed", deleteError.message);
      } catch (err) {
        console.warn("[interview-relay] TTL sweep failed", err);
      }
    })();
  }
}, 30 * 60 * 1000);

rehydrateRoomsOnBoot();

server.listen(PORT, () => {
  console.log(`Interview relay server listening on http://localhost:${PORT}`);
});
