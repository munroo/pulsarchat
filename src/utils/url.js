import { APP_TITLE } from "./notify";
import { normalizeHandle } from "./handle";

export function pushTypingToUrl(roomCode, text) {
  // URL is never touched — title is handled by notify.js
}

export function clearUrl(roomCode) {
  // no-op, handled by notify.js
}

export function resetUrl() {
  window.history.replaceState(null, APP_TITLE, window.location.pathname);
}

export function getInitialRoomCode() {
  return (
    new URLSearchParams(window.location.search).get("room")?.toUpperCase() || ""
  );
}

export function getInitialSavedInvite() {
  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get("savedRoom")?.toUpperCase() || "";
  const handle = normalizeHandle(params.get("contact") || "");

  if (!roomCode || !handle) return null;

  return { roomCode, handle };
}

export function getInitialAddContactHandle() {
  const params = new URLSearchParams(window.location.search);
  return normalizeHandle(params.get("addContact") || "");
}

export function buildAddContactUrl(handle) {
  const normalizedHandle = normalizeHandle(handle);
  const base =
    import.meta.env.VITE_APP_URL?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (!base || !normalizedHandle) return "";

  const url = new URL(base);
  url.searchParams.set("addContact", normalizedHandle);
  return url.toString();
}
