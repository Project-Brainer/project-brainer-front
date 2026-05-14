/**
 * PagesPanel — list of project pages.
 *
 * Single click → activate page (focus mode: show only this page + global nodes).
 * Single click on active page → deactivate (show all).
 * Double click on name → inline rename.
 * Trash icon (hover) → delete page.
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
            active={focusedPageId === page.id}
            onClick={() =>
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
  active,
  onClick,
  onRename,
  onDelete,
}: {
  page: Page;
  active: boolean;
  onClick: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.name);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== page.name) onRename(trimmed);
    else setDraft(page.name);
    setEditing(false);
  };

  // Single click → activate; double click → rename (cancel single click action)
  const handleClick = () => {
    if (editing) return;
    clickTimer.current = setTimeout(() => {
      onClick();
    }, 200);
  };

  const handleDoubleClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    setDraft(page.name);
    setEditing(true);
  };

  return (
    <div
      className={`pb-pages-panel__row${active ? ' pb-pages-panel__row--active' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={active ? 'Click to show all pages' : 'Click to focus this page'}
    >
      <Icon
        name="file"
        size={13}
        className={`pb-pages-panel__file-icon${active ? ' pb-pages-panel__file-icon--active' : ''}`}
      />

      {editing ? (
        <input
          className="pb-pages-panel__name-input"
          value={draft}
          autoFocus
          onClick={(e) => e.stopPropagation()}
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
        <span className="pb-pages-panel__name">
          <span className="pb-pages-panel__name-text">{page.name}</span>
          {page.route && (
            <span className="pb-pages-panel__route">{page.route}</span>
          )}
        </span>
      )}

      <button
        className="pb-pages-panel__delete-btn"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
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

  return (
    <div className="pb-pages-panel__row pb-pages-panel__row--new">
      <Icon name="file-plus" size={13} className="pb-pages-panel__file-icon" />
      <input
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
