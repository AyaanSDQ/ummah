import { icon } from "./icons.js?v=16";

// Per-type presentation, matching design-reference §15 accent table.
export const TYPE_META = {
  prayer: { label: "Prayer", iconId: "i-minaret" },
  social: { label: "Social", iconId: "i-users" },
  announcement: { label: "Announcement", iconId: "i-mega" },
};

// Smoothly removes a card: it fades and slides, then the gap closes. Honours
// "reduce motion". onDone runs once the element is gone from the page.
export function animateRemove(el, onDone) {
  if (!el || el.classList.contains("realtime-removing")) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.remove();
    onDone?.();
    return;
  }
  el.style.maxHeight = `${el.getBoundingClientRect().height}px`;
  el.classList.add("realtime-removing");
  void el.offsetHeight; // commit the starting height so the collapse animates
  requestAnimationFrame(() => el.classList.add("collapsing"));

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    el.remove();
    onDone?.();
  };
  el.addEventListener("transitionend", (e) => { if (e.target === el && e.propertyName === "max-height") finish(); });
  setTimeout(finish, 650); // fallback if transitionend never fires
}

export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDateHeading(date) {
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const month = date.toLocaleDateString(undefined, { month: "short" });
  return `${weekday} · ${month} ${date.getDate()}`;
}

// How an event's date reads on a card: "Yesterday", "Today", "Tomorrow", the
// weekday ("Wednesday") for the rest of the coming week, and otherwise the
// actual date ("Sun, Nov 15"). Days in the past beyond yesterday use the date
// too, since a bare weekday would read as upcoming.
export function formatEventDate(ts, now = new Date()) {
  if (!ts) return "";
  const d = new Date(ts);
  const dayNum = (x) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 86400000;
  const diff = dayNum(d) - dayNum(now);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff >= 2 && diff <= 6) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// The moment a post is "about": the time set on it, or (for untimed posts like
// plain announcements) when it was posted. Everything that sorts or groups
// posts by day uses this, not created_at.
export function effectiveTime(update) {
  return update.event_time || update.created_at;
}

// Which feed section a post belongs in, judged by its effective time.
export function bucketOf(update, now = new Date()) {
  const t = new Date(effectiveTime(update));
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (t < startToday) return "history";
  if (t < startTomorrow) return "today";
  return "upcoming";
}

export function localDateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function formatRelative(ts) {
  const diffMs = Date.now() - new Date(ts).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "Updated just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `Updated ${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `Updated ${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  return `Updated ${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

// The red "Cancelled" strip on a card, with the admin's reason when there is one.
export function cancelledBanner(reason = "") {
  const why = reason ? `<span class="cancel-why">${escapeHtml(reason)}</span>` : "";
  return `<div class="cancelled-banner">${icon("i-ban", { size: 14, stroke: 2.9 })}<span>Cancelled</span>${why}</div>`;
}

// ── Room labels ──────────────────────────────────────────────────────────
// North Creek has Buildings 1, 2, 3 and A.
// A room number starting with 1, 2 or 3 is in Building 1, 2 or 3 (2140 is in Building 2).
// A room starting with the letter A followed by a number (A101, A-12) is in Building A.
export function buildingFor(location) {
  const loc = location || "";
  const m = /^\s*([123])\d{2,3}\b/.exec(loc);
  if (m) return Number(m[1]);
  if (/^\s*A[\s-]?\d/i.test(loc)) return "A";
  return null;
}

export function roomLabel(location) {
  const b = buildingFor(location);
  return b ? `${location} · Building ${b}` : location;
}

// ── Post presentation helpers (pinned, event tiles) ──────────────────────

// Any post with a date (prayers, socials, dated announcements) gets a calendar-style tile.
export function isEventPost(update) {
  return !!update.event_time;
}

export function badgesHtml(update) {
  const out = [];
  if (update.pinned) out.push(`<span class="badge badge-pin">${icon("i-pushpin", { size: 13 })}Pinned</span>`);
  return out.join("");
}

export function dateTileHtml(ts, type) {
  const d = new Date(ts);
  const month = d.toLocaleDateString(undefined, { month: "short" });
  return `<div class="date-tile" style="--c:var(--type-${type}-hero)" aria-hidden="true"><span class="dt-mon">${escapeHtml(month)}</span><span class="dt-day">${d.getDate()}</span></div>`;
}

// ── Empty-state icon ─────────────────────────────────────────────────────
// Minimalist: one thin purple line icon, no background shapes.
export function emptyIllustration() {
  return `<svg viewBox="8 8 48 48" width="56" height="56" aria-hidden="true" focusable="false"><path fill="#7a49b8" d="M30.76 15.02A17 17 0 1 0 45.6 38.76A14 14 0 1 1 30.76 15.02Z"/><path fill="#c3a6e8" d="M46 15l1.7 4.1 4.1 1.7-4.1 1.7L46 26.6l-1.7-4.1-4.1-1.7 4.1-1.7z"/></svg>`;
}

export function emptyCardHtml(kind, title, copy, { cta = null, compact = false } = {}) {
  return `<div class="empty-card empty-${kind}${compact ? " compact" : ""}">
    <div class="empty-art">${emptyIllustration(kind)}</div>
    <div class="empty-title">${escapeHtml(title)}</div>
    ${copy ? `<p class="empty-copy">${escapeHtml(copy)}</p>` : ""}
    ${cta ? `<a class="btn btn-secondary empty-cta" href="${escapeHtml(cta.href)}"${cta.panel ? ` data-panel-link="${escapeHtml(cta.panel)}"` : ""}>${escapeHtml(cta.label)}</a>` : ""}
  </div>`;
}

// Run a change that may add or remove content above what the reader is looking at, then scroll by
// the difference so what they are looking at stays exactly where it was. The browser does this
// itself in Chrome, but Safari (including the iOS home-screen app) does not, which is why new
// posts used to wait behind a "scroll up" button. Near the top there is nothing to hold in place.
export function keepPlace(change) {
  if (window.scrollY <= 40) return change();
  const seen = [];
  for (const el of document.querySelectorAll("[data-update-id]")) {
    if (!el.offsetParent) continue; // not on screen (hidden section)
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0) continue;
    if (r.top >= window.innerHeight) break;
    seen.push({ id: el.dataset.updateId, top: r.top });
    if (seen.length >= 6) break;
  }
  change();
  for (const { id, top } of seen) {
    const el = [...document.querySelectorAll("[data-update-id]")].find((n) => n.dataset.updateId === id && n.offsetParent);
    if (!el) continue;
    const delta = el.getBoundingClientRect().top - top;
    if (delta) window.scrollBy(0, delta);
    return;
  }
}
