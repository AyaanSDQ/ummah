// Switching between the app's main sections (Updates / Calendar, or Admins / View /
// Calendar for an administrator) without loading another page.
//
// Every section lives in the same document as a <section data-panel="name">. The
// bottom bar's links (data-panel-link="name") only show one section and hide the
// others, so nothing is fetched or parsed when you switch, and each section keeps
// its own scroll position and its data keeps updating in the background.
//
// The browser's back button still behaves: the home section is the bottom of the
// stack, any other section is pushed on top of it, so Back goes to home and then
// leaves the app. A section can also be opened straight from the address
// (index.html#calendar), which is what old links and bookmarks use.

const FADE_MS = 220;

export function initPanels({ home, titles = {} }) {
  const els = new Map([...document.querySelectorAll("section[data-panel]")].map((el) => [el.dataset.panel, el]));
  const links = [...document.querySelectorAll("[data-panel-link]")];
  const scrolls = new Map();
  let current = null;
  let fadeTimer = 0;

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  const fromAddress = () => {
    const name = location.hash.slice(1);
    return els.has(name) ? name : home;
  };

  function show(name, { fresh = false } = {}) {
    if (!els.has(name)) name = home;
    if (name === current) return;

    if (current) scrolls.set(current, window.scrollY);
    els.forEach((el, key) => { el.hidden = key !== name; });
    links.forEach((a) => {
      if (a.dataset.panelLink === name) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.body.dataset.panel = name;
    if (titles[name]) document.title = titles[name];

    const panel = els.get(name);
    if (current) {
      panel.classList.add("panel-in");
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => panel.classList.remove("panel-in"), FADE_MS);
    }
    window.scrollTo(0, fresh ? 0 : scrolls.get(name) || 0);

    const previous = current;
    current = name;
    document.dispatchEvent(new CustomEvent("panelshow", { detail: { name, previous } }));
  }

  // Open another section from the bottom bar.
  function go(name) {
    if (name === current) {
      window.scrollTo({ top: 0, behavior: "smooth" }); // tapping the active tab goes back to the top
      return;
    }
    const state = history.state || {};
    const url = name === home ? location.pathname + location.search : `${location.pathname}${location.search}#${name}`;
    if (name === home) {
      // Home was underneath: pop back to it instead of stacking more entries.
      if (state.from === home) history.back();
      else {
        history.replaceState({ ...state, panel: home, from: undefined, layer: undefined }, "", url);
        show(home);
      }
      return;
    }
    if (current === home) history.pushState({ panel: name, from: home }, "", url);
    else history.replaceState({ panel: name, from: state.from }, "", url);
    show(name, { fresh: !scrolls.has(name) });
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest?.("[data-panel-link]");
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(a.dataset.panelLink);
  });

  window.addEventListener("popstate", () => {
    show(history.state?.panel || fromAddress());
  });

  // First paint: whichever section the address asks for.
  const first = fromAddress();
  history.replaceState({ ...(history.state || {}), panel: first }, "", location.href);
  show(first, { fresh: true });

  return { show: go, current: () => current, has: (name) => els.has(name) };
}

// A link marked data-replace takes the place of the current page in the history instead of
// adding to it (used for "Administrative login": the public page is not left underneath the
// admin area, so Back from there can never land on the public page).
document.addEventListener("click", (e) => {
  const a = e.target.closest?.("a[data-replace]");
  if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  location.replace(a.href);
});
