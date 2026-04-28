import { useState } from 'react';
import { branchesApi } from '../api/branches';
import type { MergeEdgeConflict, MergeNodeConflict } from '../api/types';
import { useGraphStore } from '../store/graphStore';
import { useBranchStore } from '../store/branchStore';
import { Button } from './Button';
import { Icon } from './Icon';
import { Modal } from './Modal';

type Resolution = 'source' | 'target';

export function MergeModal() {
  const open = useBranchStore((s) => s.mergeModalOpen);
  const close = useBranchStore((s) => s.closeMergeModal);
  const mergeResult = useBranchStore((s) => s.mergeResult);
  const mergeSourceBranchId = useBranchStore((s) => s.mergeSourceBranchId);
  const activeBranchId = useBranchStore((s) => s.activeBranchId);
  const branches = useBranchStore((s) => s.branches);
  const project = useGraphStore((s) => s.project);
  const loadBranchGraph = useGraphStore((s) => s.loadBranchGraph);

  // resolutions keyed by `node:${nodeId}` or `edge:${edgeId}`
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nodeConflicts = mergeResult?.nodeConflicts ?? [];
  const edgeConflicts = mergeResult?.edgeConflicts ?? [];
  const totalConflicts = nodeConflicts.length + edgeConflicts.length;
  const resolvedCount = Object.keys(resolutions).length;
  const allResolved = resolvedCount === totalConflicts;

  const sourceBranch = branches.find((b) => b.id === mergeSourceBranchId);
  const targetBranch = branches.find((b) => b.id === activeBranchId);

  const resolveNode = (nodeId: string, side: Resolution) =>
    setResolutions((r) => ({ ...r, [`node:${nodeId}`]: side }));

  const resolveEdge = (edgeId: string, side: Resolution) =>
    setResolutions((r) => ({ ...r, [`edge:${edgeId}`]: side }));

  const handleApply = async () => {
    if (!project || !activeBranchId || !mergeSourceBranchId) return;
    setLoading(true);
    setError(null);
    try {
      // Build resolvedNodes — for each node conflict, pick the chosen snapshot
      const resolvedNodes = nodeConflicts.map((c) => {
        const side = resolutions[`node:${c.nodeId}`];
        const snapshot = side === 'source' ? c.sourceSnapshot : c.targetSnapshot;
        return { nodeId: c.nodeId, snapshot };
      });

      // Build resolvedEdges
      const resolvedEdges = edgeConflicts.map((c) => {
        const side = resolutions[`edge:${c.edgeId}`];
        const snapshot = side === 'source' ? c.sourceSnapshot : c.targetSnapshot;
        return { edgeId: c.edgeId, snapshot };
      });

      // sourceBranchId in URL, targetBranchId in body
      await branchesApi.resolveMerge(project.id, mergeSourceBranchId, {
        targetBranchId: activeBranchId,
        resolvedNodes,
        resolvedEdges,
      });

      // Reload target branch graph after successful merge
      await loadBranchGraph(project.id, activeBranchId);
      setResolutions({});
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setResolutions({});
    setError(null);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <span className="pb-prompt-title">
          <Icon name="git-merge" size={16} />
          <span>Resolve merge conflicts</span>
        </span>
      }
      width={700}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            iconLeft="git-merge"
            onClick={handleApply}
            disabled={!allResolved || loading}
          >
            {loading
              ? 'Merging…'
              : `Apply merge (${resolvedCount}/${totalConflicts} resolved)`}
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
        {totalConflicts} conflict{totalConflicts !== 1 ? 's' : ''} — choose which version to keep for each.
      </p>

      {error && <div className="pb-banner pb-banner--danger">{error}</div>}

      <div className="pb-conflict-list">
        {nodeConflicts.map((c) => (
          <NodeConflictRow
            key={c.nodeId}
            conflict={c}
            sourceName={sourceBranch?.name ?? 'source'}
            targetName={targetBranch?.name ?? 'target'}
            resolution={resolutions[`node:${c.nodeId}`]}
            onResolve={(side) => resolveNode(c.nodeId, side)}
          />
        ))}
        {edgeConflicts.map((c) => (
          <EdgeConflictRow
            key={c.edgeId}
            conflict={c}
            sourceName={sourceBranch?.name ?? 'source'}
            targetName={targetBranch?.name ?? 'target'}
            resolution={resolutions[`edge:${c.edgeId}`]}
            onResolve={(side) => resolveEdge(c.edgeId, side)}
          />
        ))}
      </div>
    </Modal>
  );
}

