export function pushTypingToUrl(roomCode, text) {
  // URL is never touched — title is handled by notify.js
}

export function clearUrl(roomCode) {
  // no-op, handled by notify.js
}

export function resetUrl() {
  window.history.replaceState(null, "", window.location.pathname);
}

export function getInitialRoomCode() {
  return (
    new URLSearchParams(window.location.search).get("room")?.toUpperCase() || ""
  );
}
