import { icon } from "./icons.js?v=13";

// Public OneSignal App ID — a public identifier meant to ship in client
// code (same trust model as the Supabase anon key), not a secret.
const ONESIGNAL_APP_ID = "73a18eab-2f8d-4909-8005-72bb95c080e5";

const banner = document.getElementById("notify-banner");
const toggle = document.getElementById("notify-toggle"); // footer link: Turn off / Turn on notifications

// Push only works on iOS when launched from the home screen icon
// specifically (not a normal Safari tab, even post-install), and there's
// no reason to ask desktop/regular-tab visitors either — this is exactly
// what "already running standalone" tells us, so gate on it before ever
// loading the SDK or showing anything.
if (banner && isStandaloneLaunch() && supportsPush()) {
  initNotifyBanner(banner);
}

function isStandaloneLaunch() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function supportsPush() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function initNotifyBanner(banner) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      // Reuse our own app-shell service worker instead of OneSignal's default
      // OneSignalSDKWorker.js: sw.js imports OneSignal's worker script, so the
      // two share one registration. The site lives in a folder (/ummah/ on
      // GitHub Pages), so the worker is not at the domain root and the scope
      // cannot be "/" (a worker can only control its own folder and below).
      // OneSignal wants the path from the site root WITHOUT a leading slash.
      // Both values come from the page's own address, so they follow the
      // folder if the repository is ever renamed, and they match the
      // registration sw-register.js already makes.
      serviceWorkerPath: new URL("sw.js", location.href).pathname.slice(1),
      serviceWorkerParam: { scope: new URL("./", location.href).pathname },
    });

    const subscribed = () => Notification.permission === "granted" && OneSignal.User.PushSubscription.optedIn === true;

    // Show whatever fits the current state: the first-time prompt, the "blocked" note, or just the footer link.
    function render() {
      if (Notification.permission === "denied") {
        renderBlocked(banner);
        setToggle(null);
      } else if (subscribed()) {
        hide(banner);
        setToggle("off");
      } else {
        renderPrompt(banner, enable); // no dismiss button: it stays until the person subscribes
        setToggle("on");
      }
    }

    // Subscribe (asking the browser for permission only if it has not been asked yet).
    async function enable() {
      if (Notification.permission === "default") await OneSignal.Notifications.requestPermission();
      if (Notification.permission === "granted") await OneSignal.User.PushSubscription.optIn();
      render();
      return subscribed();
    }

    // Unsubscribe: the browser permission stays granted, so turning it back on later is one tap with no prompt.
    async function disable() {
      await OneSignal.User.PushSubscription.optOut();
      render();
    }

    toggle?.addEventListener("click", async () => {
      toggle.disabled = true;
      try {
        if (toggle.dataset.state === "off") await disable();
        else await enable();
      } finally {
        toggle.disabled = false;
      }
    });

    OneSignal.User.PushSubscription.addEventListener("change", render);
    render();
  });
}

function setToggle(state) {
  if (!toggle) return;
  toggle.hidden = state === null;
  toggle.dataset.state = state ?? "";
  toggle.textContent = state === "off" ? "Turn off notifications" : "Turn on notifications";
}

function renderPrompt(banner, enable) {
  show(banner, `
    ${icon("i-bell", { size: 20, stroke: 2.5 })}
    <div class="install-copy">
      <div class="install-title">Enable notifications</div>
      <div class="install-sub">Get notified the moment a new update or cancellation is posted.</div>
    </div>
    <button type="button" class="btn btn-primary" id="notify-action">Enable</button>
  `);

  document.getElementById("notify-action").addEventListener("click", async () => {
    const btn = document.getElementById("notify-action");
    btn.disabled = true;
    btn.textContent = "Requesting…";
    const ok = await enable(); // on success the prompt is replaced; otherwise put the button back
    if (!ok && document.getElementById("notify-action")) {
      btn.disabled = false;
      btn.textContent = "Enable";
    }
  });
}

function renderBlocked(banner) {
  show(banner, `
    ${icon("i-bell", { size: 20, stroke: 2.5 })}
    <div class="install-copy">
      <div class="install-title">Notifications are blocked</div>
      <div class="install-sub">Your browser has notifications turned off for this site. Enable them in your browser/site settings to get update alerts.</div>
    </div>
  `);
}

function show(banner, html) {
  banner.innerHTML = html;
  banner.hidden = false;
}

function hide(banner) {
  banner.hidden = true;
  banner.innerHTML = "";
}
