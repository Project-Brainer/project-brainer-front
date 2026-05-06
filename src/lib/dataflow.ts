/**
 * Compute the set of nodes that participate in the same data-flow context
 * as the given node. Used by the canvas to subtly highlight everything a
 * selected node either consumes data from or feeds data to, so the user
 * can see "what's wired into this".
 *
 * Includes:
 *  - nodes whose slots reference `selected` via binding source
 *  - nodes that `selected`'s slots reference via binding source
 *  - API endpoints `selected` listens to via apiResponse source, and the
 *    nodes that listen to `selected`'s response if selected is an endpoint
 *  - source/target peers on CALLS edges that carry requestBindings
 */
import type {
  AnyNode,
  CallsEdgeData,
  Edge,
  Slot,
  SlotSource,
} from '../api/types';

function nodeSlots(node: AnyNode): Slot[] {
  if (!node) return [];
  const slots = (node.data as { slots?: Slot[] }).slots;
  return Array.isArray(slots) ? slots : [];
}

function bindingTarget(source: SlotSource): string | null {
  if (source.kind === 'binding') return source.fromNodeId;
  if (source.kind === 'apiResponse') return source.endpointId;
  return null;
}

export function relatedNodeIds(
  selectedId: string,
  nodes: AnyNode[],
  edges: Edge[],
): Set<string> {
  const related = new Set<string>();
  const selected = nodes.find((n) => n.id === selectedId);
  if (!selected) return related;

  // Outgoing data deps from selected — its slots referencing other nodes.
  for (const slot of nodeSlots(selected)) {
    const target = bindingTarget(slot.source);
    if (target && target !== selectedId) related.add(target);
  }

  // Incoming — other nodes whose slots reference selected.
  for (const node of nodes) {
    if (node.id === selectedId) continue;
    for (const slot of nodeSlots(node)) {
      const target = bindingTarget(slot.source);
      if (target === selectedId) {
        related.add(node.id);
        break;
      }
    }
  }

  // CALLS request bindings — both ends of the edge are dataflow peers when
  // the binding payload is non-empty.
  for (const edge of edges) {
    if (edge.type !== 'CALLS') continue;
    const data = (edge.data as CallsEdgeData) ?? null;
    const bindings = data?.requestBindings ?? [];
    if (bindings.length === 0) continue;
    if (edge.sourceId === selectedId) related.add(edge.targetId);
    else if (edge.targetId === selectedId) related.add(edge.sourceId);
  }

  return related;
}
