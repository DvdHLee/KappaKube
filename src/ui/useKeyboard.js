import { useEffect } from 'react';
import { parseAlg } from '../core/notation.js';
import { useCubeStore } from '../state/useCubeStore.js';

/**
 * Speedcuber-style bindings: the home row turns the cube, the way a physical
 * cube sits under your hands. Right hand turns R and U, left hand L and D.
 */
const KEY_MOVES = {
  i: 'R',
  k: "R'",
  j: 'U',
  f: "U'",
  d: 'L',
  e: "L'",
  s: 'D',
  l: "D'",
  h: 'F',
  g: "F'",
  w: 'B',
  o: "B'",
  ';': 'y',
  a: "y'",
  p: 'x',
  q: "x'",
  m: "M'",
  n: 'M',
};

export function useKeyboard() {
  useEffect(() => {
    const onKeyDown = (event) => {
      // Never steal keys from the algorithm input.
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const store = useCubeStore.getState();

      if (event.key === ' ') {
        event.preventDefault();
        store.toggle();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        store.stepForward();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        store.stepBack();
        return;
      }

      const notation = KEY_MOVES[event.key.toLowerCase()];
      if (!notation) return;

      event.preventDefault();
      // Shift flips the direction, so one key covers both turns.
      const flipped = event.shiftKey
        ? notation.endsWith("'")
          ? notation.slice(0, -1)
          : `${notation}'`
        : notation;

      const [move] = parseAlg(flipped, store.n);
      if (move) store.turn(move);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

export const KEYBOARD_HELP = Object.entries(KEY_MOVES)
  .map(([key, move]) => `${key} ${move}`)
  .join('   ');
