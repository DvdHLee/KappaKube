import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Tracks which page a horizontally scroll-snapped container is showing, and
 * lets you jump to one.
 *
 * The swipe itself is pure CSS scroll-snap — native momentum and rubber-banding
 * for free, and nothing to go wrong when a gesture starts on the 3D canvas.
 * This hook only reports the position so the pager control can follow along.
 *
 * On desktop the container does not scroll horizontally, so nothing is reported
 * and the pager is hidden by CSS. The scroll handling is guarded on the
 * container actually being pageable, so a desktop session cannot overwrite the
 * page a phone session remembered.
 *
 * @param {object} options
 * @param {number} options.initial page to restore on first layout
 * @param {(page: number) => void} options.onChange called when the page changes
 */
export function useSwipePager(ref, { initial = 0, onChange } = {}) {
  const [index, setIndex] = useState(initial);
  const restored = useRef(false);

  const isPageable = (element) => element.scrollWidth > element.clientWidth + 1;

  // Restore before paint, so a remembered page does not flash page one first.
  // Only the scroll position is set: the listener below derives the index from
  // it, which keeps this effect free of state updates.
  useLayoutEffect(() => {
    const element = ref.current;
    if (restored.current || !element) return;
    restored.current = true;
    if (initial > 0 && isPageable(element)) {
      element.scrollLeft = initial * element.clientWidth;
    }
  }, [ref, initial]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;
    const onScroll = () => {
      // Scroll fires far more often than the page can change; coalesce to a frame.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!isPageable(element)) return;
        const page = Math.round(element.scrollLeft / (element.clientWidth || 1));
        setIndex((was) => {
          if (was !== page) onChange?.(page);
          return page;
        });
      });
    };

    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      element.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  });

  const goTo = useCallback(
    (page) => {
      const element = ref.current;
      if (!element) return;
      element.scrollTo({ left: page * element.clientWidth, behavior: 'smooth' });
    },
    [ref],
  );

  return [index, goTo];
}
