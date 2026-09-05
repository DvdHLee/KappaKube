import { useMemo } from 'react';
import { filterSections, flattenSections, sectionsFor } from '../data/cases.js';
import { useCubeStore } from '../state/useCubeStore.js';
import { usePrefsStore } from '../state/usePrefsStore.js';
import CaseDiagram from './CaseDiagram.jsx';
import Segmented from './Segmented.jsx';
import { useClearCase, useLoadCase } from './useLoadCase.js';

const COMPLETED_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unlearned', label: 'To learn', title: 'Only cases not ticked off' },
  { value: 'learned', label: 'Learned', title: 'Only cases ticked off' },
];

export default function AlgMenu() {
  const search = usePrefsStore((s) => s.search);
  const setSearch = usePrefsStore((s) => s.setSearch);
  const kindFilter = usePrefsStore((s) => s.kindFilter);
  const setKindFilter = usePrefsStore((s) => s.setKindFilter);
  const completedFilter = usePrefsStore((s) => s.completedFilter);
  const setCompletedFilter = usePrefsStore((s) => s.setCompletedFilter);
  const completed = usePrefsStore((s) => s.completed);
  const toggleCompleted = usePrefsStore((s) => s.toggleCompleted);
  const selectedCaseId = usePrefsStore((s) => s.selectedCaseId);

  const n = useCubeStore((s) => s.n);
  const open = useLoadCase();
  const clear = useClearCase();

  /** Clicking the case that is already loaded puts it away again. */
  const toggle = (testCase) => (testCase.id === selectedCaseId ? clear() : open(testCase));

  const available = sectionsFor(n);

  // A kind chosen for one cube size means nothing on another, so fall back to
  // showing everything rather than an empty list.
  const kinds = available.map((section) => section.kind);
  const activeKind = kinds.includes(kindFilter) ? kindFilter : 'all';

  const kindOptions = [
    { value: 'all', label: 'All' },
    ...available.map((section) => ({ value: section.kind, label: section.title })),
  ];

  const sections = useMemo(
    () => filterSections(available, { search, kind: activeKind, completedFilter, completed }),
    [available, search, activeKind, completedFilter, completed],
  );

  const visible = flattenSections(sections);
  const inLibrary = flattenSections(available);
  const totalDone = inLibrary.filter((c) => completed[c.id]).length;

  /** Pick from whatever the filters currently leave on screen. */
  const openRandom = () => {
    if (visible.length === 0) return;
    // Avoid handing back the case already loaded, unless it is the only one.
    const pool = visible.length > 1 ? visible.filter((c) => c.id !== selectedCaseId) : visible;
    open(pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <section className="menu">
      <header className="menu-head">
        <div className="panel-title">
          Algorithms
          <span className="panel-note">
            {totalDone}/{inLibrary.length} learned
          </span>
        </div>

        <input
          className="menu-search"
          type="search"
          value={search}
          placeholder="Search: sune, dot, T perm…"
          spellCheck={false}
          onChange={(e) => setSearch(e.target.value)}
        />

        {available.length > 0 && (
          <>
            <Segmented
              label="Set"
              options={kindOptions}
              value={activeKind}
              onChange={setKindFilter}
            />
            <Segmented
              label="Show"
              options={COMPLETED_OPTIONS}
              value={completedFilter}
              onChange={setCompletedFilter}
            />

            <button
              className="hud-btn hud-btn--wide"
              onClick={openRandom}
              disabled={visible.length === 0}
              title="Load a random case from the ones listed below"
            >
              Random case
              <span className="panel-note">{visible.length} to pick from</span>
            </button>
          </>
        )}
      </header>

      <div className="menu-list">
        {available.length === 0 && (
          <p className="menu-empty">No algorithm set for this cube size yet.</p>
        )}
        {available.length > 0 && sections.length === 0 && (
          <p className="menu-empty">Nothing matches these filters.</p>
        )}

        {sections.map((section) => (
          <div key={section.kind} className="menu-section">
            <h3 className="menu-section-title">
              {section.title}
              <span className="panel-note">{section.subtitle}</span>
            </h3>

            {section.groups.map((group) => (
              <div key={group.group} className="menu-group">
                <h4 className="menu-group-title">{group.group}</h4>
                {group.cases.map((testCase) => (
                  <div
                    key={testCase.id}
                    className={`menu-row ${testCase.id === selectedCaseId ? 'is-selected' : ''}`}
                  >
                    {/* The checkbox is its own control so ticking a case off
                        does not also load it onto the cube. */}
                    <input
                      type="checkbox"
                      className="menu-check"
                      checked={Boolean(completed[testCase.id])}
                      title="Mark as learned"
                      onChange={() => toggleCompleted(testCase.id)}
                    />
                    <button
                      type="button"
                      className="menu-pick"
                      title={
                        testCase.id === selectedCaseId
                          ? `${testCase.label} — click to unload`
                          : testCase.label
                      }
                      onClick={() => toggle(testCase)}
                    >
                      <CaseDiagram view={testCase.view} kind={testCase.kind} size={34} />
                      <span className="menu-name">{testCase.name}</span>
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
