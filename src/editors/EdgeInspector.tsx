import type {
  Edge,
  NodeType,
  RespondsWithEdgeData,
  RespondsWithKind,
  ResponseOutcome,
} from '../api/types';
import { RESPONSE_OUTCOMES } from '../api/types';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Field';
import { Pill } from '../components/Pill';
import {
  RESPONDS_WITH_KIND_TARGETS,
  defaultRespondsWithKind,
  edgeTypeLabel,
} from '../lib/edgeCompat';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';

const KIND_LABELS: Record<RespondsWithKind, string> = {
  navigate: 'navigate to screen',
  refresh: 'refresh data',
  show: 'show UI element',
  run: 'run action',
};

export function EdgeInspector({ edge }: { edge: Edge }) {
  const updateEdge = useGraphStore((s) => s.updateEdge);
  const deleteEdge = useGraphStore((s) => s.deleteEdge);
  const nodes = useGraphStore((s) => s.nodes);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const source = nodes.find((n) => n.id === edge.sourceId);
  const target = nodes.find((n) => n.id === edge.targetId);

  return (
    <div className="pb-inspector">
      <header className="pb-inspector__head">
        <Pill mono tone="accent">
          {edgeTypeLabel(edge.type)}
        </Pill>
        <span className="pb-inspector__hint pb-mono">{edge.type}</span>
      </header>

      <div className="pb-edge-summary">
        <div className="pb-edge-summary__row">
          <span className="pb-label">From</span>
          <span>{source?.name ?? edge.sourceId}</span>
        </div>
        <div className="pb-edge-summary__row">
          <span className="pb-label">To</span>
          <span>{target?.name ?? edge.targetId}</span>
        </div>
      </div>

      {edge.type === 'RESPONDS_WITH' && target && (
        <RespondsWithControls
          edgeId={edge.id}
          data={(edge.data as RespondsWithEdgeData) ?? undefined}
          targetType={target.type}
          onChange={(patch) => updateEdge(edge.id, { data: patch })}
        />
      )}

      <Input
        label="Label"
        hint="optional"
        placeholder={edgeTypeLabel(edge.type)}
        value={edge.label ?? ''}
        onChange={(e) =>
          updateEdge(edge.id, { label: e.target.value || null })
        }
      />

      <div className="pb-divider" />

      <Button
        variant="danger"
        iconLeft="trash"
        onClick={async () => {
          if (!confirm('Delete this connection?')) return;
          await deleteEdge(edge.id);
          clearSelection();
        }}
      >
        Delete connection
      </Button>
    </div>
  );
}

function RespondsWithControls({
  data,
  targetType,
  onChange,
}: {
  edgeId: string;
  data?: RespondsWithEdgeData;
  targetType: NodeType;
  onChange: (next: RespondsWithEdgeData) => void;
}) {
  // Backfill defaults if the edge was created without a structured payload.
  const kind: RespondsWithKind = data?.kind ?? defaultRespondsWithKind(targetType);
  const outcome: ResponseOutcome = data?.outcome ?? 'success';

  // Only kinds the current target accepts — other choices would be rejected
  // by the backend. If somehow the stored kind no longer fits the target,
  // include it anyway so the user sees what's there and can switch.
  const allowedKinds = (Object.entries(RESPONDS_WITH_KIND_TARGETS) as Array<
    [RespondsWithKind, NodeType[]]
  >)
    .filter(([k, targets]) => targets.includes(targetType) || k === kind)
    .map(([k]) => k);

  return (
    <>
      <Select<RespondsWithKind>
        label="Effect"
        hint={`runs on ${outcome === 'success' ? 'success' : 'error'} response`}
        value={kind}
        options={allowedKinds.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
        onChange={(value) => onChange({ kind: value, outcome })}
      />
      <Select<ResponseOutcome>
        label="When"
        value={outcome}
        options={RESPONSE_OUTCOMES.map((o) => ({
          value: o,
          label: o === 'success' ? 'on success' : 'on error',
        }))}
        onChange={(value) => onChange({ kind, outcome: value })}
      />
    </>
  );
}
