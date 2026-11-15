// The "Room" control on the New post and Edit forms: tap one of the usual rooms, or type any
// other room in the box next to them. The form still reads one plain value from the hidden
// input named "location", so the rest of the admin code does not change.

// The usual rooms. To change them, edit this list (nothing else needs to change).
export const ROOM_DEFAULTS = ["2105"];

const apply = new WeakMap(); // hidden input -> function that shows a given value

export function setupRooms(root = document) {
  root.querySelectorAll("[data-room]").forEach((row) => {
    const hidden = row.closest(".field").querySelector('input[name="location"]');
    const box = row.querySelector(".room-defaults");
    const other = row.querySelector(".room-other");

    box.innerHTML = ROOM_DEFAULTS.map(
      (room) => `<button type="button" class="room-chip" data-room-value="${room.replace(/"/g, "&quot;")}" aria-pressed="false">${room.replace(/</g, "&lt;")}</button>`
    ).join("");
    const chips = [...box.querySelectorAll(".room-chip")];

    function show(value) {
      const v = (value || "").trim();
      hidden.value = v;
      const chip = chips.find((c) => c.dataset.roomValue === v);
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      other.value = chip ? "" : v;
    }
    apply.set(hidden, show);

    chips.forEach((chip) =>
      chip.addEventListener("click", () => show(chip.getAttribute("aria-pressed") === "true" ? "" : chip.dataset.roomValue))
    );
    other.addEventListener("input", () => {
      hidden.value = other.value.trim();
      chips.forEach((c) => c.setAttribute("aria-pressed", "false"));
    });
    // form.reset() clears the hidden input; bring the buttons and box back in line
    hidden.form?.addEventListener("reset", () => setTimeout(() => show(""), 0));
    show(hidden.value);
  });
}

// Fill a form's room (used when an existing post is opened for editing).
export function setRoom(form, value) {
  const hidden = form.elements.location;
  (apply.get(hidden) || ((v) => { hidden.value = v || ""; }))(value);
}
