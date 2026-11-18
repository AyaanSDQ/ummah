import { icon } from "./icons.js?v=15";

// The banner cannot be dismissed: everyone on the public page who is not using the installed
// app sees it every time. (Admins never reach this page; they are sent to exec.html.)

const banner = document.getElementById("install-banner");
if (banner) initInstallBanner(banner);

function initInstallBanner(banner) {
  if (isStandalone()) return; // already installed/running as the PWA — never show
  try { localStorage.removeItem("msa-install-dismissed"); } catch {} // old "dismissed" flag from the removed X button

  let deferredPrompt = null;

  // Android/Chrome: capture the native prompt instead of letting the browser
  // show its own mini-infobar, so we can trigger it from our own button.
  // This event is the whole basis for detecting "Chrome add-to-home-screen is possible
  // here" — never assume it fires (many browsers/contexts never send it).
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    renderAndroid();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hide();
  });

  if (isInAppBrowser()) {
    renderInAppBrowser();
  } else if (isIOSSafari()) {
    renderIOS();
  } else if (!deferredPrompt) {
    // Any other browser: general steps now. If Chrome/Edge later offers its own install
    // prompt (beforeinstallprompt), the banner switches to a one-tap Add button.
    renderGeneric();
  }

  function renderAndroid() {
    show(`
      ${icon("i-addhome", { size: 20, stroke: 2.5 })}
      <div class="install-copy">
        <div class="install-title">Add to Home Screen</div>
        <div class="install-sub">One tap to open, plus alerts for last-minute changes.</div>
      </div>
      <button type="button" class="btn btn-primary" id="install-action">Add</button>
    `);
    document.getElementById("install-action").addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      hide();
    });
  }

  function renderIOS() {
    show(`
      ${icon("i-addhome", { size: 20, stroke: 2.5 })}
      <div class="install-copy">
        <div class="install-title">Add to Home Screen</div>
        <div class="install-sub">
          <ol class="install-steps">
            <li>Tap ${icon("i-share", { size: 14, stroke: 2.75 })} <b>Share</b> in Safari's toolbar</li>
            <li>Scroll down and tap <b>Add to Home Screen</b></li>
          </ol>
        </div>
      </div>
    `);
  }

  function renderGeneric() {
    show(`
      ${icon("i-addhome", { size: 20, stroke: 2.5 })}
      <div class="install-copy">
        <div class="install-title">Add to Home Screen</div>
        <div class="install-sub">Choose it from your browser's menu for quick access and alerts.</div>
      </div>
    `);
  }

  function renderInAppBrowser() {
    show(`
      ${icon("i-share", { size: 20, stroke: 2.5 })}
      <div class="install-copy">
        <div class="install-title">Open in your browser</div>
        <div class="install-sub">This link is open inside another app. To add it to your home screen and get notifications, open it in Chrome or Safari instead.</div>
      </div>
    `);
  }

  function show(html) {
    banner.innerHTML = html;
    banner.hidden = false;
  }

  function hide() {
    banner.hidden = true;
    banner.innerHTML = "";
  }
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

// navigator.standalone only ever exists on iOS Safari's WebKit — a feature
// check, not user-agent string parsing, and the only reliable signal we
// have for "this is iOS Safari" (matchMedia/standalone above only tell us
// whether we're ALREADY installed, not which platform we're on).
function isIOSSafari() {
  return typeof window.navigator.standalone !== "undefined";
}

// No feature-detection API exists for "running inside an in-app webview";
// this is the one place a light, narrowly-scoped user-agent check is
// actually necessary, not a general platform-detection substitute for the
// two checks above.
function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  return /Instagram|FBAN|FBAV|TikTok|BytedanceWebview|Line\//i.test(ua);
}
