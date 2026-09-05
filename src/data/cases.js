/**
 * The algorithm library, assembled from the authored data.
 *
 * Everything except the identity and the algorithms themselves is *derived*
 * from the cube model:
 *   - `setup` is the inverse of the primary algorithm, so running the algorithm
 *     from the setup state always ends solved
 *   - `view` is read off the resulting state, so a recognition diagram can never
 *     disagree with the case it labels
 *
 * src/data/cases.test.js proves each set is complete and duplicate-free.
 */

import { createSolvedCube } from '../core/cube.js';
import { applyAlg, invertAlg } from '../core/moves.js';
import { formatAlg, parseAlg } from '../core/notation.js';
import { orientationPattern, topView as topView3 } from '../core/lastLayer.js';
import { topView as topView2 } from '../core/twoByTwo.js';
import { OLL_CASES, OLL_GROUPS } from './oll.js';
import { PLL_CASES, PLL_GROUPS } from './pll.js';
import { ORTEGA_OLL, ORTEGA_OLL_GROUP, ORTEGA_PBL, ORTEGA_PBL_GROUP } from './ortega.js';

/** The cube state an algorithm is meant to be applied to. */
export function stateForAlg(algText, n = 3) {
  return applyAlg(createSolvedCube(n), invertAlg(parseAlg(algText, n)));
}

function build({ id, n, kind, label, name, group, algs }) {
  const state = stateForAlg(algs[0], n);
  return {
    id,
    n, // cube size this case belongs to
    kind, // 'OLL' | 'PLL' | 'Ortega OLL' | 'PBL'
    label, // "OLL 27", "T perm" — kept for tooltips, not shown as a heading
    name, // "Sune", "T perm"
    group, // "Cross", "J perms"
    algs: algs.map((alg) => formatAlg(parseAlg(alg, n), n)),
    setup: formatAlg(invertAlg(parseAlg(algs[0], n)), n),
    view: n === 2 ? topView2(state) : topView3(state),
    ...(n === 3 ? { pattern: orientationPattern(state) } : {}),
  };
}

export const CASES = [
  ...OLL_CASES.map((c) =>
    build({
      id: `OLL-${c.number}`,
      n: 3,
      kind: 'OLL',
      label: `OLL ${c.number}`,
      name: c.name,
      group: c.group,
      algs: c.algs,
    }),
  ),
  ...PLL_CASES.map((c) =>
    build({
      id: `PLL-${c.id}`,
      n: 3,
      kind: 'PLL',
      label: `${c.id} perm`,
      name: c.name,
      group: c.group,
      algs: c.algs,
    }),
  ),
  ...ORTEGA_OLL.map((c) =>
    build({
      id: `OR-OLL-${c.id}`,
      n: 2,
      kind: 'Ortega OLL',
      label: `Ortega OLL ${c.id}`,
      name: c.name,
      group: ORTEGA_OLL_GROUP,
      algs: c.algs,
    }),
  ),
  ...ORTEGA_PBL.map((c) =>
    build({
      id: `OR-PBL-${c.id}`,
      n: 2,
      kind: 'PBL',
      label: `PBL ${c.id}`,
      name: c.name,
      group: ORTEGA_PBL_GROUP,
      algs: c.algs,
    }),
  ),
];

export const CASES_BY_ID = new Map(CASES.map((c) => [c.id, c]));

const forSize = (n, kind, group) =>
  CASES.filter((c) => c.n === n && c.kind === kind && (group === undefined || c.group === group));

const SECTIONS_BY_SIZE = {
  3: [
    {
      kind: 'OLL',
      title: 'OLL',
      subtitle: 'Orient the last layer',
      groups: OLL_GROUPS.map((group) => ({ group, cases: forSize(3, 'OLL', group) })),
    },
    {
      kind: 'PLL',
      title: 'PLL',
      subtitle: 'Permute the last layer',
      groups: PLL_GROUPS.map((letter) => ({
        group: `${letter} perm${'AUJRGN'.includes(letter) ? 's' : ''}`,
        cases: forSize(3, 'PLL', letter),
      })),
    },
  ],
  2: [
    {
      kind: 'Ortega OLL',
      title: 'Ortega OLL',
      subtitle: 'Orient the last layer',
      groups: [{ group: ORTEGA_OLL_GROUP, cases: forSize(2, 'Ortega OLL') }],
    },
    {
      kind: 'PBL',
      title: 'Ortega PBL',
      subtitle: 'Permute both layers',
      groups: [{ group: ORTEGA_PBL_GROUP, cases: forSize(2, 'PBL') }],
    },
  ],
};

/** The menu for a given cube size; empty for sizes with no library yet. */
export function sectionsFor(n) {
  return SECTIONS_BY_SIZE[n] ?? [];
}

// --- filtering ---------------------------------------------------------------

/** Free-text match across everything on a row, plus the algorithm itself. */
export function matchesSearch(testCase, query) {
  if (!query.trim()) return true;
  const haystack = [
    testCase.label,
    testCase.name,
    testCase.group,
    testCase.kind,
    testCase.id.replace(/-/g, ' '),
    ...testCase.algs,
  ]
    .join(' ')
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

/**
 * Apply the menu's filters to a size's sections, dropping groups and sections
 * that end up empty.
 *
 * Pure, and separate from the component, so the interaction between the three
 * filters can be tested directly.
 *
 * @param {object[]} sections from sectionsFor(n)
 * @param {object} options
 * @param {string} options.search free text, '' for everything
 * @param {string} options.kind a case kind, or 'all'
 * @param {'all'|'learned'|'unlearned'} options.completedFilter
 * @param {Record<string, true>} options.completed ids ticked off
 */
export function filterSections(
  sections,
  { search = '', kind = 'all', completedFilter = 'all', completed = {} },
) {
  const keep = (c) => {
    if (kind !== 'all' && c.kind !== kind) return false;
    if (completedFilter === 'learned' && !completed[c.id]) return false;
    if (completedFilter === 'unlearned' && completed[c.id]) return false;
    return matchesSearch(c, search);
  };

  return sections
    .map((section) => ({
      ...section,
      groups: section.groups
        .map((group) => ({ ...group, cases: group.cases.filter(keep) }))
        .filter((group) => group.cases.length > 0),
    }))
    .filter((section) => section.groups.length > 0);
}

/** Every case left after filtering, flattened — what the Random button draws from. */
export function flattenSections(sections) {
  return sections.flatMap((section) => section.groups.flatMap((group) => group.cases));
}
