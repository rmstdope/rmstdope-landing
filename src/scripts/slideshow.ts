// Screenshot slideshows slide on their own while on screen. Choosing a
// screenshot (dots, arrows, swipe) stops that slideshow for good; reduced
// motion never starts one.
const interval = 4000;
const swipe = 40;
const autoplay = !matchMedia("(prefers-reduced-motion: reduce)").matches;

for (const show of document.querySelectorAll<HTMLElement>("[data-slides]")) {
  const track = show.querySelector<HTMLElement>(".track")!;
  const shots = [...show.querySelectorAll<HTMLImageElement>(".shot")];
  const dots = [...show.querySelectorAll<HTMLButtonElement>(".dots button")];
  if (shots.length < 2) continue;

  let current = 0;
  let stopped = !autoplay;
  let timer: ReturnType<typeof setInterval> | undefined;

  const select = (index: number) => {
    current = (index + shots.length) % shots.length;
    track.style.setProperty("--slide", String(current));
    shots.forEach((shot, i) => {
      shot.toggleAttribute("data-active", i === current);
      if (i === current) shot.removeAttribute("aria-hidden");
      else shot.setAttribute("aria-hidden", "true");
    });
    dots.forEach((dot, i) =>
      dot.setAttribute("aria-pressed", String(i === current)),
    );
  };

  const run = (visible: boolean) => {
    clearInterval(timer);
    if (visible && !stopped) {
      timer = setInterval(() => select(current + 1), interval);
    }
  };

  const choose = (index: number) => {
    stopped = true;
    run(false);
    select(index);
  };

  dots.forEach((dot, i) => dot.addEventListener("click", () => choose(i)));
  show
    .querySelectorAll<HTMLButtonElement>("[data-step]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        choose(current + Number(button.dataset.step)),
      ),
    );

  let start: number | undefined;
  show.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") start = event.clientX;
  });
  show.addEventListener("pointerup", (event) => {
    if (start === undefined) return;
    const distance = event.clientX - start;
    start = undefined;
    if (Math.abs(distance) >= swipe) {
      show.dataset.swipedAt = String(Date.now());
      choose(current + (distance < 0 ? 1 : -1));
    }
  });
  show.addEventListener("pointercancel", () => (start = undefined));

  // Hidden panels and closed popups have no layout, so they sit idle. Once a
  // slideshow shows, load its other screenshots so slides never arrive empty.
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) shots.forEach((shot) => (shot.loading = "eager"));
    run(entry.isIntersecting);
  }).observe(show);
}

// Screenshots expand to fullscreen from a click or the zoom button.
// Browsers without element fullscreen (iPhone Safari) get a fixed overlay.
for (const show of document.querySelectorAll<HTMLElement>("[data-slides]")) {
  const button = show.querySelector<HTMLButtonElement>(".zoom")!;
  const dialog = show.closest("dialog");

  const sync = () => {
    const on =
      document.fullscreenElement === show || show.hasAttribute("data-expanded");
    button.setAttribute("aria-pressed", String(on));
    button.ariaLabel = on ? "Exit fullscreen" : "Show screenshots fullscreen";
  };

  const overlay = (on: boolean) => {
    show.toggleAttribute("data-expanded", on);
    sync();
  };

  const toggle = () => {
    if (document.fullscreenElement === show) {
      void document.exitFullscreen();
    } else if (show.hasAttribute("data-expanded")) {
      overlay(false);
    } else if (show.requestFullscreen) {
      show.requestFullscreen().catch(() => overlay(true));
    } else {
      overlay(true);
    }
  };

  button.addEventListener("click", toggle);
  show.querySelectorAll(".shot").forEach((shot) =>
    shot.addEventListener("click", () => {
      // A swipe on touch screens can end in a click; it only changes slides.
      if (Date.now() - Number(show.dataset.swipedAt ?? 0) > 400) toggle();
    }),
  );
  document.addEventListener("fullscreenchange", sync);

  // Esc leaves the overlay first; closing the popup always leaves it.
  dialog?.addEventListener("cancel", (event) => {
    if (!show.hasAttribute("data-expanded")) return;
    event.preventDefault();
    overlay(false);
  });
  dialog?.addEventListener("close", () => {
    if (document.fullscreenElement === show) void document.exitFullscreen();
    overlay(false);
  });
}
