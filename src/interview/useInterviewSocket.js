import { useEffect, useRef, useState, useCallback } from "react";
import { interviewWsUrl } from "./interviewApi.js";

/**
 * Connects to the interview relay's WebSocket for a room and keeps it alive
 * with backoff reconnects. `onMessage` is called with each parsed message;
 * kept in a ref so callers can pass an inline function without reconnecting.
 */
export function useInterviewSocket(roomId, role, onMessage) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  // Lets a caller permanently stop reconnect attempts (e.g. once the
  // interview has ended) without waiting for the component to unmount.
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    cancelledRef.current = false;
    let retryDelay = 1000;
    let ws;

    function connect() {
      if (cancelledRef.current) return;
      ws = new WebSocket(interviewWsUrl(roomId, role));
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retryDelay = 1000;
      };
      ws.onclose = () => {
        setConnected(false);
        if (!cancelledRef.current) {
          setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 1.5, 8000);
        }
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (ev) => {
        try {
          onMessageRef.current?.(JSON.parse(ev.data));
        } catch {
          // ignore malformed frames
        }
      };
    }

    connect();
    return () => {
      cancelledRef.current = true;
      wsRef.current?.close();
    };
  }, [roomId, role]);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    wsRef.current?.close();
  }, []);

  return { connected, send, stop };
}
