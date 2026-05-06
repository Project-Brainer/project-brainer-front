import type {
  AnyNode,
  ApiEndpointData,
  CallsEdgeData,
  Edge,
  NodeType,
  RequestBinding,
  RespondsWithEdgeData,
  RespondsWithKind,
  ResponseOutcome,
  Slot,
  UiElementData,
} from '../api/types';
import { RESPONSE_OUTCOMES } from '../api/types';
import { Button } from '../components/Button';
import { FieldShell, Input, Select } from '../components/Field';
import { Icon } from '../components/Icon';
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

      {edge.type === 'CALLS' && source && target && (
        <RequestBindingsEditor
          source={source}
          target={target}
          data={(edge.data as CallsEdgeData) ?? undefined}
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

/**
 * Per-CALLS-edge editor: maps endpoint request schema fields to slots on
 * the source node (the action). The endpoint's request schema is the flat
 * top-level object the SchemaBuilder writes into ApiEndpointData.request.
 * Cross-graph integrity (referenced slot still exists, field still in
 * schema) is best-effort — we surface what's currently valid and leave
 * stale entries in place so the user can see what to fix.
 */
function RequestBindingsEditor({
  source,
  target,
  data,
  onChange,
}: {
  source: AnyNode;
  target: AnyNode;
  data?: CallsEdgeData;
  onChange: (next: CallsEdgeData) => void;
}) {
  const slots = nodeSlots(source);
  const requestFields = target.type === 'API_ENDPOINT'
    ? extractRequestFieldNames((target.data as ApiEndpointData).request)
    : [];
  const bindings = data?.requestBindings ?? [];

  const update = (id: string, patch: Partial<RequestBinding>) => {
    const next = bindings.map((b, i) =>
      bindingKey(b, i) === id ? { ...b, ...patch } : b,
    );
    onChange({ requestBindings: next });
  };
  const remove = (id: string) => {
    const next = bindings.filter((b, i) => bindingKey(b, i) !== id);
    onChange({ requestBindings: next.length > 0 ? next : undefined });
  };
  const add = () => {
    const next: RequestBinding = {
      field: requestFields[0] ?? '',
      sourceSlotId: slots[0]?.id ?? '',
    };
    onChange({ requestBindings: [...bindings, next] });
  };

  const fieldOptions = (current: string) => {
    const known = new Set(requestFields);
    if (current && !known.has(current)) known.add(current);
    return [...known].map((f) => ({ value: f, label: f }));
  };
  const slotOptions = [
    { value: '', label: slots.length === 0 ? '— no slots on source —' : '— pick a slot —' },
    ...slots.map((s) => ({ value: s.id, label: s.name })),
  ];

  const hint = bindings.length > 0
    ? `${bindings.length} of ${Math.max(requestFields.length, bindings.length)}`
    : requestFields.length === 0
      ? 'endpoint has no request schema'
      : `${requestFields.length} request field${requestFields.length === 1 ? '' : 's'}`;

  return (
    <FieldShell label="Request bindings" hint={hint}>
      <div className="pb-slots">
        {bindings.map((b, i) => {
          const id = bindingKey(b, i);
          return (
            <div key={id} className="pb-slot-row">
              <div className="pb-slot-row__source">
                <Select
                  aria-label="Endpoint field"
                  value={b.field}
                  options={fieldOptions(b.field)}
                  onChange={(value) => update(id, { field: value })}
                />
                <Select
                  aria-label="From slot"
                  value={b.sourceSlotId}
                  options={slotOptions}
                  onChange={(value) => update(id, { sourceSlotId: value })}
                />
                <button
                  type="button"
                  className="pb-slot-row__remove"
                  onClick={() => remove(id)}
                  aria-label="Remove binding"
                  title="Remove binding"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          );
        })}
        <Button variant="ghost" iconLeft="plus" onClick={add}>
          Add binding
        </Button>
      </div>
    </FieldShell>
  );
}

/** Stable react key for a binding row even when field/slot are empty. */
function bindingKey(b: RequestBinding, i: number): string {
  return `${i}:${b.field}:${b.sourceSlotId}`;
}

/** Pull the flat top-level field names from an endpoint request schema. */
function extractRequestFieldNames(schema: unknown): string[] {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return [];
  return Object.keys(schema as Record<string, unknown>);
}

/** Read the slots a node exposes, regardless of node type. */
function nodeSlots(node: AnyNode): Slot[] {
  if (node.type === 'SCREEN' || node.type === 'ACTION') {
    return ((node.data as { slots?: Slot[] }).slots ?? []) as Slot[];
  }
  if (node.type === 'UI_ELEMENT') {
    return ((node.data as UiElementData).slots ?? []) as Slot[];
  }
  return [];
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
