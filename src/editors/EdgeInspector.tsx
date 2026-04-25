import type { Edge } from '../api/types';
import { Button } from '../components/Button';
import { Input } from '../components/Field';
import { Pill } from '../components/Pill';
import { edgeTypeLabel } from '../lib/edgeCompat';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';

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
