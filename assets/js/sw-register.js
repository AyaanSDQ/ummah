if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      // An installed app can stay open for days. Check for a new version whenever it is brought back to the front.
      const check = () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); };
      document.addEventListener("visibilitychange", check);
    }).catch((err) => console.error("Service worker registration failed", err));
  });

  // A new version took over while the page was open: load it once, so the old scripts never run against the new ones.
  // (Not on the very first install, when there was no worker before.)
  if (navigator.serviceWorker.controller) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (!typing) location.reload();
    });
  }
}