function NodeConflictRow({
  conflict,
  sourceName,
  targetName,
  resolution,
  onResolve,
}: {
  conflict: MergeNodeConflict;
  sourceName: string;
  targetName: string;
  resolution: Resolution | undefined;
  onResolve: (side: Resolution) => void;
}) {
  const label =
    (conflict.sourceSnapshot as { name?: string } | null)?.name ??
    (conflict.targetSnapshot as { name?: string } | null)?.name ??
    conflict.nodeId.slice(0, 8);

  return (
    <div className={`pb-conflict-row ${resolution ? 'is-resolved' : ''}`}>
      <div className="pb-conflict-row__title">
        <span className="pb-pill pb-pill--mono">node</span>
        <span className="pb-conflict-row__id">{label}</span>
        {resolution && (
          <span className="pb-pill pb-pill--success">
            <Icon name="check" size={10} /> resolved
          </span>
        )}
      </div>
      <div className="pb-conflict-sides">
        <ConflictSide
          label={sourceName}
          op={conflict.sourceOp}
          snapshot={conflict.sourceSnapshot}
          chosen={resolution === 'source'}
          onClick={() => onResolve('source')}
        />
        <ConflictSide
          label={targetName}
          op={conflict.targetOp}
          snapshot={conflict.targetSnapshot}
          chosen={resolution === 'target'}
          onClick={() => onResolve('target')}
        />
      </div>
    </div>
  );
}

function EdgeConflictRow({
  conflict,
  sourceName,
  targetName,
  resolution,
  onResolve,
}: {
  conflict: MergeEdgeConflict;
  sourceName: string;
  targetName: string;
  resolution: Resolution | undefined;
  onResolve: (side: Resolution) => void;
}) {
  const label = conflict.edgeId.slice(0, 8);

  return (
    <div className={`pb-conflict-row ${resolution ? 'is-resolved' : ''}`}>
      <div className="pb-conflict-row__title">
        <span className="pb-pill pb-pill--mono">edge</span>
        <span className="pb-conflict-row__id">{label}</span>
        {resolution && (
          <span className="pb-pill pb-pill--success">
            <Icon name="check" size={10} /> resolved
          </span>
        )}
      </div>
      <div className="pb-conflict-sides">
        <ConflictSide
          label={sourceName}
          op={conflict.sourceOp}
          snapshot={conflict.sourceSnapshot}
          chosen={resolution === 'source'}
          onClick={() => onResolve('source')}
        />
        <ConflictSide
          label={targetName}
          op={conflict.targetOp}
          snapshot={conflict.targetSnapshot}
          chosen={resolution === 'target'}
          onClick={() => onResolve('target')}
        />
      </div>
    </div>
  );
}

function ConflictSide({
  label,
  op,
  snapshot,
  chosen,
  onClick,
}: {
  label: string;
  op: string;
  snapshot: Record<string, unknown> | null;
  chosen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`pb-conflict-side ${chosen ? 'is-chosen' : ''}`}
      onClick={onClick}
    >
      <div className="pb-conflict-side__header">
        <Icon name="git-branch" size={11} />
        <strong>{label}</strong>
        <span className="pb-pill pb-pill--mono">{op}</span>
      </div>
      <pre className="pb-conflict-side__preview">
        {snapshot ? JSON.stringify(snapshot, null, 2).slice(0, 300) : '(deleted)'}
      </pre>
    </button>
  );
}
