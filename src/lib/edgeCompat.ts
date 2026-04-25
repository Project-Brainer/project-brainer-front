/**
 * Edge compatibility matrix — mirrors the server-side rules from §2.4.
 * The server is authoritative; this is only used for instant client feedback
 * (greying out forbidden drop targets, showing the type picker on drop).
 */

import type { EdgeType, NodeType } from '../api/types';

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
};

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
  }
}
