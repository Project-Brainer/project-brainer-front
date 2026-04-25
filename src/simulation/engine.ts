/**
 * Client-side simulation engine — pure reducer over the graph state.
 *
 * The backend doesn't execute anything in MVP, so this module derives runtime
 * behaviour entirely from the persisted nodes and edges.
 *
 * Concepts:
 *  - `SimState` is a snapshot: current screen, mock entity instances, mock
 *    API call log, last triggered action.
 *  - `simulateUiClick(...)` walks edges starting from a UI element and returns
 *    a new `SimState` plus a list of `SimEvent`s describing what happened.
 *  - Each edge type has a small handler. Adding new edge types only requires
 *    adding a handler to the dispatch map.
 *
 * The engine is intentionally side-effect free so it can be unit-tested and
 * potentially run on the server later without changes.
 */

import type {
  ActionData,
  AnyNode,
  ApiEndpointData,
  DataModelData,
  DataModelField,
  Edge,
  EdgeType,
  NodeType,
  RoleData,
  UiElementData,
} from '../api/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimGraph {
  nodes: AnyNode[];
  edges: Edge[];
}

export interface SimState {
  /** Current screen the simulator is rendering. */
  currentScreenId: string | null;
  /** Mock instances per data model id. */
  entities: Record<string, MockEntity[]>;
  /** Last api responses, keyed by endpoint id. */
  apiResponses: Record<string, MockApiResponse>;
  /** Currently active role id (or special token for "none"). */
  currentRoleId: string | null;
  /** Lifetime log — useful for the UI side panel. */
  log: SimLogEntry[];
  /** Counter so newly inserted entities get unique ids. */
  seq: number;
}

export interface MockEntity {
  id: string;
  values: Record<string, unknown>;
}

export interface MockApiResponse {
  endpointId: string;
  status: 'ok' | 'forbidden' | 'error';
  payload: unknown;
  at: number;
}

