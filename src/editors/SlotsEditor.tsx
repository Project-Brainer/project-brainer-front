import { useMemo } from 'react';
import type {
  AnyNode,
  NodeType,
  Slot,
  SlotSource,
  SlotSourceKind,
  SlotType,
  UiElementData,
  UiElementKind,
} from '../api/types';
import { SLOT_TYPES } from '../api/types';
import { Button } from '../components/Button';
import { FieldShell, Input, Select, Textarea } from '../components/Field';
import { Icon } from '../components/Icon';
import { nodePickerLabel } from '../lib/nodeMeta';
import { uuid } from '../lib/uuid';
import { useGraphStore } from '../store/graphStore';

/**
 * Slots editor — per-node panel that lets the user declare the typed
 * runtime values a node holds. Sources:
 *   literal, userInput, route, cache, binding, apiResponse, computed.
 *
 * Source availability is constrained by node type to match the backend's
 * cross-rule validation: userInput only on UI_ELEMENT input/form, route
 * only on SCREEN. binding / apiResponse are always available — the UI
 * picks the referenced node/slot/endpoint, but cross-graph integrity is
 * still best-effort (graph.validator can flag broken refs separately).
 */
export function SlotsEditor({
  nodeId,
  nodeType,
  uiKind,
  slots,
  onChange,
}: {
  /** Owning node id — excluded from binding pickers (no self-reference). */
  nodeId: string;
  nodeType: NodeType;
  uiKind?: UiElementKind;
  slots: Slot[];
  onChange: (next: Slot[]) => void;
}) {
  const allNodes = useGraphStore((s) => s.nodes);
  const otherNodes = useMemo(
    () => allNodes.filter((n) => n.id !== nodeId),
    [allNodes, nodeId],
  );
  const apiNodes = useMemo(
    () => allNodes.filter((n) => n.type === 'API_ENDPOINT'),
    [allNodes],
  );

  const availableSources = availableSourceKinds(nodeType, uiKind);

  const update = (id: string, patch: Partial<Slot>) => {
    onChange(slots.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const remove = (id: string) => {
    onChange(slots.filter((s) => s.id !== id));
  };
  const add = () => {
    const next: Slot = {
      id: uuid(),
      name: nextDefaultName(slots),
      type: 'string',
      source: defaultSourceForKind(availableSources[0]),
    };
    onChange([...slots, next]);
  };

  return (
    <FieldShell label="State" hint={slots.length > 0 ? `${slots.length}` : 'none yet'}>
      <div className="pb-slots">
        {slots.map((slot) => (
          <SlotRow
            key={slot.id}
            slot={slot}
            availableSources={availableSources}
            otherNodes={otherNodes}
            apiNodes={apiNodes}
            siblingSlotNames={slots
              .filter((s) => s.id !== slot.id && s.name)
              .map((s) => s.name)}
            onChange={(patch) => update(slot.id, patch)}
            onRemove={() => remove(slot.id)}
          />
        ))}
        <Button variant="ghost" iconLeft="plus" onClick={add}>
          Add slot
        </Button>
      </div>
    </FieldShell>
  );
}

function SlotRow({
  slot,
  availableSources,
  otherNodes,
  apiNodes,
  siblingSlotNames,
  onChange,
  onRemove,
}: {
  slot: Slot;
  availableSources: SlotSourceKind[];
  otherNodes: AnyNode[];
  apiNodes: AnyNode[];
  siblingSlotNames: string[];
  onChange: (patch: Partial<Slot>) => void;
  onRemove: () => void;
}) {
  const onSourceKindChange = (kind: SlotSourceKind) => {
    onChange({ source: defaultSourceForKind(kind) });
  };

  return (
    <div className="pb-slot-row">
      <div className="pb-slot-row__head">
        <Input
          aria-label="Slot name"
          placeholder="name"
          value={slot.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <Select<SlotType>
          aria-label="Slot type"
          value={slot.type}
          options={SLOT_TYPES.map((t) => ({ value: t, label: t }))}
          onChange={(value) => onChange({ type: value })}
        />
        <button
          type="button"
          className="pb-slot-row__remove"
          onClick={onRemove}
          aria-label="Remove slot"
          title="Remove slot"
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
      <div className="pb-slot-row__source">
        <Select<SlotSourceKind>
          aria-label="Source"
          value={slot.source.kind}
          options={availableSources.map((k) => ({ value: k, label: SOURCE_LABELS[k] }))}
          onChange={onSourceKindChange}
        />
        <SourceConfig
          source={slot.source}
          otherNodes={otherNodes}
          apiNodes={apiNodes}
          siblingSlotNames={siblingSlotNames}
          onChange={(source) => onChange({ source })}
        />
      </div>
      {(slot.type === 'object' || slot.type === 'array<object>') && (
        <Input
          label="Data Model"
          hint="required for object types"
          placeholder="UserModel"
          value={slot.ref ?? ''}
          onChange={(e) => onChange({ ref: e.target.value || undefined })}
        />
      )}
    </div>
  );
}

function SourceConfig({
  source,
  otherNodes,
  apiNodes,
  siblingSlotNames,
  onChange,
}: {
  source: SlotSource;
  otherNodes: AnyNode[];
  apiNodes: AnyNode[];
  siblingSlotNames: string[];
  onChange: (next: SlotSource) => void;
}) {
  switch (source.kind) {
    case 'literal':
      return (
        <Input
          aria-label="Literal value"
          placeholder="value"
          value={String(source.value ?? '')}
          onChange={(e) => onChange({ kind: 'literal', value: e.target.value })}
        />
      );
    case 'userInput':
      return <span className="pb-slot-row__hint pb-mono">from user input</span>;
    case 'route':
      return (
        <Input
          aria-label="Route param name"
          placeholder=":param"
          value={source.param}
          onChange={(e) => onChange({ kind: 'route', param: e.target.value })}
        />
      );
    case 'cache':
      return (
        <Input
          aria-label="Cache key"
          placeholder="cache.key"
          value={source.key}
          onChange={(e) => onChange({ kind: 'cache', key: e.target.value })}
        />
      );
    case 'binding':
      return (
        <BindingPicker
          fromNodeId={source.fromNodeId}
          fromSlotId={source.fromSlotId}
          otherNodes={otherNodes}
          onChange={(fromNodeId, fromSlotId) =>
            onChange({ kind: 'binding', fromNodeId, fromSlotId })
          }
        />
      );
    case 'apiResponse':
      return (
        <ApiResponsePicker
          endpointId={source.endpointId}
          jsonPath={source.jsonPath}
          apiNodes={apiNodes}
          onChange={(endpointId, jsonPath) =>
            onChange({ kind: 'apiResponse', endpointId, jsonPath })
          }
        />
      );
    case 'computed':
      return (
        <div className="pb-slot-row__source-stack">
          <Textarea
            aria-label="Computed template"
            placeholder={'Hello, ${firstName}!'}
            rows={2}
            value={source.template}
            onChange={(e) => onChange({ kind: 'computed', template: e.target.value })}
          />
          <span className="pb-slot-row__hint pb-mono">
            {siblingSlotNames.length > 0
              ? `available: ${siblingSlotNames.join(', ')}`
              : 'no other slots on this node yet'}
          </span>
        </div>
      );
  }
}

function BindingPicker({
  fromNodeId,
  fromSlotId,
  otherNodes,
  onChange,
}: {
  fromNodeId: string;
  fromSlotId: string;
  otherNodes: AnyNode[];
  onChange: (fromNodeId: string, fromSlotId: string) => void;
}) {
  const sourceNode = otherNodes.find((n) => n.id === fromNodeId);
  const sourceSlots = nodeSlots(sourceNode);
  const nodeOptions = [
    { value: '', label: '— pick a node —' },
    ...otherNodes
      .filter((n) => nodeSlots(n).length > 0)
      .map((n) => ({ value: n.id, label: nodePickerLabel(n) })),
  ];
  const slotOptions = [
    { value: '', label: sourceSlots.length === 0 ? '— no slots —' : '— pick a slot —' },
    ...sourceSlots.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className="pb-slot-row__source-stack">
      <Select
        aria-label="Source node"
        value={fromNodeId}
        options={nodeOptions}
        onChange={(value) => onChange(value, '')}
      />
      <Select
        aria-label="Source slot"
        value={fromSlotId}
        options={slotOptions}
        onChange={(value) => onChange(fromNodeId, value)}
      />
    </div>
  );
}

function ApiResponsePicker({
  endpointId,
  jsonPath,
  apiNodes,
  onChange,
}: {
  endpointId: string;
  jsonPath?: string;
  apiNodes: AnyNode[];
  onChange: (endpointId: string, jsonPath?: string) => void;
}) {
  const endpointOptions = [
    { value: '', label: '— pick an endpoint —' },
    ...apiNodes.map((n) => ({ value: n.id, label: nodePickerLabel(n) })),
  ];

  return (
    <div className="pb-slot-row__source-stack">
      <Select
        aria-label="Endpoint"
        value={endpointId}
        options={endpointOptions}
        onChange={(value) => onChange(value, jsonPath)}
      />
      <Input
        aria-label="Response JSON path"
        placeholder="$.user.id (default $)"
        value={jsonPath ?? ''}
        onChange={(e) => onChange(endpointId, e.target.value || undefined)}
      />
    </div>
  );
}

/** Read the slots a node exposes, regardless of node type. */
function nodeSlots(node: AnyNode | undefined): Slot[] {
  if (!node) return [];
  if (node.type === 'SCREEN' || node.type === 'ACTION') {
    return ((node.data as { slots?: Slot[] }).slots ?? []) as Slot[];
  }
  if (node.type === 'UI_ELEMENT') {
    return ((node.data as UiElementData).slots ?? []) as Slot[];
  }
  return [];
}

const SOURCE_LABELS: Record<SlotSourceKind, string> = {
  literal: 'literal',
  userInput: 'user input',
  route: 'route param',
  cache: 'cache',
  binding: 'from node slot',
  apiResponse: 'from API response',
  computed: 'computed (template)',
};

function defaultSourceForKind(kind: SlotSourceKind): SlotSource {
  switch (kind) {
    case 'literal':
      return { kind: 'literal', value: '' };
    case 'userInput':
      return { kind: 'userInput' };
    case 'route':
      return { kind: 'route', param: '' };
    case 'cache':
      return { kind: 'cache', key: '' };
    case 'binding':
      return { kind: 'binding', fromNodeId: '', fromSlotId: '' };
    case 'apiResponse':
      return { kind: 'apiResponse', endpointId: '' };
    case 'computed':
      return { kind: 'computed', template: '' };
  }
}

function availableSourceKinds(
  nodeType: NodeType,
  uiKind?: UiElementKind,
): SlotSourceKind[] {
  // Cross-node sources are always available; the picker resolves the target.
  // `computed` is purely local (same-node template), so it's always offered.
  const base: SlotSourceKind[] = ['literal', 'cache', 'binding', 'apiResponse', 'computed'];
  if (nodeType === 'SCREEN')
    return ['literal', 'route', 'cache', 'binding', 'apiResponse', 'computed'];
  if (nodeType === 'UI_ELEMENT') {
    return uiKind === 'input' || uiKind === 'form'
      ? ['literal', 'userInput', 'cache', 'binding', 'apiResponse', 'computed']
      : base;
  }
  return base;
}

function nextDefaultName(existing: Slot[]): string {
  const used = new Set(existing.map((s) => s.name));
  for (let i = 1; i < 10_000; i += 1) {
    const candidate = `slot${i}`;
    if (!used.has(candidate)) return candidate;
  }
  return `slot${uuid().slice(0, 6)}`;
}
