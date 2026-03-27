import { APP_TITLE } from "./notify";

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
  const handle = params.get("contact")?.toUpperCase() || "";

  if (!roomCode || !handle) return null;

  return { roomCode, handle };
}
