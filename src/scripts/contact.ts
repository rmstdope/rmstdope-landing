// The address ships reversed and is turned into a mailto link only in the
// browser, which keeps it out of reach of simple HTML scrapers.
document.querySelectorAll<HTMLElement>("[data-mail]").forEach((slot) => {
  const address = [...slot.dataset.mail!].reverse().join("");
  const link = document.createElement("a");
  link.className = "cmd ghost";
  link.href = `mailto:${address}`;
  link.textContent = `> ${address.toUpperCase()}`;
  slot.replaceWith(link);
});
