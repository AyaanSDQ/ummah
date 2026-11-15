// Called by a database trigger on public.updates (see migration
// 20260914190000_notify_on_post_change.sql) whenever a post is created, or
// cancelled. Sends one OneSignal push to all subscribed readers, deep-linked
// to the post via a #post-<id> anchor that reader.js already scrolls to.
//
// Never called directly by the browser: the trigger authenticates with the
// project's service_role key (stored in Supabase Vault, not in this repo),
// which satisfies this function's default JWT verification.

import { buildNotification, type PostFacts } from "./message.ts";

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://ummahnchs.web.app/";
// Times in the notification are written in the school's time zone (the server itself runs in UTC).
const SITE_TIMEZONE = Deno.env.get("SITE_TIMEZONE") ?? "America/Los_Angeles";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: Partial<PostFacts> & { id?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { event, id, type, title } = payload;

  // Readers never see exec-meeting posts at all (RLS-enforced) — never
  // notify the general audience about them. No other push channel exists
  // for execs in this MVP, so exec_meeting simply sends nothing.
  if (!id || !type || !title || type === "exec_meeting") {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.error("Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY secret");
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const { heading, message } = buildNotification(
    { event, type, title, body: payload.body, location: payload.location, event_time: payload.event_time,
      recurrence: payload.recurrence, cancel_reason: payload.cancel_reason },
    SITE_TIMEZONE,
  );

  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      target_channel: "push",
      included_segments: ["Total Subscriptions"], // this app has no "Subscribed Users" segment; OneSignal only delivers to opted-in subscriptions anyway
      headings: { en: heading },
      contents: { en: message },
      url: `${SITE_URL}#post-${id}`,
      // Highest urgency: Android holds normal-priority web pushes while the phone is idle, and these are time-sensitive.
      priority: 10,
      ttl: 60 * 60 * 6, // a prayer or cancellation notice is useless a few hours later
    }),
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("OneSignal request failed", res.status, result);
  }

  return new Response(JSON.stringify({ ok: res.ok, result }), {
    status: res.ok ? 200 : 502,
    headers: { "Content-Type": "application/json" },
  });
});
