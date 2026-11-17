const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
const maxAngle = 3.6;

function animateCypress(area: HTMLElement, artwork: HTMLElement) {
  let inView = typeof IntersectionObserver === 'undefined';
  let previousMove: PointerEvent | undefined;
  let frame = 0;
  let lastFrame = 0;
  let gust = 0;
  let angle = 0;
  let speed = 0;

  function reset() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousMove = undefined;
    gust = 0;
    angle = 0;
    speed = 0;
    artwork.style.removeProperty('--sway-angle');
    artwork.style.removeProperty('--sway-shift');
  }

  function syncVisibility() {
    if (inView && !document.hidden) {
      area.dataset.cypressVisible = 'true';
    } else {
      delete area.dataset.cypressVisible;
      reset();
    }
  }

  function step(now: number) {
    // Cap elapsed time after dropped frames to keep the spring stable.
    const seconds = Math.max(0, Math.min((now - lastFrame) / 1000, .025));
    lastFrame = now;
    speed += (gust - angle) * 110 * seconds;
    speed *= Math.exp(-16 * seconds);
    angle = Math.max(-maxAngle, Math.min(maxAngle, angle + speed * seconds));
    gust *= Math.exp(-6 * seconds);

    if (Math.abs(gust) < .015 && Math.abs(angle) < .015 && Math.abs(speed) < .06) {
      reset();
      return;
    }

    artwork.style.setProperty('--sway-angle', angle.toFixed(3) + 'deg');
    artwork.style.setProperty('--sway-shift', (angle * 1.25).toFixed(3) + 'px');
    frame = requestAnimationFrame(step);
  }

  function handleMove(event: PointerEvent) {
    if (!inView || document.hidden || reducedMotion.matches || !finePointer.matches || event.pointerType !== 'mouse') {
      return;
    }
    const previous = previousMove;
    previousMove = event;
    if (!previous) return;

    const elapsed = Math.max(8, event.timeStamp - previous.timeStamp);
    const dx = event.clientX - previous.clientX;
    const dy = event.clientY - previous.clientY;
    // Vertical movement also pushes the tree, more gently than horizontal movement.
    const movement = Math.abs(dx) >= Math.abs(dy) * .45 ? dx : dy * .45;
    gust = Math.max(-maxAngle, Math.min(maxAngle, movement / elapsed * 4.8));
    if (!frame && Math.abs(gust) >= .015) {
      lastFrame = performance.now();
      frame = requestAnimationFrame(step);
    }
  }

  function release(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    previousMove = undefined;
    gust = 0;
  }

  function motionPreferenceChanged() {
    if (reducedMotion.matches || !finePointer.matches) reset();
  }

  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncVisibility();
    });
    observer.observe(area);
  }

  syncVisibility();
  document.addEventListener('visibilitychange', syncVisibility);
  reducedMotion.addEventListener('change', motionPreferenceChanged);
  finePointer.addEventListener('change', motionPreferenceChanged);
  area.addEventListener('pointerenter', handleMove, { passive: true });
  area.addEventListener('pointermove', handleMove, { passive: true });
  area.addEventListener('pointerleave', release, { passive: true });
  area.addEventListener('pointercancel', release, { passive: true });
}

for (const area of document.querySelectorAll<HTMLElement>('[data-cypress]')) {
  const artwork = area.querySelector<HTMLElement>('[data-cypress-sway]');
  if (artwork) animateCypress(area, artwork);
}
