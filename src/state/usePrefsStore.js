import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { resolveScheme, validFronts } from '../core/scheme.js';
import { DEFAULT_FRONT, DEFAULT_TOP } from '../theme.js';

/**
 * Everything that should survive a reload: the cube's colour scheme and size,
 * which algorithm was open, and which ones have been learned.
 *
 * Kept apart from useCubeStore deliberately — the cube's live state is
 * per-session and has no business in localStorage, while none of this belongs
 * in the animation hot path.
 */
export const DEFAULT_SPEED = 280; // ms per quarter turn
export const MIN_SPEED = 120;
export const MAX_SPEED = 1200;

export const usePrefsStore = create(
  persist(
    (set, get) => ({
      top: DEFAULT_TOP,
      front: DEFAULT_FRONT,
      size: 3,

      /** @type {string | null} id of the case loaded on the cube */
      selectedCaseId: null,

      /** @type {Record<string, true>} ids the user has ticked off */
      completed: {},

      /**
       * Which algorithm a case should use, by id. Most cases list several and
       * the choice is personal, so it is remembered per case rather than
       * globally. Absent means the first one.
       * @type {Record<string, number>}
       */
      chosenAlg: {},

      search: '',

      /** Which set to list: a case kind, or 'all'. */
      kindFilter: 'all',

      /** @type {'all' | 'learned' | 'unlearned'} */
      completedFilter: 'all',

      /** @type {'dark' | 'light'} */
      theme: 'dark',

      /** Whether the cube settings section is expanded. */
      setupOpen: true,

      /** Playback speed, in ms per quarter turn. */
      speed: DEFAULT_SPEED,

      /** Which page the phone pager is showing. */
      page: 0,

      setTop(top) {
        // Changing the top can orphan the front — a colour cannot face front if
        // it is now on top or on the bottom. Pick the nearest valid one instead
        // of letting the pair go inconsistent.
        const fronts = validFronts(top);
        const front = fronts.includes(get().front) ? get().front : fronts[0];
        set({ top, front });
      },

      setFront(front) {
        if (validFronts(get().top).includes(front)) set({ front });
      },

      setSize(size) {
        // A case belongs to one cube size, so a stored selection stops making
        // sense the moment the size changes.
        const id = get().selectedCaseId ?? '';
        const prefixes = { 2: /^OR-/, 3: /^(OLL|PLL)-/, 4: /^PAR-/ };
        const stillValid = prefixes[size]?.test(id) ?? false;
        set({ size, selectedCaseId: stillValid ? id : null });
      },

      selectCase(id) {
        set({ selectedCaseId: id });
      },

      chooseAlg(id, index) {
        set({ chosenAlg: { ...get().chosenAlg, [id]: index } });
      },

      toggleCompleted(id) {
        const completed = { ...get().completed };
        if (completed[id]) delete completed[id];
        else completed[id] = true;
        set({ completed });
      },

      clearCompleted() {
        set({ completed: {} });
      },

      setSearch(search) {
        set({ search });
      },

      setKindFilter(kindFilter) {
        set({ kindFilter });
      },

      setCompletedFilter(completedFilter) {
        set({ completedFilter });
      },

      setTheme(theme) {
        set({ theme });
      },

      setSetupOpen(setupOpen) {
        set({ setupOpen });
      },

      setSpeed(speed) {
        set({ speed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed)) });
      },

      setPage(page) {
        set({ page });
      },
    }),
    {
      name: 'kappakube.prefs',
      version: 2,
      migrate: (persisted, version) => {
        if (version >= 2 || !persisted) return persisted;
        // v1 had a single "hide completed" checkbox where v2 has a three-way filter.
        const { hideCompleted, ...rest } = persisted;
        return {
          ...rest,
          kindFilter: 'all',
          completedFilter: hideCompleted ? 'unlearned' : 'all',
        };
      },
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted ?? {}) };
        // A stored scheme could be invalid if the palette ever changes.
        const { top, front } = resolveScheme(merged.top, merged.front);
        return { ...merged, top, front };
      },
    },
  ),
);

/** The face-to-colour map implied by the current preferences. */
export function currentScheme(state) {
  return resolveScheme(state.top, state.front).scheme;
}