export type SimLogEntry =
  | { kind: 'navigate'; screenId: string; at: number }
  | { kind: 'action'; actionId: string; at: number }
  | {
      kind: 'api';
      endpointId: string;
      status: 'ok' | 'forbidden' | 'error';
      at: number;
    }
  | {
      kind: 'mutation';
      modelId: string;
      operation: 'insert' | 'update' | 'delete';
      at: number;
    }
  | { kind: 'restricted'; nodeId: string; at: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function findFirstScreen(graph: SimGraph): string | null {
  const screens = graph.nodes.filter((n) => n.type === 'SCREEN');
  return screens[0]?.id ?? null;
}

export function getNode(graph: SimGraph, id: string): AnyNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

export function outgoing(
  graph: SimGraph,
  sourceId: string,
  type?: EdgeType,
): Edge[] {
  return graph.edges.filter(
    (e) => e.sourceId === sourceId && (!type || e.type === type),
  );
}

export function incoming(
  graph: SimGraph,
  targetId: string,
  type?: EdgeType,
): Edge[] {
  return graph.edges.filter(
    (e) => e.targetId === targetId && (!type || e.type === type),
  );
}

/** UI elements that belong to a screen (via UI_ELEMENT.data.screenId). */
export function uiElementsForScreen(
  graph: SimGraph,
  screenId: string,
): AnyNode[] {
  return graph.nodes.filter((n) => {
    if (n.type !== 'UI_ELEMENT') return false;
    const d = n.data as UiElementData;
    return d.screenId === screenId;
  });
}

/** Roles available in the project (ROLE nodes). */
export function listRoles(graph: SimGraph): AnyNode[] {
  return graph.nodes.filter((n) => n.type === 'ROLE');
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export function initialSimState(graph: SimGraph): SimState {
  const entities: Record<string, MockEntity[]> = {};
  for (const n of graph.nodes) {
    if (n.type === 'DATA_MODEL') {
      entities[n.id] = sampleEntities(n.data as DataModelData, 3);
    }
  }
  return {
    currentScreenId: findFirstScreen(graph),
    entities,
    apiResponses: {},
    currentRoleId: null,
    log: [],
    seq: 100,
  };
}

// ---------------------------------------------------------------------------
// Role / restriction
// ---------------------------------------------------------------------------

/**
 * Returns true if the given node is forbidden under the current role.
 * Walks RESTRICTED_BY edges from `nodeId` and checks ROLE node names/ids
 * against the current role.
 */
export function isRestricted(
  graph: SimGraph,
  state: SimState,
  nodeId: string,
): boolean {
  const restrictions = outgoing(graph, nodeId, 'RESTRICTED_BY');
  if (restrictions.length === 0) {
    // For API endpoints, also honour data.allowedRoles.
    const node = getNode(graph, nodeId);
    if (node?.type === 'API_ENDPOINT') {
      const d = node.data as ApiEndpointData;
      if (!d.allowedRoles?.length) return false;
      return !roleMatches(graph, state, d.allowedRoles);
    }
    return false;
  }
  // RESTRICTED_BY edges grant access — current role must match at least one.
  if (!state.currentRoleId) return true;
  const allowed = restrictions.map((r) => r.targetId);
  return !allowed.includes(state.currentRoleId);
}

function roleMatches(
  graph: SimGraph,
  state: SimState,
  allowedNamesOrIds: string[],
): boolean {
  if (!state.currentRoleId) return false;
  const role = getNode(graph, state.currentRoleId);
  if (!role) return false;
  return (
    allowedNamesOrIds.includes(role.id) ||
    allowedNamesOrIds.includes(role.name)
  );
}

// ---------------------------------------------------------------------------
// Mock data generation (for simulator only)
// ---------------------------------------------------------------------------

function sampleEntities(
  model: DataModelData,
  count: number,
): MockEntity[] {
  const out: MockEntity[] = [];
  for (let i = 0; i < count; i++) {
    const values: Record<string, unknown> = {};
    for (const field of model.fields ?? []) {
      values[field.name] = sampleValue(field, i);
    }
    out.push({ id: `mock-${i + 1}`, values });
  }
  return out;
}

function sampleValue(field: DataModelField, i: number): unknown {
  switch (field.type) {
    case 'string':
      return `${field.name} ${i + 1}`;
    case 'number':
      return (i + 1) * 7;
    case 'date':
      return new Date(2026, 0, i + 1).toISOString();
    case 'boolean':
      return i % 2 === 0;
    case 'file':
      return `/files/${field.name}-${i + 1}.pdf`;
    case 'enum':
      return field.enumValues?.[i % (field.enumValues.length || 1)] ?? null;
  }
}

/** Generate a sample response payload from a JSON schema-ish description. */
export function deriveSamplePayload(
  schema: unknown,
  state: SimState,
  graph: SimGraph,
): unknown {
  if (schema === null || schema === undefined) return null;
  if (Array.isArray(schema)) {
    return schema.map((s) => deriveSamplePayload(s, state, graph));
  }
  if (typeof schema !== 'object') {
    // primitive — interpret string token like "string", "number"...
    if (typeof schema === 'string') {
      return primitiveSample(schema);
    }
    return schema;
  }
  // object — clone with each value sampled recursively
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    out[key] = deriveSamplePayload(value, state, graph);
  }
  return out;
}

function primitiveSample(s: string): unknown {
  switch (s.toLowerCase()) {
    case 'string':
      return 'sample';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'date':
      return new Date().toISOString();
    default:
      return s;
  }
}

// ---------------------------------------------------------------------------
// Reducer — runs on a UI element click / form submit
// ---------------------------------------------------------------------------

export interface SimEvent {
  /** Human-friendly message for the activity feed. */
  message: string;
  kind: SimLogEntry['kind'];
  nodeId?: string;
}

export interface SimResult {
  state: SimState;
  events: SimEvent[];
}

const MAX_DEPTH = 8;

/**
 * Trigger whatever is wired to this UI element.
 * - Resolves TRIGGERS edges → ACTION nodes.
 * - For each action: resolves CALLS → API endpoints, and NAVIGATES → screens.
 * - Mutations cascade through UPDATES edges.
 */
export function simulateUiActivation(
  graph: SimGraph,
  state: SimState,
  uiElementId: string,
): SimResult {
  let next = state;
  const events: SimEvent[] = [];
  const ts = Date.now();

  const ui = getNode(graph, uiElementId);
  if (!ui) return { state, events };

  if (isRestricted(graph, state, uiElementId)) {
    next = appendLog(next, { kind: 'restricted', nodeId: uiElementId, at: ts });
    events.push({
      kind: 'restricted',
      nodeId: uiElementId,
      message: `${ui.name} is forbidden for the current role.`,
    });
    return { state: next, events };
  }

  // 1. UI -> ACTION
  const triggerEdges = outgoing(graph, uiElementId, 'TRIGGERS');
  // 2. UI -> API_ENDPOINT directly via WRITES (form submits)
  const writeEdges = outgoing(graph, uiElementId, 'WRITES');
  // 3. UI -> API_ENDPOINT via READS (loads list etc — fire on mount usually,
  //    but expose here for buttons that "refresh")
  const readEdges = outgoing(graph, uiElementId, 'READS');

  for (const edge of triggerEdges) {
    const r = runAction(graph, next, edge.targetId, 0);
    next = r.state;
    events.push(...r.events);
  }
  for (const edge of writeEdges) {
    const r = callEndpoint(graph, next, edge.targetId, 0);
    next = r.state;
    events.push(...r.events);
  }
  for (const edge of readEdges) {
    const r = callEndpoint(graph, next, edge.targetId, 0);
    next = r.state;
    events.push(...r.events);
  }

  return { state: next, events };
}

/** Runs READS edges from a screen and refreshes their endpoints. */
export function simulateScreenEnter(
  graph: SimGraph,
  state: SimState,
  screenId: string,
): SimResult {
  const events: SimEvent[] = [];
  let next = state;
  const reads = outgoing(graph, screenId, 'READS');
  for (const edge of reads) {
    const r = callEndpoint(graph, next, edge.targetId, 0);
    next = r.state;
    events.push(...r.events);
  }
  return { state: next, events };
}

function runAction(
  graph: SimGraph,
  state: SimState,
  actionId: string,
  depth: number,
): SimResult {
  if (depth >= MAX_DEPTH) return { state, events: [] };
  const events: SimEvent[] = [];
  const action = getNode(graph, actionId);
  if (!action) return { state, events };

  if (isRestricted(graph, state, actionId)) {
    const next = appendLog(state, {
      kind: 'restricted',
      nodeId: actionId,
      at: Date.now(),
    });
    events.push({
      kind: 'restricted',
      nodeId: actionId,
      message: `Action "${action.name}" is forbidden for the current role.`,
    });
    return { state: next, events };
  }

  let next = appendLog(state, {
    kind: 'action',
    actionId,
    at: Date.now(),
  });
  events.push({
    kind: 'action',
    nodeId: actionId,
    message: `Action: ${action.name}`,
  });

  // CALLS edges → endpoints
  for (const edge of outgoing(graph, actionId, 'CALLS')) {
    const r = callEndpoint(graph, next, edge.targetId, depth + 1);
    next = r.state;
    events.push(...r.events);
  }

  // NAVIGATES edges → screen change
  for (const edge of outgoing(graph, actionId, 'NAVIGATES')) {
    const screen = getNode(graph, edge.targetId);
    if (!screen) continue;
    if (isRestricted(graph, next, screen.id)) {
      next = appendLog(next, {
        kind: 'restricted',
        nodeId: screen.id,
        at: Date.now(),
      });
      events.push({
        kind: 'restricted',
        nodeId: screen.id,
        message: `Navigation to "${screen.name}" is forbidden for the current role.`,
      });
      continue;
    }
    next = {
      ...next,
      currentScreenId: screen.id,
      log: [
        ...next.log,
        { kind: 'navigate', screenId: screen.id, at: Date.now() },
      ],
    };
    events.push({
      kind: 'navigate',
      nodeId: screen.id,
      message: `Navigate → ${screen.name}`,
    });
    // Auto-fire READS for the new screen.
    const enter = simulateScreenEnter(graph, next, screen.id);
    next = enter.state;
    events.push(...enter.events);
  }

  // ACTION kind hint also affects mock state — e.g. "delete" pulls the first
  // entity from any model the action's endpoints UPDATE.
  return { state: next, events };
}

function callEndpoint(
  graph: SimGraph,
  state: SimState,
  endpointId: string,
  depth: number,
): SimResult {
  if (depth >= MAX_DEPTH) return { state, events: [] };
  const events: SimEvent[] = [];
  const endpoint = getNode(graph, endpointId);
  if (!endpoint) return { state, events };

  if (isRestricted(graph, state, endpointId)) {
    const next = appendLog(
      {
        ...state,
        apiResponses: {
          ...state.apiResponses,
          [endpointId]: {
            endpointId,
            status: 'forbidden',
            payload: { error: 'forbidden' },
            at: Date.now(),
          },
        },
      },
      { kind: 'api', endpointId, status: 'forbidden', at: Date.now() },
    );
    events.push({
      kind: 'api',
      nodeId: endpointId,
      message: `${endpoint.name} → 403 forbidden`,
    });
    return { state: next, events };
  }

  const data = endpoint.data as ApiEndpointData;
  const payload = deriveSamplePayload(data.response ?? null, state, graph);

  let next: SimState = {
    ...state,
    apiResponses: {
      ...state.apiResponses,
      [endpointId]: {
        endpointId,
        status: 'ok',
        payload,
        at: Date.now(),
      },
    },
  };
  next = appendLog(next, {
    kind: 'api',
    endpointId,
    status: 'ok',
    at: Date.now(),
  });
  events.push({
    kind: 'api',
    nodeId: endpointId,
    message: `${endpoint.name} (${data.method} ${data.path}) → 200`,
  });

  // UPDATES edges — model mutations & screen refreshes.
  for (const edge of outgoing(graph, endpointId, 'UPDATES')) {
    const target = getNode(graph, edge.targetId);
    if (!target) continue;
    if (target.type === 'DATA_MODEL') {
      next = mutateModel(next, target, data.method);
      events.push({
        kind: 'mutation',
        nodeId: target.id,
        message: `Mock ${target.name} ${methodOperation(data.method)}d`,
      });
    } else if (target.type === 'SCREEN') {
      // Notify the UI to re-fetch screen reads (ours is already updated by
      // updating apiResponses; the React layer reads from state).
      events.push({
        kind: 'mutation',
        nodeId: target.id,
        message: `Refreshed screen "${target.name}"`,
      });
    }
  }

  return { state: next, events };
}

function methodOperation(method: string): 'insert' | 'update' | 'delete' {
  switch (method) {
    case 'POST':
      return 'insert';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'update';
  }
}

function mutateModel(state: SimState, model: AnyNode, method: string): SimState {
  const op = methodOperation(method);
  const list = state.entities[model.id] ?? [];
  const seq = state.seq + 1;
  let next = list;

  if (op === 'insert') {
    const fields = (model.data as DataModelData).fields ?? [];
    const values: Record<string, unknown> = {};
    for (const f of fields) {
      values[f.name] = sampleValue(f, list.length);
    }
    next = [...list, { id: `mock-${seq}`, values }];
  } else if (op === 'delete') {
    next = list.slice(1);
  } else if (op === 'update' && list.length > 0) {
    const [first, ...rest] = list;
    next = [
      {
        id: first.id,
        values: { ...first.values, _updatedAt: new Date().toISOString() },
      },
      ...rest,
    ];
  }
  return {
    ...state,
    seq,
    entities: { ...state.entities, [model.id]: next },
    log: [
      ...state.log,
      { kind: 'mutation', modelId: model.id, operation: op, at: Date.now() },
    ],
  };
}

function appendLog(state: SimState, entry: SimLogEntry): SimState {
  return { ...state, log: [...state.log, entry] };
}

// ---------------------------------------------------------------------------
// Selectors used by the UI
// ---------------------------------------------------------------------------

export interface ScreenViewModel {
  screen: AnyNode;
  uiElements: Array<{
    node: AnyNode;
    forbidden: boolean;
  }>;
  reads: Array<{ endpoint: AnyNode; response?: MockApiResponse }>;
  forbidden: boolean;
}

export function buildScreenViewModel(
  graph: SimGraph,
  state: SimState,
  screenId: string,
): ScreenViewModel | null {
  const screen = getNode(graph, screenId);
  if (!screen || screen.type !== 'SCREEN') return null;
  const elems = uiElementsForScreen(graph, screenId).map((node) => ({
    node,
    forbidden: isRestricted(graph, state, node.id),
  }));
  const readEdges = outgoing(graph, screenId, 'READS');
  const reads = readEdges
    .map((e) => {
      const ep = getNode(graph, e.targetId);
      if (!ep) return null;
      return {
        endpoint: ep,
        response: state.apiResponses[ep.id],
      };
    })
    .filter(Boolean) as ScreenViewModel['reads'];

  return {
    screen,
    uiElements: elems,
    reads,
    forbidden: isRestricted(graph, state, screenId),
  };
}

/** Resolve the data model bound to an endpoint via UPDATES, if any. */
export function findUpdatedModel(
  graph: SimGraph,
  endpointId: string,
): AnyNode | null {
  const edges = outgoing(graph, endpointId, 'UPDATES');
  for (const e of edges) {
    const t = getNode(graph, e.targetId);
    if (t?.type === 'DATA_MODEL') return t;
  }
  return null;
}

/** What kind of node this is — used to route UI rendering. */
export function nodeKind(node: AnyNode): NodeType {
  return node.type;
}

/** Get the role node for the current role id. */
export function getCurrentRole(
  graph: SimGraph,
  state: SimState,
): AnyNode | null {
  if (!state.currentRoleId) return null;
  const r = getNode(graph, state.currentRoleId);
  return r?.type === 'ROLE' ? r : null;
}

/** Compatibility shim — silences TS when other files import these. */
export type { ActionData, RoleData };
