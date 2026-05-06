import clsx from 'clsx';
import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type {
  AnyNode,
  NodeType,
  Slot,
  SlotSource,
  SlotSourceKind,
} from '../../api/types';
import { Icon } from '../../components/Icon';
import { Pill } from '../../components/Pill';
import { NODE_META } from '../../lib/nodeMeta';
import { useGraphStore } from '../../store/graphStore';

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
  /** API_ENDPOINT only: field paths from incoming CALLS request bindings.
   *  Each becomes a synthetic anchor row so request wires can land on the
   *  exact field instead of the card edge. */
  requestBindingFields?: string[];
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
      data-node-id={node.id}
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
      {node.type === 'API_ENDPOINT' && (
        <ApiEndpointAnchors
          nodeId={node.id}
          requestFields={data.requestBindingFields ?? []}
        />
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
  computed: 'braces',
};

const SOURCE_TONE: Record<SlotSourceKind, 'wired' | 'plain'> = {
  literal: 'plain',
  userInput: 'plain',
  route: 'plain',
  cache: 'plain',
  binding: 'wired',
  apiResponse: 'wired',
  computed: 'plain',
};

function SlotsPreview({ node }: { node: AnyNode }) {
  // Hooks must run unconditionally — bail-out happens after.
  const allNodes = useGraphStore((s) => s.nodes);

  if (node.type !== 'SCREEN' && node.type !== 'UI_ELEMENT' && node.type !== 'ACTION') {
    return null;
  }
  const slots = ((node.data as { slots?: Slot[] }).slots ?? []) as Slot[];
  if (slots.length === 0) return null;

  // Render every slot. The wire overlay anchors lines to each row's DOM
  // rect, so a hidden slot would have nowhere to land — visualisation
  // beats the small height savings of a "+N more" row.
  return (
    <ul className="pb-node__slots">
      {slots.map((s) => {
        const tone = SOURCE_TONE[s.source.kind];
        const target = resolveSourceTarget(s.source, allNodes);
        const titleSuffix = target ? ` ← ${target.full}` : '';
        return (
          <li
            key={s.id}
            className={clsx(
              'pb-node__slot',
              tone === 'wired' && 'pb-node__slot--wired',
            )}
            title={`${s.name} (${s.type}) — from ${s.source.kind}${titleSuffix}`}
            data-anchor={`${node.id}::${s.id}`}
          >
            <Icon
              name={SOURCE_ICON[s.source.kind]}
              size={10}
              className="pb-node__slot-icon"
            />
            <span className="pb-node__slot-name">{s.name || '—'}</span>
            <span className="pb-node__slot-type pb-mono">{s.type}</span>
            {target && (
              <span
                className={clsx(
                  'pb-node__slot-target',
                  'pb-mono',
                  target.missing && 'pb-node__slot-target--missing',
                )}
              >
                ← {target.short}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Resolve a slot's wired source (binding / apiResponse) to a human-readable
 * target so it can be shown next to the slot name on the canvas card. Other
 * source kinds return null — they're self-contained, no cross-node target
 * to point at. `(missing)` is rendered for dangling refs so the user sees
 * exactly what to fix.
 */
function resolveSourceTarget(
  source: SlotSource,
  nodes: AnyNode[],
): { short: string; full: string; missing?: boolean } | null {
  if (source.kind === 'binding') {
    if (!source.fromNodeId) return null; // empty in-progress; warning panel covers it
    const fromNode = nodes.find((n) => n.id === source.fromNodeId);
    if (!fromNode) {
      return { short: '(missing node)', full: '(missing node)', missing: true };
    }
    const fromSlots = ((fromNode.data as { slots?: Slot[] }).slots ?? []) as Slot[];
    const fromSlot = fromSlots.find((sl) => sl.id === source.fromSlotId);
    if (!fromSlot) {
      return {
        short: `${fromNode.name}.(missing slot)`,
        full: `${fromNode.name}.(missing slot)`,
        missing: true,
      };
    }
    return {
      short: `${fromNode.name}.${fromSlot.name}`,
      full: `${fromNode.name}.${fromSlot.name}`,
    };
  }
  if (source.kind === 'apiResponse') {
    if (!source.endpointId) return null;
    const ep = nodes.find((n) => n.id === source.endpointId);
    if (!ep) {
      return {
        short: '(missing endpoint)',
        full: '(missing endpoint)',
        missing: true,
      };
    }
    const path = source.jsonPath?.trim();
    return path
      ? { short: `${ep.name} ${path}`, full: `${ep.name} ${path}` }
      : { short: ep.name, full: ep.name };
  }
  return null;
}

/**
 * Anchor rows for API endpoint cards. Endpoints don't have user-defined
 * slots, but the wire overlay needs concrete DOM endpoints for two kinds
 * of wires that touch them: apiResponse slot bindings emanate from the
 * endpoint (single "response" row), and CALLS request bindings land on
 * individual request fields (one row per field).
 */
function ApiEndpointAnchors({
  nodeId,
  requestFields,
}: {
  nodeId: string;
  requestFields: string[];
}) {
  return (
    <ul className="pb-node__endpoint-anchors">
      {requestFields.map((field) => (
        <li
          key={`req:${field}`}
          className="pb-node__endpoint-anchor pb-node__endpoint-anchor--request"
          data-anchor={`${nodeId}::request:${field}`}
          title={`request field: ${field}`}
        >
          <Icon name="arrow-down-right" size={10} className="pb-node__slot-icon" />
          <span className="pb-node__slot-name">req.{field}</span>
        </li>
      ))}
      <li
        className="pb-node__endpoint-anchor pb-node__endpoint-anchor--response"
        data-anchor={`${nodeId}::response`}
      >
        <Icon name="cloud" size={10} className="pb-node__slot-icon" />
        <span className="pb-node__slot-name">response</span>
      </li>
    </ul>
  );
}

export const BrainerNode = memo(BrainerNodeImpl);
