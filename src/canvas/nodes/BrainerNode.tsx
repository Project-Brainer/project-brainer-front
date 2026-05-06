import clsx from 'clsx';
import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { AnyNode, NodeType, Slot, SlotSourceKind } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Pill } from '../../components/Pill';
import { NODE_META } from '../../lib/nodeMeta';

export interface BrainerNodeData {
  node: AnyNode;
  selected?: boolean;
  forbidden?: boolean;
  /** True if this node is structurally connected to the selected one (any
   *  edge, plus slot/binding refs) — soft border highlight. */
  related?: boolean;
  /** Strict subset of `related` — actually exchanges data with selected
   *  via slot bindings or CALLS request bindings. Stronger ring. */
  dataflowRelated?: boolean;
}

function nodeSubtitle(node: AnyNode): string | null {
  switch (node.type) {
    case 'API_ENDPOINT': {
      const d = node.data as { method?: string; path?: string };
      return d?.method && d?.path ? `${d.method} ${d.path}` : null;
    }
    case 'UI_ELEMENT': {
      const d = node.data as { kind?: string };
      return d?.kind ?? null;
    }
    case 'ACTION': {
      const d = node.data as { kind?: string };
      return d?.kind ?? null;
    }
    case 'DATA_MODEL': {
      const d = node.data as { fields?: unknown[] };
      const count = d?.fields?.length ?? 0;
      return `${count} field${count === 1 ? '' : 's'}`;
    }
    default:
      return null;
  }
}

function BrainerNodeImpl({ data, selected }: NodeProps<BrainerNodeData>) {
  const node = data.node;
  const meta = NODE_META[node.type as NodeType];
  const subtitle = useMemo(() => nodeSubtitle(node), [node]);

  return (
    <div
      className={clsx(
        'pb-node',
        `pb-node--${node.type.toLowerCase()}`,
        selected && 'pb-node--selected',
        data.forbidden && 'pb-node--forbidden',
        data.related && !selected && 'pb-node--related',
        data.dataflowRelated && !selected && 'pb-node--dataflow-related',
      )}
      data-type={node.type}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="pb-node__handle"
      />
      <div className="pb-node__header">
        <div
          className="pb-node__chip"
          style={{
            background: meta.bgVar,
            color: meta.fgVar,
          }}
        >
          <Icon name={meta.iconName} size={12} />
          <span>{meta.shortLabel}</span>
        </div>
        <div className="pb-node__name">{node.name || 'Untitled'}</div>
      </div>
      {subtitle && (
        <div className="pb-node__subtitle pb-mono">{subtitle}</div>
      )}
      {node.type === 'API_ENDPOINT' && (
        <ApiEndpointPreview data={node.data as { method?: string; allowedRoles?: string[] }} />
      )}
      {node.type === 'DATA_MODEL' && (
        <DataModelPreview data={node.data as { fields?: Array<{ name: string; type: string }> }} />
      )}
      <SlotsPreview node={node} />
      <Handle
        type="source"
        position={Position.Right}
        className="pb-node__handle"
      />
    </div>
  );
}

function ApiEndpointPreview({
  data,
}: {
  data: { method?: string; allowedRoles?: string[] };
}) {
  if (!data.allowedRoles || data.allowedRoles.length === 0) return null;
  return (
    <div className="pb-node__roles">
      {data.allowedRoles.slice(0, 3).map((r) => (
        <Pill key={r} tone="neutral">
          {r}
        </Pill>
      ))}
      {data.allowedRoles.length > 3 && (
        <Pill tone="neutral">+{data.allowedRoles.length - 3}</Pill>
      )}
    </div>
  );
}

function DataModelPreview({
  data,
}: {
  data: { fields?: Array<{ name: string; type: string }> };
}) {
  const fields = data.fields ?? [];
  if (!fields.length) return null;
  return (
    <ul className="pb-node__fields">
      {fields.slice(0, 5).map((f) => (
        <li key={f.name}>
          <span>{f.name}</span>
          <span className="pb-mono">{f.type}</span>
        </li>
      ))}
      {fields.length > 5 && (
        <li className="pb-node__fields-more">+{fields.length - 5} more</li>
      )}
    </ul>
  );
}

const SOURCE_ICON: Record<SlotSourceKind, string> = {
  literal: 'type',
  userInput: 'pencil',
  route: 'link-2',
  cache: 'database',
  binding: 'arrow-down-right',
  apiResponse: 'cloud',
};

const SOURCE_TONE: Record<SlotSourceKind, 'wired' | 'plain'> = {
  literal: 'plain',
  userInput: 'plain',
  route: 'plain',
  cache: 'plain',
  binding: 'wired',
  apiResponse: 'wired',
};

function SlotsPreview({ node }: { node: AnyNode }) {
  // Slots only live on Screen / UI Element / Action right now.
  if (node.type !== 'SCREEN' && node.type !== 'UI_ELEMENT' && node.type !== 'ACTION') {
    return null;
  }
  const slots = ((node.data as { slots?: Slot[] }).slots ?? []) as Slot[];
  if (slots.length === 0) return null;

  const visible = slots.slice(0, 4);
  const overflow = slots.length - visible.length;

  return (
    <ul className="pb-node__slots">
      {visible.map((s) => {
        const tone = SOURCE_TONE[s.source.kind];
        return (
          <li
            key={s.id}
            className={clsx(
              'pb-node__slot',
              tone === 'wired' && 'pb-node__slot--wired',
            )}
            title={`${s.name} (${s.type}) — from ${s.source.kind}`}
          >
            <Icon
              name={SOURCE_ICON[s.source.kind]}
              size={10}
              className="pb-node__slot-icon"
            />
            <span className="pb-node__slot-name">{s.name || '—'}</span>
            <span className="pb-node__slot-type pb-mono">{s.type}</span>
          </li>
        );
      })}
      {overflow > 0 && (
        <li className="pb-node__fields-more">+{overflow} more</li>
      )}
    </ul>
  );
}

export const BrainerNode = memo(BrainerNodeImpl);
