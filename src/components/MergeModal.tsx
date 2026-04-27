import { useState } from 'react';
import { branchesApi } from '../api/branches';
import type { MergeConflict } from '../api/types';
import { useGraphStore } from '../store/graphStore';
import { useBranchStore } from '../store/branchStore';
import { Button } from './Button';
import { Icon } from './Icon';
import { Modal } from './Modal';

export function MergeModal() {
  const open = useBranchStore((s) => s.mergeModalOpen);
  const close = useBranchStore((s) => s.closeMergeModal);
  const mergeResult = useBranchStore((s) => s.mergeResult);
  const mergeSourceBranchId = useBranchStore((s) => s.mergeSourceBranchId);
  const activeBranchId = useBranchStore((s) => s.activeBranchId);
  const branches = useBranchStore((s) => s.branches);
  const project = useGraphStore((s) => s.project);
  const loadBranchGraph = useGraphStore((s) => s.loadBranchGraph);

  // resolutions: entityId → 'source' | 'target'
  const [resolutions, setResolutions] = useState<Record<string, 'source' | 'target'>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conflicts = mergeResult?.conflicts ?? [];
  const sourceBranch = branches.find((b) => b.id === mergeSourceBranchId);
  const targetBranch = branches.find((b) => b.id === activeBranchId);

  const allResolved = conflicts.every((c) => resolutions[c.entityId] !== undefined);

  const resolve = (entityId: string, side: 'source' | 'target') => {
    setResolutions((r) => ({ ...r, [entityId]: side }));
  };

  const handleApply = async () => {
    if (!project || !activeBranchId || !mergeSourceBranchId) return;
    setLoading(true);
    setError(null);
    try {
      await branchesApi.resolveMerge(project.id, activeBranchId, {
        sourceBranchId: mergeSourceBranchId,
        resolutions: conflicts.map((c) => ({
          entityType: c.entityType,
          entityId: c.entityId,
          useSource: resolutions[c.entityId] === 'source',
        })),
      });
      // Reload target branch graph after merge
      await loadBranchGraph(project.id, activeBranchId);
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        <span className="pb-prompt-title">
          <Icon name="git-merge" size={16} />
          <span>Resolve merge conflicts</span>
        </span>
      }
      width={680}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            iconLeft="git-merge"
            onClick={handleApply}
            disabled={!allResolved || loading}
          >
            {loading ? 'Merging…' : `Apply merge (${Object.keys(resolutions).length}/${conflicts.length} resolved)`}
          </Button>
        </>
      }
    >
      <div className="pb-merge-header">
        <div className="pb-merge-branch-badge pb-merge-branch-badge--source">
          <Icon name="git-branch" size={12} />
          {sourceBranch?.name ?? mergeSourceBranchId ?? 'source'}
        </div>
        <Icon name="arrow-right" size={14} className="pb-merge-arrow" />
        <div className="pb-merge-branch-badge pb-merge-branch-badge--target">
          <Icon name="git-branch" size={12} />
          {targetBranch?.name ?? activeBranchId ?? 'target'}
        </div>
      </div>

      <p className="pb-merge-subtitle">
        {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} — choose which version to keep for each.
      </p>

      {error && <div className="pb-banner pb-banner--danger">{error}</div>}

      <div className="pb-conflict-list">
        {conflicts.map((conflict) => (
          <ConflictRow
            key={conflict.entityId}
            conflict={conflict}
            sourceName={sourceBranch?.name ?? 'source'}
            targetName={targetBranch?.name ?? activeBranchId ?? 'target'}
            resolution={resolutions[conflict.entityId]}
            onResolve={(side) => resolve(conflict.entityId, side)}
          />
        ))}
      </div>
    </Modal>
  );
}

function ConflictRow({
  conflict,
  sourceName,
  targetName,
  resolution,
  onResolve,
}: {
  conflict: MergeConflict;
  sourceName: string;
  targetName: string;
  resolution: 'source' | 'target' | undefined;
  onResolve: (side: 'source' | 'target') => void;
}) {
  const entityLabel = getEntityLabel(conflict);

  return (
    <div className={`pb-conflict-row ${resolution ? 'is-resolved' : ''}`}>
      <div className="pb-conflict-row__title">
        <span className="pb-pill pb-pill--mono">{conflict.entityType}</span>
        <span className="pb-conflict-row__id">{entityLabel}</span>
        {resolution && (
          <span className="pb-pill pb-pill--success">
            <Icon name="check" size={10} /> resolved
          </span>
        )}
      </div>

      <div className="pb-conflict-sides">
        <button
          className={`pb-conflict-side ${resolution === 'source' ? 'is-chosen' : ''}`}
          onClick={() => onResolve('source')}
        >
          <div className="pb-conflict-side__header">
            <Icon name="git-branch" size={11} />
            <strong>{sourceName}</strong>
            <span className="pb-pill pb-pill--mono">{conflict.sourceOperation}</span>
          </div>
          <pre className="pb-conflict-side__preview">
            {conflict.sourceSnapshot
              ? JSON.stringify(conflict.sourceSnapshot, null, 2).slice(0, 300)
              : '(deleted)'}
          </pre>
        </button>

        <button
          className={`pb-conflict-side ${resolution === 'target' ? 'is-chosen' : ''}`}
          onClick={() => onResolve('target')}
        >
          <div className="pb-conflict-side__header">
            <Icon name="git-branch" size={11} />
            <strong>{targetName}</strong>
            <span className="pb-pill pb-pill--mono">{conflict.targetOperation}</span>
          </div>
          <pre className="pb-conflict-side__preview">
            {conflict.targetSnapshot
              ? JSON.stringify(conflict.targetSnapshot, null, 2).slice(0, 300)
              : '(deleted)'}
          </pre>
        </button>
      </div>
    </div>
  );
}

function getEntityLabel(conflict: MergeConflict): string {
  const snap = conflict.sourceSnapshot ?? conflict.targetSnapshot;
  if (!snap) return conflict.entityId;
  if ('name' in snap && typeof (snap as { name?: unknown }).name === 'string') {
    return `${(snap as { name: string }).name} (${conflict.entityId.slice(0, 8)})`;
  }
  return conflict.entityId.slice(0, 8);
}
