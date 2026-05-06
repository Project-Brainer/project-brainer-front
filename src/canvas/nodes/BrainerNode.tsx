import clsx from 'clsx';
import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { AnyNode, NodeType } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Pill } from '../../components/Pill';
import { NODE_META } from '../../lib/nodeMeta';

export interface BrainerNodeData {
  node: AnyNode;
  selected?: boolean;
  forbidden?: boolean;
  /** True if this node shares a data-flow context with the selected node
   *  (incoming/outgoing slot bindings, apiResponse listeners, CALLS request
   *  bindings) — soft-highlights it on the canvas. */
  related?: boolean;
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
        data.related && !selected && 'pb-node--dataflow-related',
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

export const BrainerNode = memo(BrainerNodeImpl);
