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
import { WebSocketServer } from "ws";
import { nanoid } from "nanoid";

const PORT = process.env.PORT || 8787;
const ROOM_TTL_MS = 8 * 60 * 60 * 1000; // rooms are swept 8h after creation

const app = express();
app.use(cors());
app.use(express.json());

/** @type {Map<string, Room>} */
const rooms = new Map();

const DEFAULT_WEBUI = {
  html: `<div class="card">\n  <h1>Hello!</h1>\n  <p>Start building.</p>\n</div>`,
  css: `.card {\n  font-family: sans-serif;\n  padding: 24px;\n  border-radius: 12px;\n  background: #f4f4f5;\n}`,
  js: `// your code here`,
};

function makeRoom({ title, problemIds, flutterRound, flutterGistId, flutterPrompt, webuiRound, webuiPrompt }) {
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
    },
  };
  rooms.set(id, room);
  return room;
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
    createdAt: room.createdAt,
    candidateConnected: room.state.candidateConnected,
    candidateName: room.state.candidateName,
    interviewerCount: room.interviewerSockets.size,
  };
}

app.post("/api/interviews", (req, res) => {
  const { title, problemIds = [], flutterRound, flutterGistId, flutterPrompt, webuiRound, webuiPrompt } = req.body || {};
  if (!Array.isArray(problemIds)) {
    return res.status(400).json({ error: "problemIds must be an array" });
  }
  if (problemIds.length === 0 && !flutterRound && !webuiRound) {
    return res.status(400).json({ error: "pick at least one problem, or include a Flutter or Web UI round" });
  }
  const room = makeRoom({ title, problemIds, flutterRound, flutterGistId, flutterPrompt, webuiRound, webuiPrompt });
  res.json(roomSummary(room));
});

app.get("/api/interviews", (_req, res) => {
  const list = [...rooms.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(roomSummary);
  res.json({ interviews: list });
});

app.get("/api/interviews/:roomId", (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: "interview not found" });
  res.json(roomSummary(room));
});

app.delete("/api/interviews/:roomId", (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (room) {
    closeAll(room.candidateSocket);
    room.interviewerSockets.forEach(closeAll);
  }
  rooms.delete(req.params.roomId);
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
  const room = match && rooms.get(match[1]);

  if (!room || (role !== "candidate" && role !== "interviewer")) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, { room, role });
  });
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

// Sweep stale rooms every 30 minutes so long-idle interviews don't leak memory.
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) rooms.delete(id);
  }
}, 30 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Interview relay server listening on http://localhost:${PORT}`);
});
