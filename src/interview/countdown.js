import { useEffect, useState } from "react";

/** Formats the time remaining until `deadlineMs` as "m:ss", clamped at 0 —
 * the clamp only affects the displayed number; the server (not the client
 * clock) is the actual authority on when time is up. */
export function formatRemaining(deadlineMs) {
  const ms = Math.max(0, deadlineMs - Date.now());
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Ticking "m:ss" string counting down from testStartedAt + timeLimitMinutes,
 * or null if no time limit is set (or the candidate hasn't joined yet) —
 * callers should render nothing in that case. Display-only: this never
 * ends the interview itself, it just formats what's left. */
export function useCountdown(testStartedAt, timeLimitMinutes) {
  const [, tick] = useState(0);

  useEffect(() => {
    if (!testStartedAt || !timeLimitMinutes) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [testStartedAt, timeLimitMinutes]);

  if (!testStartedAt || !timeLimitMinutes) return null;
  return formatRemaining(testStartedAt + timeLimitMinutes * 60 * 1000);
}
