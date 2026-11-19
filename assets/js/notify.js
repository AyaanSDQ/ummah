// Public OneSignal App ID — a public identifier meant to ship in client
// code (same trust model as the Supabase anon key), not a secret.
const ONESIGNAL_APP_ID = "73a18eab-2f8d-4909-8005-72bb95c080e5";

const sw = document.getElementById("notify-switch");
const hint = document.getElementById("notify-hint");
const offBtn = document.getElementById("notify-off");

// Push only works on iOS when launched from the home screen icon, so the switch is only
// live there; elsewhere it explains why it is off.
if (sw) {
  if (supportsPush() && (!isIOS() || isStandaloneLaunch())) initNotifySwitch();
  else if (hint) hint.textContent = isIOS() ? "On iPhone, add Ummah to your Home Screen first to turn this on." : "This browser doesn't support notifications.";
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneLaunch() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function supportsPush() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function initNotifySwitch() {
  // If the notification service never answers (blocked, offline, wrong site), say so instead of "Checking...".
  const giveUp = setTimeout(() => { if (hint) hint.textContent = "Notifications aren't available right now."; }, 8000);
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      // Reuse our own app-shell service worker (sw.js imports OneSignal's worker). Both values
      // come from the page's own address so they follow the folder the site lives in.
      serviceWorkerPath: new URL("sw.js", location.href).pathname.slice(1),
      serviceWorkerParam: { scope: new URL("./", location.href).pathname },
      });
    } catch (err) {
      console.error(err);
      clearTimeout(giveUp);
      if (hint) hint.textContent = "Notifications aren't available right now.";
      return;
    }
    clearTimeout(giveUp);

    const subscribed = () => Notification.permission === "granted" && OneSignal.User.PushSubscription.optedIn === true;

    function render() {
      if (Notification.permission === "denied") {
        sw.checked = false;
        sw.disabled = true;
        hint.textContent = "Blocked in your browser settings for this site.";
      } else {
        sw.disabled = false;
        sw.checked = subscribed();
        hint.textContent = sw.checked ? "On. You'll be told when something is posted." : "Off. Turn on to hear about new updates and cancellations.";
      }
      if (offBtn) offBtn.disabled = !subscribed();
    }

    if (offBtn) offBtn.addEventListener("click", async () => {
      offBtn.disabled = true;
      try { await OneSignal.User.PushSubscription.optOut(); } catch (err) { console.error(err); }
      render();
    });

    sw.addEventListener("change", async () => {
      sw.disabled = true;
      try {
        if (sw.checked) {
          if (Notification.permission === "default") await OneSignal.Notifications.requestPermission();
          if (Notification.permission === "granted") await OneSignal.User.PushSubscription.optIn();
        } else {
          await OneSignal.User.PushSubscription.optOut();
        }
      } catch (err) {
        console.error(err);
      }
      render();
    });

    OneSignal.User.PushSubscription.addEventListener("change", render);
    render();
  });
}
