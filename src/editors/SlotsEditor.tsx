import type {
  NodeType,
  Slot,
  SlotSource,
  SlotSourceKind,
  SlotType,
  UiElementKind,
} from '../api/types';
import { SLOT_TYPES } from '../api/types';
import { Button } from '../components/Button';
import { FieldShell, Input, Select } from '../components/Field';
import { Icon } from '../components/Icon';
import { uuid } from '../lib/uuid';

/**
 * Slots editor — per-node panel that lets the user declare the typed
 * runtime values a node holds. Stage 1 sources (literal, userInput, route,
 * cache) only — bindings to other nodes / API responses come in stage 2.
 *
 * Source availability is constrained by node type to match the backend's
 * cross-rule validation: userInput is only valid on UI_ELEMENT input/form;
 * route is only valid on SCREEN.
 */
export function SlotsEditor({
  nodeType,
  uiKind,
  slots,
  onChange,
}: {
  nodeType: NodeType;
  uiKind?: UiElementKind;
  slots: Slot[];
  onChange: (next: Slot[]) => void;
}) {
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
  onChange,
  onRemove,
}: {
  slot: Slot;
  availableSources: SlotSourceKind[];
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
        <SourceConfig source={slot.source} onChange={(source) => onChange({ source })} />
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
  onChange,
}: {
  source: SlotSource;
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
  }
}

const SOURCE_LABELS: Record<SlotSourceKind, string> = {
  literal: 'literal',
  userInput: 'user input',
  route: 'route param',
  cache: 'cache',
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
  }
}

function availableSourceKinds(
  nodeType: NodeType,
  uiKind?: UiElementKind,
): SlotSourceKind[] {
  const base: SlotSourceKind[] = ['literal', 'cache'];
  if (nodeType === 'SCREEN') return [...base, 'route'];
  if (nodeType === 'UI_ELEMENT') {
    return uiKind === 'input' || uiKind === 'form'
      ? [...base, 'userInput']
      : base;
  }
  // ACTION — stage 1 has no node-specific extras.
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
