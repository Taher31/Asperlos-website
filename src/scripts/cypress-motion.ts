const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
const maxAngle = 3.6;

function animateCypress(area: HTMLElement, artwork: SVGSVGElement) {
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
    gust = 0;
    angle = 0;
    speed = 0;
    area.style.removeProperty('--cypress-gust');
  }

  function syncVisibility() {
    if (inView && !document.hidden) {
      area.dataset.cypressVisible = 'true';
    } else {
      delete area.dataset.cypressVisible;
      previousMove = undefined;
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

    // Branches share the gust but respond at different strengths around their own pivots.
    area.style.setProperty('--cypress-gust', angle.toFixed(3) + 'deg');
    frame = requestAnimationFrame(step);
  }

  function isActive() {
    return inView && !document.hidden && !reducedMotion.matches;
  }

  function push(target: number) {
    gust = Math.max(-maxAngle, Math.min(maxAngle, target));
    if (!frame && Math.abs(gust) >= .015) {
      lastFrame = performance.now();
      frame = requestAnimationFrame(step);
    }
  }

  function touchStart(event: PointerEvent) {
    if (!isActive() || event.pointerType !== 'touch' || !event.isPrimary) return;
    previousMove = event;
    const bounds = artwork.getBoundingClientRect();
    const fromLeft = event.clientX < bounds.left + bounds.width / 2;
    push(fromLeft ? -2.5 : 2.5);
  }

  function handleMove(event: PointerEvent) {
    if (!isActive()) return;
    const mouse = event.pointerType === 'mouse' && finePointer.matches;
    const touch = event.pointerType === 'touch' && event.isPrimary
      && previousMove?.pointerId === event.pointerId && previousMove.pointerType === 'touch';
    if (!mouse && !touch) return;

    const previous = previousMove;
    previousMove = event;
    if (!previous || previous.pointerId !== event.pointerId) return;

    const elapsed = Math.max(8, event.timeStamp - previous.timeStamp);
    const dx = event.clientX - previous.clientX;
    const dy = event.clientY - previous.clientY;
    // Keep vertical swipes available for scrolling, while the mouse can sway the tree from any direction.
    if (touch && Math.abs(dx) <= Math.abs(dy)) return;
    const movement = mouse && Math.abs(dx) < Math.abs(dy) * .45 ? dy * .45 : dx;
    push(movement / elapsed * 4.8);
  }

  function release(event: PointerEvent) {
    if (previousMove?.pointerId !== event.pointerId) return;
    previousMove = undefined;
    if (event.pointerType === 'mouse' || event.type === 'pointercancel') gust = 0;
  }

  function motionPreferenceChanged() {
    if (!reducedMotion.matches) return;
    previousMove = undefined;
    reset();
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
  if (area.dataset.cypressWatermark) return;

  reducedMotion.addEventListener('change', motionPreferenceChanged);
  area.addEventListener('pointerdown', touchStart, { passive: true });
  area.addEventListener('pointerenter', handleMove, { passive: true });
  area.addEventListener('pointermove', handleMove, { passive: true });
  area.addEventListener('pointerup', release, { passive: true });
  area.addEventListener('pointerleave', release, { passive: true });
  area.addEventListener('pointercancel', release, { passive: true });
}

for (const area of document.querySelectorAll<HTMLElement>('[data-cypress]')) {
  const artwork = area.querySelector<SVGSVGElement>('[data-cypress-artwork]');
  if (artwork) animateCypress(area, artwork);
}
