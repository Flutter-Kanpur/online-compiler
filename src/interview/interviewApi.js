// REST + WebSocket client for the interview relay server (server/index.js) —
// a separate, always-on Node process, not something static hosting (Vercel,
// GitHub Pages, Netlify) can run.
//
// Locally, requests go through Vite's dev proxy (/api/interviews,
// /ws/interview/*, see vite.config.js), which forwards same-origin relative
// URLs to http://localhost:8787 — so VITE_INTERVIEW_SERVER_URL can stay
// unset for local dev. In production there's no such proxy, so the relay
// server has to be deployed on its own (e.g. Render) and this env var points
// requests at its real URL instead of the deployed frontend's own origin
// (which has no backend behind it and would otherwise always 404).
const SERVER_URL = (import.meta.env.VITE_INTERVIEW_SERVER_URL || "").replace(/\/+$/, "");
const BASE = `${SERVER_URL}/api/interviews`;

async function asJson(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function createInterview({ title, problemIds, flutterRound, flutterGistId, flutterPrompt, webuiRound, webuiPrompt, timeLimitMinutes, expiresAfterHours }) {
  return fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, problemIds, flutterRound, flutterGistId, flutterPrompt, webuiRound, webuiPrompt, timeLimitMinutes, expiresAfterHours }),
  }).then(asJson);
}

/** DartPad's iframe-embed URL — see https://github.com/dart-lang/dart-pad/wiki/Embedding-guide.
 * Only static gist-loading is supported now; DartPad's old postMessage embed
 * API was discontinued, so there's no way to read code back out of this. */
export function dartpadEmbedUrl(gistId) {
  const params = new URLSearchParams({ embed: "true", theme: "dark" });
  if (gistId) params.set("id", gistId);
  return `https://dartpad.dev/?${params.toString()}`;
}

export function listInterviews() {
  return fetch(BASE).then(asJson).then((d) => d.interviews);
}

export function getInterview(roomId) {
  return fetch(`${BASE}/${roomId}`).then(asJson);
}

export function endInterview(roomId) {
  return fetch(`${BASE}/${roomId}`, { method: "DELETE" }).then(asJson);
}

export function candidateLink(roomId) {
  return `${window.location.origin}/interview/${roomId}/candidate`;
}

export function interviewerLink(roomId) {
  return `${window.location.origin}/interview/${roomId}/interviewer`;
}

export function interviewWsUrl(roomId, role) {
  if (SERVER_URL) {
    // "https"->"ws" leaves the trailing "s" in place, so this also
    // correctly turns "https://" into "wss://" (and "http://" into "ws://").
    return `${SERVER_URL.replace(/^http/, "ws")}/ws/interview/${roomId}?role=${role}`;
  }
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws/interview/${roomId}?role=${role}`;
}

/** Combines a Web UI round's HTML/CSS/JS into one document for the preview iframe's `srcDoc`. */
export function buildWebUIDoc({ html, css, js }) {
  return `<!DOCTYPE html><html><head><style>${css || ""}</style></head><body>${html || ""}<script>${js || ""}<\/script></body></html>`;
}
