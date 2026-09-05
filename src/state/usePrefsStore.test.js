import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_SPEED, MIN_SPEED, currentScheme, usePrefsStore } from './usePrefsStore.js';

const prefs = () => usePrefsStore.getState();

beforeEach(() => {
  usePrefsStore.setState({
    top: 'yellow',
    front: 'red',
    size: 3,
    selectedCaseId: null,
    completed: {},
    chosenAlg: {},
    search: '',
    kindFilter: 'all',
    completedFilter: 'all',
    setupOpen: true,
    speed: 280,
    page: 0,
    theme: 'dark',
    locked: false,
    freeplay: {},
  });
});

describe('speed', () => {
  it('clamps to the allowed range', () => {
    prefs().setSpeed(5);
    expect(prefs().speed).toBe(MIN_SPEED);
    prefs().setSpeed(99999);
    expect(prefs().speed).toBe(MAX_SPEED);
    prefs().setSpeed(400);
    expect(prefs().speed).toBe(400);
  });
});

describe('colour scheme', () => {
  it('keeps top and front adjacent', () => {
    prefs().setTop('white');
    // Red cannot face front when white is on top only if they are opposite;
    // they are not, so the pair survives.
    expect(currentScheme(prefs()).U).toBe('white');
    expect(currentScheme(prefs()).F).toBe(prefs().front);
  });

  it('repairs a front that the new top makes impossible', () => {
    prefs().setTop('red'); // orange is now the bottom
    prefs().setFront('orange');
    expect(prefs().front).not.toBe('orange');
    expect(currentScheme(prefs())).not.toBeNull();
  });

  it('ignores a front that is not adjacent to the top', () => {
    prefs().setTop('white');
    prefs().setFront('yellow'); // the opposite face
    expect(prefs().front).not.toBe('yellow');
  });
});

describe('per-case algorithm choice', () => {
  it('remembers a choice for each case independently', () => {
    prefs().chooseAlg('OLL-27', 2);
    prefs().chooseAlg('PLL-T', 1);
    expect(prefs().chosenAlg).toEqual({ 'OLL-27': 2, 'PLL-T': 1 });
  });
});

describe('completed', () => {
  it('toggles on and off', () => {
    prefs().toggleCompleted('OLL-27');
    expect(prefs().completed['OLL-27']).toBe(true);
    prefs().toggleCompleted('OLL-27');
    expect(prefs().completed['OLL-27']).toBeUndefined();
  });

  it('clears everything at once', () => {
    prefs().toggleCompleted('OLL-1');
    prefs().toggleCompleted('OLL-2');
    prefs().clearCompleted();
    expect(prefs().completed).toEqual({});
  });
});

describe('size changes', () => {
  it('drops a selected case that belongs to the other cube', () => {
    prefs().selectCase('OLL-27');
    prefs().setSize(2);
    expect(prefs().selectedCaseId).toBeNull();
  });

  it('keeps a selected case that belongs to the new size', () => {
    prefs().selectCase('OR-PBL-AdjAdj');
    prefs().setSize(2);
    expect(prefs().selectedCaseId).toBe('OR-PBL-AdjAdj');
  });
});

describe('pager page', () => {
  it('is remembered', () => {
    prefs().setPage(1);
    expect(prefs().page).toBe(1);
  });
});

describe('remembered free cube', () => {
  it('keeps one per size, so switching does not lose either', () => {
    prefs().rememberFreeplay(3, { v: 1, n: 3, pieces: [] });
    prefs().rememberFreeplay(5, { v: 1, n: 5, pieces: [] });
    expect(Object.keys(prefs().freeplay).sort()).toEqual(['3', '5']);
    expect(prefs().freeplay[3].n).toBe(3);
  });

  it('ignores a state that failed to serialise', () => {
    prefs().rememberFreeplay(3, null);
    expect(prefs().freeplay[3]).toBeUndefined();
  });
});

describe('lock and theme', () => {
  it('are remembered', () => {
    prefs().setLocked(true);
    prefs().setTheme('light');
    expect(prefs().locked).toBe(true);
    expect(prefs().theme).toBe('light');
  });
});
