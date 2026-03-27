const ICON_NORMAL = "/favicon.png";
const ICON_ALERT  = makeFavicon("#f87171");
let flashTimer = null;
let scrollTimer = null;
let scrollText = "";
let scrollPos = 0;

export const APP_TITLE = "pulsarchat";
const TYPING_TITLE = "someone is typing \u00b7 pulsarchat";

function makeFavicon(color) {
  const c = document.createElement("canvas");
  c.width = 32; c.height = 32;
  const ctx = c.getContext("2d");
  ctx.beginPath();
  ctx.arc(16, 16, 12, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  return c.toDataURL();
}

function getLink() {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  return link;
}

// ── Favicon flash ────────────────────────────────────

export function startFlash() {
  if (flashTimer) return;
  const link = getLink();
  let on = false;
  flashTimer = setInterval(() => {
    on = !on;
    link.href = on ? ICON_ALERT : ICON_NORMAL;
  }, 200);
}

export function stopFlash() {
  if (!flashTimer) return;
  clearInterval(flashTimer);
  flashTimer = null;
  getLink().href = ICON_NORMAL;
}

// ── Scrolling title ──────────────────────────────────

export function setScrollingTitle(text) {
  if (!text) {
    stopScrollTitle();
    document.title = APP_TITLE;
    return;
  }

  const padded = TYPING_TITLE + "   \u00b7   ";
  if (scrollTimer && scrollText === padded) return;

  scrollText = padded;
  scrollPos = 0;

  if (!scrollTimer) {
    scrollTimer = setInterval(() => {
      const rotated = scrollText.slice(scrollPos) + scrollText.slice(0, scrollPos);
      document.title = rotated;
      scrollPos = (scrollPos + 1) % scrollText.length;
    }, 250);
  }

  document.title = TYPING_TITLE;
}

export function stopScrollTitle() {
  if (scrollTimer) {
    clearInterval(scrollTimer);
    scrollTimer = null;
  }
  scrollText = "";
  scrollPos = 0;
}

// ── Reset to default ─────────────────────────────────

export function resetTitle() {
  stopScrollTitle();
  stopFlash();
  document.title = APP_TITLE;
  getLink().href = ICON_NORMAL;
}
