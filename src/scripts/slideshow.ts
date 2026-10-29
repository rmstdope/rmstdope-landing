// Screenshot slideshows advance on their own while on screen. Choosing a
// screenshot stops that slideshow for good; reduced motion never starts one.
const interval = 4000;
const autoplay = !matchMedia("(prefers-reduced-motion: reduce)").matches;

for (const show of document.querySelectorAll<HTMLElement>("[data-slides]")) {
  const shots = [...show.querySelectorAll<HTMLElement>(".shot")];
  const dots = [...show.querySelectorAll<HTMLButtonElement>(".dots button")];
  if (shots.length < 2) continue;

  let current = 0;
  let stopped = !autoplay;
  let timer: ReturnType<typeof setInterval> | undefined;

  const select = (index: number) => {
    current = index;
    shots.forEach((shot, i) => {
      shot.toggleAttribute("data-active", i === index);
      if (i === index) shot.removeAttribute("aria-hidden");
      else shot.setAttribute("aria-hidden", "true");
    });
    dots.forEach((dot, i) =>
      dot.setAttribute("aria-pressed", String(i === index)),
    );
  };

  const run = (visible: boolean) => {
    clearInterval(timer);
    if (visible && !stopped) {
      timer = setInterval(() => select((current + 1) % shots.length), interval);
    }
  };

  dots.forEach((dot, i) =>
    dot.addEventListener("click", () => {
      stopped = true;
      run(false);
      select(i);
    }),
  );

  // Hidden panels and closed accordions have no layout, so they sit idle.
  new IntersectionObserver(([entry]) => run(entry.isIntersecting)).observe(
    show,
  );
}
