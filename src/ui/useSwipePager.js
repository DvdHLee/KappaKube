import { useCallback, useEffect, useState } from 'react';

/**
 * Tracks which page a horizontally scroll-snapped container is showing, and
 * lets you jump to one.
 *
 * The swipe itself is pure CSS scroll-snap — native momentum and rubber-banding
 * for free, and nothing to go wrong when a gesture starts on the 3D canvas.
 * This hook only reports the position so the pager control can follow along.
 *
 * On desktop the container does not scroll horizontally, so the index stays 0
 * and the pager is hidden by CSS. No media-query branching needed here.
 */
export function useSwipePager(ref) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;
    const onScroll = () => {
      // Scroll fires far more often than the page can change; coalesce to a frame.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = element.clientWidth || 1;
        setIndex(Math.round(element.scrollLeft / width));
      });
    };

    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      element.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ref]);

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
