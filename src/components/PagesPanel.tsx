/**
 * PagesPanel — manages the list of project pages.
 *
 * Each page is a named group that page-level nodes (SCREEN, UI_ELEMENT,
 * ACTION, ROLE) can be assigned to. Global nodes (DATA_MODEL, API_ENDPOINT)
 * are always visible and unaffected by focus mode.
 *
 * Clicking the focus icon next to a page enters focus-mode: the canvas shows
 * only that page's nodes + all global nodes. Clicking again (or the "All"
 * button) exits focus mode.
 */

import { useRef, useState } from 'react';
import type { Page } from '../api/types';
import { Icon } from './Icon';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';

export function PagesPanel() {
  const pages = useGraphStore((s) => s.pages);
  const createPage = useGraphStore((s) => s.createPage);
  const updatePage = useGraphStore((s) => s.updatePage);
  const deletePage = useGraphStore((s) => s.deletePage);

  const focusedPageId = useUiStore((s) => s.focusedPageId);
  const setFocusedPage = useUiStore((s) => s.setFocusedPage);

  const [creatingNew, setCreatingNew] = useState(false);

  const handleCreate = async (name: string) => {
    if (!name.trim()) return;
    await createPage({ name: name.trim() });
    setCreatingNew(false);
  };

  return (
    <div className="pb-pages-panel">
      <div className="pb-pages-panel__header">
        <span className="pb-sidebar__section-title">Pages</span>
        <button
          className="pb-sidebar__add-btn"
          onClick={() => setCreatingNew(true)}
          title="Add page"
        >
          <Icon name="plus" size={12} />
        </button>
      </div>

      {focusedPageId && (
        <button
          className="pb-pages-panel__all-btn"
          onClick={() => setFocusedPage(null)}
          title="Exit focus mode — show all pages"
        >
          <Icon name="layers" size={12} />
          <span>All pages</span>
        </button>
      )}

      <div className="pb-pages-panel__list">
        {pages.length === 0 && !creatingNew && (
          <div className="pb-pages-panel__empty">
            No pages yet. Click + to add one.
          </div>
        )}

        {pages.map((page) => (
          <PageRow
            key={page.id}
            page={page}
            focused={focusedPageId === page.id}
            onFocus={() =>
              setFocusedPage(focusedPageId === page.id ? null : page.id)
            }
            onRename={(name) => updatePage(page.id, { name })}
            onDelete={() => {
              if (focusedPageId === page.id) setFocusedPage(null);
              void deletePage(page.id);
            }}
          />
        ))}

        {creatingNew && (
          <NewPageRow
            onConfirm={handleCreate}
            onCancel={() => setCreatingNew(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── PageRow ──────────────────────────────────────────────────────────────────

function PageRow({
  page,
  focused,
  onFocus,
  onRename,
  onDelete,
}: {
  page: Page;
  focused: boolean;
  onFocus: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.name);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== page.name) onRename(trimmed);
    else setDraft(page.name);
    setEditing(false);
  };

  return (
    <div
      className={`pb-pages-panel__row${focused ? ' pb-pages-panel__row--focused' : ''}`}
    >
      <button
        className="pb-pages-panel__focus-btn"
        onClick={onFocus}
        title={focused ? 'Exit focus mode' : 'Focus on this page'}
      >
        <Icon name={focused ? 'eye' : 'eye-off'} size={13} />
      </button>

      {editing ? (
        <input
          className="pb-pages-panel__name-input"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(page.name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          className="pb-pages-panel__name"
          onDoubleClick={() => {
            setDraft(page.name);
            setEditing(true);
          }}
          title={page.route ? `Route: ${page.route}` : undefined}
        >
          <span className="pb-pages-panel__name-text">{page.name}</span>
          {page.route && (
            <span className="pb-pages-panel__route">{page.route}</span>
          )}
        </button>
      )}

      <button
        className="pb-pages-panel__delete-btn"
        onClick={onDelete}
        title="Delete page (nodes are not deleted)"
      >
        <Icon name="trash-2" size={12} />
      </button>
    </div>
  );
}

// ── NewPageRow ────────────────────────────────────────────────────────────────

function NewPageRow({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="pb-pages-panel__row pb-pages-panel__row--new">
      <Icon name="file-plus" size={13} className="pb-pages-panel__new-icon" />
      <input
        ref={inputRef}
        className="pb-pages-panel__name-input"
        value={value}
        autoFocus
        placeholder="Page name…"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value.trim()) onConfirm(value);
          else onCancel();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onConfirm(value);
          if (e.key === 'Escape') onCancel();
        }}
      />
    </div>
  );
}
