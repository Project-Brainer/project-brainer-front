/**
 * Visual + factory metadata per NodeType.
 * Centralises icon, palette, and the default `data` shape used when a user
 * adds a fresh node from the toolbar.
 */

import type {
  AnyNode,
  NodeDataByType,
  NodeType,
} from '../api/types';

export interface NodeMeta {
  type: NodeType;
  label: string;
  shortLabel: string;
  iconName: string;          // lucide icon name (kebab-case)
  bgVar: string;             // background CSS var
  fgVar: string;             // foreground CSS var
  description: string;
}

export const NODE_META: Record<NodeType, NodeMeta> = {
  SCREEN: {
    type: 'SCREEN',
    label: 'Screen',
    shortLabel: 'Screen',
    iconName: 'monitor',
    bgVar: 'var(--node-screen-bg)',
    fgVar: 'var(--node-screen-fg)',
    description: 'A page or screen in the application.',
  },
  UI_ELEMENT: {
    type: 'UI_ELEMENT',
    label: 'UI Element',
    shortLabel: 'UI',
    iconName: 'mouse-pointer-2',
    bgVar: 'var(--node-ui-bg)',
    fgVar: 'var(--node-ui-fg)',
    description: 'A button, input, list, form, or modal on a screen.',
  },
  DATA_MODEL: {
    type: 'DATA_MODEL',
    label: 'Data model',
    shortLabel: 'Model',
    iconName: 'database',
    bgVar: 'var(--node-model-bg)',
    fgVar: 'var(--node-model-fg)',
    description: 'A typed entity with fields.',
  },
  API_ENDPOINT: {
    type: 'API_ENDPOINT',
    label: 'API endpoint',
    shortLabel: 'API',
    iconName: 'cloud',
    bgVar: 'var(--node-api-bg)',
    fgVar: 'var(--node-api-fg)',
    description: 'A backend route with method, path, and schemas.',
  },
  ACTION: {
    type: 'ACTION',
    label: 'Action',
    shortLabel: 'Action',
    iconName: 'zap',
    bgVar: 'var(--accent-soft)',
    fgVar: 'var(--accent)',
    description: 'A user or system interaction.',
  },
  ROLE: {
    type: 'ROLE',
    label: 'Role',
    shortLabel: 'Role',
    iconName: 'user-cog',
    bgVar: 'var(--node-role-bg)',
    fgVar: 'var(--node-role-fg)',
    description: 'A user role for access control.',
  },
};

/** Default `data` payload for a new node of the given type. */
export function defaultNodeData<T extends NodeType>(
  type: T,
): NodeDataByType[T] {
  let v: unknown;
  switch (type) {
    case 'SCREEN':
      v = { description: '' };
      break;
    case 'UI_ELEMENT':
      v = { kind: 'button', screenId: '', label: '' };
      break;
    case 'DATA_MODEL':
      v = { fields: [] };
      break;
    case 'API_ENDPOINT':
      v = {
        method: 'GET',
        path: '/',
        request: {},
        response: {},
        allowedRoles: [],
      };
      break;
    case 'ACTION':
      v = { kind: 'click', description: '' };
      break;
    case 'ROLE':
      v = { description: '' };
      break;
    default:
      throw new Error(`Unknown node type: ${type as string}`);
  }
  return v as NodeDataByType[T];
}

/** Default human-friendly name for a fresh node. */
export function defaultNodeName(type: NodeType, existingCount: number): string {
  const base = NODE_META[type].label;
  return `${base} ${existingCount + 1}`;
}

/** Narrow an AnyNode to a specific type. */
export function isNodeOfType<T extends NodeType>(
  node: AnyNode,
  type: T,
): node is AnyNode & { type: T; data: NodeDataByType[T] } {
  return node.type === type;
}
