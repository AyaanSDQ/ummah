// Builds the wording of a push notification. Kept separate from the HTTP handling so it can be
// tested on its own (see message.test.mjs next to this file). Only plain TypeScript, no Deno APIs.

export type PostFacts = {
  event?: string;
  type: string;
  title: string;
  body?: string | null;
  location?: string | null;
  event_time?: string | null;
  recurrence?: { time?: string } | null;
  cancel_reason?: string | null;
};

const TYPE_LABEL: Record<string, string> = { prayer: "prayer", social: "social event", announcement: "announcement" };

// "2105" or "214 " -> "Room 2105"; anything else ("Gym", "Main hall") is used as it is.
export function placeText(location?: string | null): string {
  const loc = (location ?? "").trim();
  if (!loc) return "";
  return /^\d{2,4}\b/.test(loc) ? `Room ${loc}` : loc;
}

// "1:10 PM" in the school's time zone. A repeating post keeps its own time of day ("13:10").
export function timeText(post: Pick<PostFacts, "event_time" | "recurrence">, timeZone: string): string {
  const repeating = post.recurrence?.time;
  if (repeating && /^\d{1,2}:\d{2}$/.test(repeating)) {
    const [h, m] = repeating.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  }
  if (!post.event_time) return "";
  const d = new Date(post.event_time);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", hour12: true })
    .format(d)
    .replace(/\s/g, " "); // newer runtimes put a narrow no-break space before AM/PM
}

// The three cases: "Room 2105 at 1:10 PM", "Room 2105", "at 1:10 PM" (or "" when there is neither).
export function detailsText(place: string, time: string): string {
  if (place && time) return `${place} at ${time}`;
  if (place) return place;
  if (time) return `at ${time}`;
  return "";
}

function snippet(text?: string | null, max = 110): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export function buildNotification(post: PostFacts, timeZone: string): { heading: string; message: string } {
  const label = TYPE_LABEL[post.type] ?? "update";
  const details = detailsText(placeText(post.location), timeText(post, timeZone));

  if (post.event === "cancelled") {
    const why = (post.cancel_reason ?? "").trim();
    const message = [details, why].filter(Boolean).join(" · ") || `This ${label} has been cancelled.`;
    return { heading: `Cancelled: ${post.title}`, message };
  }

  // An announcement is mostly its text; an event is mostly where and when.
  const message =
    post.type === "announcement"
      ? snippet(post.body) || details
      : details || snippet(post.body);
  return { heading: post.title, message: message || `New ${label} posted` };
}
