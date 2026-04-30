import { useEffect, useRef, useState } from 'react';
import { branchesApi } from '../api/branches';
import type { Branch } from '../api/types';
import { useGraphStore } from '../store/graphStore';
import { useBranchStore, selectActiveBranch } from '../store/branchStore';
import { Button } from './Button';
import { Icon } from './Icon';

export function BranchSelector() {
  const project = useGraphStore((s) => s.project);
  const loadBranchGraph = useGraphStore((s) => s.loadBranchGraph);
  const loadProject = useGraphStore((s) => s.loadProject);
  const flushSave = useGraphStore((s) => s.flushSave);

  const branches = useBranchStore((s) => s.branches);
  const loadingBranches = useBranchStore((s) => s.loadingBranches);
  const activeBranch = useBranchStore(selectActiveBranch);
  const activeBranchId = useBranchStore((s) => s.activeBranchId);
  const loadBranches = useBranchStore((s) => s.loadBranches);
  const setActiveBranch = useBranchStore((s) => s.setActiveBranch);
  const createBranch = useBranchStore((s) => s.createBranch);
  const openCommitModal = useBranchStore((s) => s.openCommitModal);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [merging, setMerging] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (project) {
      loadBranches(project.id);
    }
  }, [project?.id]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const switchTo = async (branchId: string | null) => {
    if (!project) return;
    setOpen(false);
    // Flush any pending debounced save BEFORE switching the active branch ID.
    // Without this, the 600ms debounce fires after setActiveBranch and writes
    // the current branch's changes into the newly-selected branch.
    await flushSave();
    setActiveBranch(branchId);
    if (branchId) {
      await loadBranchGraph(project.id, branchId);
    } else {
      await loadProject(project.id);
    }
  };

  const handleCreate = async () => {
    if (!project || !newName.trim()) return;
    const branch = await createBranch(project.id, {
      name: newName.trim(),
      parentId: activeBranchId ?? undefined,
    });
    if (branch) {
      setNewName('');
      setCreating(false);
      await switchTo(branch.id);
    }
  };

  const handleMerge = async (targetBranchId: string, sourceBranchId: string) => {
    if (!project) return;
    setMerging(sourceBranchId);
    setMergeError(null);
    try {
      // merge(projectId, sourceBranchId, targetBranchId) — source goes INTO target
      const result = await branchesApi.merge(project.id, sourceBranchId, targetBranchId);
      if (result.merged) {
        // No conflicts — reload the target branch graph
        await switchTo(targetBranchId);
      } else {
        // Conflicts — open resolver; active branch must be target
        await switchTo(targetBranchId);
        useBranchStore.getState().openMergeModal(sourceBranchId, result);
        setOpen(false);
      }
    } catch (err) {
      setMergeError((err as Error).message);
    } finally {
      setMerging(null);
    }
  };

  const label = activeBranch ? activeBranch.name : 'main';

  return (
    <div className="pb-branch-selector" ref={menuRef}>
      <button
        className="pb-branch-selector__trigger"
        onClick={() => setOpen((o) => !o)}
        title="Switch branch"
      >
        <Icon name="git-branch" size={14} />
        <span className="pb-branch-selector__label">{label}</span>
        <Icon name="chevron-down" size={12} className={open ? 'pb-rotate-180' : ''} />
      </button>

      {open && (
        <div className="pb-branch-menu">
          <div className="pb-branch-menu__section-title">Branches</div>

          {/* main / root */}
          <button
            className={`pb-branch-menu__item ${!activeBranchId ? 'is-active' : ''}`}
            onClick={() => switchTo(null)}
          >
            <Icon name="git-branch" size={13} />
            <span>main</span>
            {!activeBranchId && <Icon name="check" size={12} className="pb-branch-menu__check" />}
          </button>

          {loadingBranches && (
            <div className="pb-branch-menu__empty">
              <Icon name="loader" spin size={12} /> Loading…
            </div>
          )}

          {branches.map((branch) => (
            <BranchMenuItem
              key={branch.id}
              branch={branch}
              isActive={activeBranchId === branch.id}
              activeBranchId={activeBranchId}
              merging={merging}
              onSwitch={() => switchTo(branch.id)}
              onMerge={(targetId) => handleMerge(targetId, branch.id)}
            />
          ))}

          {mergeError && (
            <div className="pb-branch-menu__error">{mergeError}</div>
          )}

          <div className="pb-branch-menu__divider" />

          {/* Commit button (only when on a branch) */}
          {activeBranchId && (
            <button
              className="pb-branch-menu__action"
              onClick={() => { setOpen(false); openCommitModal(); }}
            >
              <Icon name="bookmark" size={13} />
              <span>Save checkpoint…</span>
            </button>
          )}

          {/* Create new branch */}
          {creating ? (
            <div className="pb-branch-menu__create">
              <input
                className="pb-input"
                style={{ fontSize: 'var(--text-sm)', padding: '4px 8px' }}
                autoFocus
                placeholder="Branch name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                }}
              />
              <div className="pb-branch-menu__create-actions">
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={!newName.trim()}>
                  Create
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setNewName(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              className="pb-branch-menu__action"
              onClick={() => setCreating(true)}
            >
              <Icon name="plus" size={13} />
              <span>New branch…</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BranchMenuItem({
  branch,
  isActive,
  activeBranchId,
  merging,
  onSwitch,
  onMerge,
}: {
  branch: Branch;
  isActive: boolean;
  activeBranchId: string | null;
  merging: string | null;
  onSwitch: () => void;
  onMerge: (targetBranchId: string) => void;
}) {
  const [showMergeTarget, setShowMergeTarget] = useState(false);

  return (
    <div className={`pb-branch-menu__item-row ${isActive ? 'is-active' : ''}`}>
      <button className="pb-branch-menu__item" onClick={onSwitch}>
        <Icon name="git-branch" size={13} />
        <span title={branch.name}>{branch.name}</span>
        {isActive && <Icon name="check" size={12} className="pb-branch-menu__check" />}
      </button>

      {/* Merge into current button — only show for non-active branches when we are on a branch or main */}
      {!isActive && (
        <div className="pb-branch-menu__merge-wrap">
          {showMergeTarget ? (
            <div className="pb-branch-menu__merge-confirm">
              <span>Merge into:</span>
              {/* merge into current active branch or main */}
              <button
                className="pb-branch-menu__merge-btn"
                onClick={() => {
                  setShowMergeTarget(false);
                  // target = currently active branch or main (null → we need a real branch to merge INTO)
                  // We merge branch.id INTO activeBranchId; if activeBranchId is null, we merge into root (use 'root' sentinel? Actually our API uses a branchId for target)
                  if (activeBranchId) {
                    onMerge(activeBranchId);
                  }
                }}
                disabled={!activeBranchId || merging === branch.id}
              >
                {merging === branch.id ? <Icon name="loader" spin size={11} /> : null}
                {activeBranchId ? `→ current branch` : 'Select target branch first'}
              </button>
              <button className="pb-branch-menu__merge-cancel" onClick={() => setShowMergeTarget(false)}>
                <Icon name="x" size={11} />
              </button>
            </div>
          ) : (
            <button
              className="pb-branch-menu__merge-icon"
              title={`Merge ${branch.name} into current branch`}
              onClick={(e) => { e.stopPropagation(); setShowMergeTarget(true); }}
            >
              <Icon name="git-merge" size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
