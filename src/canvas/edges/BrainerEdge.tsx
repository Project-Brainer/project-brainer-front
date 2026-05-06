import clsx from 'clsx';
import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from 'reactflow';
import type { Edge, EdgeType, RespondsWithEdgeData } from '../../api/types';
import { edgeTypeLabel } from '../../lib/edgeCompat';

export interface BrainerEdgeData {
  edge: Edge;
}

function dashForType(type: EdgeType): string | undefined {
  switch (type) {
    case 'READS':
    case 'WRITES':
    case 'UPDATES':
      return '4 4';
    case 'RESTRICTED_BY':
      return '1 4';
    case 'RESPONDS_WITH':
      return '6 3';
    default:
      return undefined; // solid
  }
}

const RESPONDS_WITH_KIND_LABELS: Record<string, string> = {
  navigate: 'navigate',
  refresh: 'refresh',
  show: 'show',
  run: 'run',
};

function BrainerEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<BrainerEdgeData>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const edge = data?.edge;
  const type = edge?.type ?? 'OPENS';
  const dash = dashForType(type);

  // RESPONDS_WITH gets a colour based on outcome (green = success, red =
  // error) so success/error branches are distinguishable at a glance.
  const respondsData = type === 'RESPONDS_WITH'
    ? (edge?.data as RespondsWithEdgeData | undefined)
    : undefined;
  const outcomeColor = respondsData
    ? respondsData.outcome === 'error'
      ? 'var(--status-error, #d33)'
      : 'var(--status-success, #2a8)'
    : null;

  const stroke = selected
    ? 'var(--accent)'
    : (outcomeColor ?? 'var(--neutral-5)');

  let label: string;
  if (edge?.label) {
    label = edge.label;
  } else if (respondsData) {
    const kind = RESPONDS_WITH_KIND_LABELS[respondsData.kind] ?? respondsData.kind;
    label = `${kind} · on ${respondsData.outcome}`;
  } else {
    label = edgeTypeLabel(type);
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd="url(#pb-arrow)"
        style={{
          stroke,
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: dash,
          transition: 'stroke 120ms',
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={clsx('pb-edge-label', selected && 'pb-edge-label--selected')}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const BrainerEdge = memo(BrainerEdgeImpl);
