/**
 * Highlight context around the selected node. Two tiers:
 *
 *  - `related` — every node connected to the selected one by ANY edge plus
 *    every node referenced by slot sources / consumed by CALLS request
 *    bindings. This is the "what's wired into this" set, and is shown with
 *    a subtle border accent so it's useful even on graphs that don't yet
 *    have data-flow markup.
 *  - `dataflow` — strict subset that participates in the data-flow graph
 *    (binding / apiResponse slot sources, CALLS edges with non-empty
 *    requestBindings). These get a stronger ring so the user can tell
 *    "where data actually goes" apart from "what is structurally near".
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
  if (source.kind === 'binding' && source.fromNodeId) return source.fromNodeId;
  if (source.kind === 'apiResponse' && source.endpointId) return source.endpointId;
  return null;
}

export interface RelatedSets {
  /** All nodes structurally or data-flow connected to the selected one. */
  related: Set<string>;
  /** Strict data-flow subset of `related`. */
  dataflow: Set<string>;
}

export function relatedNodeIds(
  selectedId: string,
  nodes: AnyNode[],
  edges: Edge[],
): RelatedSets {
  const related = new Set<string>();
  const dataflow = new Set<string>();
  const selected = nodes.find((n) => n.id === selectedId);
  if (!selected) return { related, dataflow };

  const addBoth = (id: string) => {
    related.add(id);
    dataflow.add(id);
  };

  // Outgoing data deps — selected's slots referencing other nodes.
  for (const slot of nodeSlots(selected)) {
    const target = bindingTarget(slot.source);
    if (target && target !== selectedId) addBoth(target);
  }

  // Incoming data deps — other nodes whose slots reference selected.
  for (const node of nodes) {
    if (node.id === selectedId) continue;
    for (const slot of nodeSlots(node)) {
      const target = bindingTarget(slot.source);
      if (target === selectedId) {
        addBoth(node.id);
        break;
      }
    }
  }

  for (const edge of edges) {
    const otherEnd =
      edge.sourceId === selectedId
        ? edge.targetId
        : edge.targetId === selectedId
          ? edge.sourceId
          : null;
    if (!otherEnd) continue;

    // Structural neighbour — always related.
    related.add(otherEnd);

    // CALLS edges with non-empty requestBindings count as data-flow too.
    if (edge.type === 'CALLS') {
      const data = (edge.data as CallsEdgeData) ?? null;
      if ((data?.requestBindings ?? []).some((b) => b.field || b.sourceSlotId)) {
        dataflow.add(otherEnd);
      }
    }
  }

  return { related, dataflow };
}
