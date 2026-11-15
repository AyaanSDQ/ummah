// Run: node supabase/functions/notify-post/message.test.mjs
import assert from "node:assert/strict";
import { buildNotification, placeText } from "./message.ts";

const TZ = "America/Los_Angeles";
// 1:10 PM in Los Angeles on 2026-11-20 (PST, UTC-8) = 21:10 UTC
const T = "2026-11-20T21:10:00Z";
const n = (o) => buildNotification({ type: "prayer", title: "Dhuhr prayer", ...o }, TZ);

assert.deepEqual(n({ location: "2105", event_time: T }), { heading: "Dhuhr prayer", message: "Room 2105 at 1:10 PM" });
assert.deepEqual(n({ location: "2105" }), { heading: "Dhuhr prayer", message: "Room 2105" });
assert.deepEqual(n({ event_time: T }), { heading: "Dhuhr prayer", message: "at 1:10 PM" });
assert.deepEqual(n({}), { heading: "Dhuhr prayer", message: "New prayer posted" });
assert.equal(n({ location: "Gym", event_time: T }).message, "Gym at 1:10 PM");
assert.equal(n({ location: "  ", event_time: T }).message, "at 1:10 PM");
// summer time: 1:10 PM PDT (UTC-7) = 20:10 UTC
assert.equal(n({ event_time: "2026-07-01T20:10:00Z" }).message, "at 1:10 PM");
assert.equal(n({ event_time: "2026-11-20T08:05:00Z" }).message, "at 12:05 AM");
// repeating posts use their own time of day
assert.equal(n({ location: "214", recurrence: { time: "13:10" }, event_time: "2026-10-01T00:00:00Z" }).message, "Room 214 at 1:10 PM");
assert.equal(n({ recurrence: { time: "00:30" } }).message, "at 12:30 AM");
// cancellations
assert.deepEqual(n({ event: "cancelled", location: "2105", event_time: T, cancel_reason: "Speaker is ill" }), { heading: "Cancelled: Dhuhr prayer", message: "Room 2105 at 1:10 PM · Speaker is ill" });
assert.equal(n({ event: "cancelled" }).message, "This prayer has been cancelled.");
// announcements lead with their text
assert.equal(buildNotification({ type: "announcement", title: "Dues", body: "Dues are due   Friday.\nPlease pay.", location: "214" }, TZ).message, "Dues are due Friday. Please pay.");
assert.equal(buildNotification({ type: "announcement", title: "Dues" }, TZ).message, "New announcement posted");
assert.ok(buildNotification({ type: "announcement", title: "x", body: "a".repeat(300) }, TZ).message.length <= 110);
assert.equal(placeText("Main hall"), "Main hall");
assert.equal(placeText(null), "");
console.log("all message tests passed");
