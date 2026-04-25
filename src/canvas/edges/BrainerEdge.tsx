import clsx from 'clsx';
import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from 'reactflow';
import type { Edge, EdgeType } from '../../api/types';
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
    default:
      return undefined; // solid
  }
}

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
  const label = edge?.label ?? edgeTypeLabel(type);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd="url(#pb-arrow)"
        style={{
          stroke: selected ? 'var(--accent)' : 'var(--neutral-5)',
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
