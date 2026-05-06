/**
 * Edge compatibility matrix — mirrors the server-side rules from §2.4.
 * The server is authoritative; this is only used for instant client feedback
 * (greying out forbidden drop targets, showing the type picker on drop).
 */

import type { EdgeType, NodeType, RespondsWithKind } from '../api/types';

const RULES: Record<EdgeType, { sources: NodeType[]; targets: NodeType[] }> = {
  OPENS: {
    sources: ['SCREEN'],
    targets: ['SCREEN'],
  },
  TRIGGERS: {
    sources: ['UI_ELEMENT'],
    targets: ['ACTION'],
  },
  CALLS: {
    sources: ['ACTION'],
    targets: ['API_ENDPOINT'],
  },
  READS: {
    sources: ['SCREEN', 'UI_ELEMENT'],
    targets: ['API_ENDPOINT'],
  },
  WRITES: {
    sources: ['UI_ELEMENT'],
    targets: ['API_ENDPOINT'],
  },
  UPDATES: {
    sources: ['API_ENDPOINT'],
    targets: ['DATA_MODEL', 'SCREEN'],
  },
  NAVIGATES: {
    sources: ['ACTION'],
    targets: ['SCREEN'],
  },
  RESTRICTED_BY: {
    sources: ['SCREEN', 'UI_ELEMENT', 'API_ENDPOINT', 'ACTION', 'DATA_MODEL'],
    targets: ['ROLE'],
  },
  RESPONDS_WITH: {
    sources: ['API_ENDPOINT'],
    targets: ['SCREEN', 'UI_ELEMENT', 'ACTION', 'DATA_MODEL'],
  },
};

/**
 * Which target node types each RESPONDS_WITH kind may target. Mirrors the
 * server-side rules in graph.types.ts; used to filter the kind picker in
 * the inspector and to flip kind→sane-default when target type changes.
 */
export const RESPONDS_WITH_KIND_TARGETS: Record<RespondsWithKind, NodeType[]> = {
  navigate: ['SCREEN'],
  refresh: ['DATA_MODEL', 'SCREEN'],
  show: ['UI_ELEMENT'],
  run: ['ACTION'],
};

/** Pick a default RESPONDS_WITH kind given the target node type. */
export function defaultRespondsWithKind(target: NodeType): RespondsWithKind {
  for (const [kind, allowed] of Object.entries(RESPONDS_WITH_KIND_TARGETS) as Array<
    [RespondsWithKind, NodeType[]]
  >) {
    if (allowed.includes(target)) return kind;
  }
  return 'navigate';
}

/**
 * Default `data` payload for an edge — used when the user creates a new
 * edge through drag-connect or the type picker. Most edges have no
 * structured data, but RESPONDS_WITH requires `kind` + `outcome` (the
 * backend rejects an empty body), so we seed it from the target type.
 */
export function defaultEdgeData(
  type: EdgeType,
  targetType: NodeType,
): Record<string, unknown> | undefined {
  if (type === 'RESPONDS_WITH') {
    return { kind: defaultRespondsWithKind(targetType), outcome: 'success' };
  }
  return undefined;
}

/**
 * All edge types that are valid for a given source/target pair.
 * Returns [] if no edge type fits — drop should be rejected.
 */
export function allowedEdgeTypes(
  source: NodeType,
  target: NodeType,
): EdgeType[] {
  const allowed: EdgeType[] = [];
  for (const [type, rule] of Object.entries(RULES) as Array<
    [EdgeType, (typeof RULES)[EdgeType]]
  >) {
    if (rule.sources.includes(source) && rule.targets.includes(target)) {
      allowed.push(type);
    }
  }
  return allowed;
}

export function canConnect(source: NodeType, target: NodeType): boolean {
  return allowedEdgeTypes(source, target).length > 0;
}

/** Set of node types this source can target via any edge type. */
export function reachableTargets(source: NodeType): Set<NodeType> {
  const set = new Set<NodeType>();
  for (const rule of Object.values(RULES)) {
    if (rule.sources.includes(source)) {
      for (const t of rule.targets) set.add(t);
    }
  }
  return set;
}

export function edgeTypeLabel(type: EdgeType): string {
  switch (type) {
    case 'OPENS':
      return 'opens';
    case 'TRIGGERS':
      return 'triggers';
    case 'CALLS':
      return 'calls';
    case 'READS':
      return 'reads';
    case 'WRITES':
      return 'writes';
    case 'UPDATES':
      return 'updates';
    case 'NAVIGATES':
      return 'navigates';
    case 'RESTRICTED_BY':
      return 'restricted by';
    case 'RESPONDS_WITH':
      return 'responds with';
  }
}
