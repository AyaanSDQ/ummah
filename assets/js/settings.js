// Settings page: background colour (remembered on this device).
const BACKGROUNDS = [
  { id: "lavender", label: "Lavender", color: "#6b3fa8" },
  { id: "sky", label: "Sky", color: "#3b82c4" },
  { id: "mint", label: "Mint", color: "#2f9d6f" },
  { id: "rose", label: "Rose", color: "#d6487e" },
  { id: "sand", label: "Sand", color: "#c79a3b" },
  { id: "white", label: "Clean", color: "#4a4a58" },
];
const THEME_META = { lavender: "#5b2e91", sky: "#2f6fa8", mint: "#2f8a64", rose: "#b03a6b", sand: "#9a7a3a", white: "#5b2e91" };

const box = document.getElementById("bg-swatches");
const get = () => { try { return localStorage.getItem("ummah-bg") || "lavender"; } catch { return "lavender"; } };

function apply(id) {
  if (id === "lavender") delete document.documentElement.dataset.bg;
  else document.documentElement.dataset.bg = id;
  try { localStorage.setItem("ummah-bg", id); } catch {}
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_META[id] || "#5b2e91");
  box?.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.id === id)));
}

if (box) {
  box.innerHTML = BACKGROUNDS.map((b) => `<button type="button" role="radio" class="swatch" data-id="${b.id}" aria-label="${b.label}" aria-checked="false"><i style="--sw:${b.color};background:${b.color}"></i><span>${b.label}</span></button>`).join("");
  box.addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (b) apply(b.dataset.id); });
  apply(get());
}
