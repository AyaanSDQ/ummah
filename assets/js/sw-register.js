if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      // Register only when there is no worker yet. In the installed app OneSignal registers this same file
      // under its own address (sw.js?appId=...); registering the plain address on every load would make the
      // browser swap the two versions back and forth.
      const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("sw.js"));
      // An installed app can stay open for days. Check for a new version whenever it is brought back to the front.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });
    } catch (err) {
      console.error("Service worker registration failed", err);
    }
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
