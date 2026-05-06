/**
 * Backend contract types for project-brainer-back.
 *
 * Mirrors the contract documented in the build prompt — keep names and shapes
 * exact. If the backend Swagger updates, regenerate via openapi codegen.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const NODE_TYPES = [
  'SCREEN',
  'UI_ELEMENT',
  'DATA_MODEL',
  'API_ENDPOINT',
  'ACTION',
  'ROLE',
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const EDGE_TYPES = [
  'OPENS',
  'TRIGGERS',
  'CALLS',
  'READS',
  'WRITES',
  'UPDATES',
  'NAVIGATES',
  'RESTRICTED_BY',
  'RESPONDS_WITH',
] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];

/** Reaction kinds for an API endpoint's response edge. */
export const RESPONDS_WITH_KINDS = ['navigate', 'refresh', 'show', 'run'] as const;
export type RespondsWithKind = (typeof RESPONDS_WITH_KINDS)[number];

/** Which response branch the edge represents. */
export const RESPONSE_OUTCOMES = ['success', 'error'] as const;
export type ResponseOutcome = (typeof RESPONSE_OUTCOMES)[number];

export type RespondsWithEdgeData = {
  kind: RespondsWithKind;
  outcome: ResponseOutcome;
};

/** A single request-field binding on a CALLS edge. */
export type RequestBinding = {
  /** Dot path in the endpoint request schema, e.g. "email". */
  field: string;
  /** Slot id on the source node (the action). */
  sourceSlotId: string;
};

export type CallsEdgeData = {
  requestBindings?: RequestBinding[];
};

export const FIELD_TYPES = [
  'string',
  'number',
  'date',
  'file',
  'boolean',
  'enum',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** Schema field types for API Endpoint request/response schemas.
 *  Extends FieldType with object references to Data Models. */
export const SCHEMA_FIELD_TYPES = [
  'string',
  'number',
  'boolean',
  'date',
  'file',
  'enum',
  'object',
  'array<object>',
] as const;
export type SchemaFieldType = (typeof SCHEMA_FIELD_TYPES)[number];

export interface SchemaField {
  name: string;
  type: SchemaFieldType;
  required: boolean;
  /** Data Model name — only for 'object' / 'array<object>' types. */
  ref?: string;
  enumValues?: string[];
}

export const UI_ELEMENT_KINDS = [
  'button',
  'list',
  'form',
  'input',
  'modal',
] as const;
export type UiElementKind = (typeof UI_ELEMENT_KINDS)[number];

export const ACTION_KINDS = [
  'click',
  'submit',
  'open',
  'update',
  'delete',
] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export type Position = { x: number; y: number };
export type Viewport = { x: number; y: number; zoom: number };

// ---------------------------------------------------------------------------
// State slots — typed, named values attached to a node, fed from a source.
// ---------------------------------------------------------------------------

/** Types a state slot may declare (mirrors API Endpoint schema types). */
export const SLOT_TYPES = [
  'string',
  'number',
  'date',
  'file',
  'boolean',
  'enum',
  'object',
  'array<object>',
] as const;
export type SlotType = (typeof SLOT_TYPES)[number];

export const SLOT_SOURCE_KINDS = [
  'literal',
  'userInput',
  'route',
  'cache',
  'binding',
  'apiResponse',
  'computed',
] as const;
export type SlotSourceKind = (typeof SLOT_SOURCE_KINDS)[number];

export type SlotSource =
  | { kind: 'literal'; value: unknown }
  | { kind: 'userInput' }
  | { kind: 'route'; param: string }
  | { kind: 'cache'; key: string }
  /** Pull from another node's slot. */
  | { kind: 'binding'; fromNodeId: string; fromSlotId: string }
  /** Pull from an API endpoint's response (requires a RESPONDS_WITH edge
   *  from that endpoint to the slot's owning node). */
  | { kind: 'apiResponse'; endpointId: string; jsonPath?: string }
  /** String template referencing other slots on the SAME node via
   *  `${slotName}`. Stage 1: pure interpolation, no expressions. */
  | { kind: 'computed'; template: string };

export interface Slot {
  id: string;
  name: string;
  type: SlotType;
  /** Data Model name for object / array<object> slots. */
  ref?: string;
  source: SlotSource;
  description?: string;
}

// ---------------------------------------------------------------------------
// Node data shapes
// ---------------------------------------------------------------------------

export type ScreenData = {
  description?: string;
  slots?: Slot[];
};

export type UiElementData = {
  kind: UiElementKind;
  screenId: string;
  label?: string;
  slots?: Slot[];
};

export type DataModelField = {
  name: string;
  type: FieldType;
  required: boolean;
  enumValues?: string[];
};

export type DataModelData = {
  fields: DataModelField[];
};

export type ApiEndpointData = {
  method: HttpMethod;
  path: string;
  request?: unknown;
  response?: unknown;
  allowedRoles: string[];
};

export type ActionData = {
  kind: ActionKind;
  description?: string;
  slots?: Slot[];
};

export type RoleData = {
  description?: string;
};

export type NodeDataByType = {
  SCREEN: ScreenData;
  UI_ELEMENT: UiElementData;
  DATA_MODEL: DataModelData;
  API_ENDPOINT: ApiEndpointData;
  ACTION: ActionData;
  ROLE: RoleData;
};

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  description: string | null;
  viewport: Viewport;
  createdAt: string;
  updatedAt: string;
}

export interface Node<T extends NodeType = NodeType> {
  id: string;
  projectId: string;
  type: T;
  name: string;
  position: Position;
  data: T extends keyof NodeDataByType ? NodeDataByType[T] : Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type AnyNode = Node<NodeType>;

export interface Edge {
  id: string;
  projectId: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  label: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectGraph {
  project: Project;
  nodes: AnyNode[];
  edges: Edge[];
}

// ---------------------------------------------------------------------------
// Input DTOs
// ---------------------------------------------------------------------------

export interface CreateProjectInput {
  name: string;
  description?: string;
  viewport?: Viewport;
}

export type UpdateProjectInput = Partial<{
  name: string;
  description: string | null;
  viewport: Viewport;
}>;

export interface CreateNodeInput<T extends NodeType = NodeType> {
  type: T;
  name: string;
  position?: Position;
  data?: T extends keyof NodeDataByType ? NodeDataByType[T] : Record<string, unknown>;
}

export type UpdateNodeInput = Partial<{
  name: string;
  position: Position;
  data: Record<string, unknown>;
}>;

export interface CreateEdgeInput {
  sourceId: string;
  targetId: string;
  type: EdgeType;
  label?: string;
  data?: Record<string, unknown>;
}

export type UpdateEdgeInput = Partial<{
  label: string | null;
  data: Record<string, unknown>;
}>;

export interface ReplaceGraphBody {
  nodes: Array<{
    id?: string;
    type: NodeType;
    name: string;
    position?: Position;
    data?: Record<string, unknown>;
  }>;
  edges: Array<{
    id?: string;
    sourceId: string;
    targetId: string;
    type: EdgeType;
    label?: string;
    data?: Record<string, unknown>;
  }>;
  viewport?: Viewport;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  nodeId?: string | null;
  edgeId?: string | null;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export interface PromptStructured {
  project: { id: string; name: string; description?: string };
  screens: Array<{
    id: string;
    name: string;
    description?: string;
    uiElements: Array<{
      id: string;
      name: string;
      kind: string;
      triggersActionIds: string[];
    }>;
    opensScreenIds: string[];
    readsEndpointIds: string[];
    restrictedByRoleIds: string[];
  }>;
  dataModels: Array<{
    id: string;
    name: string;
    fields: Array<{
      name: string;
      type: string;
      required: boolean;
      enumValues?: string[];
    }>;
  }>;
  apiEndpoints: Array<{
    id: string;
    name: string;
    method: string;
    path: string;
    request?: unknown;
    response?: unknown;
    allowedRoles: string[];
    updatesIds: string[];
    restrictedByRoleIds: string[];
  }>;
  actions: Array<{
    id: string;
    name: string;
    kind: string;
    description?: string;
    triggeredByUiElementIds: string[];
    callsEndpointIds: string[];
    navigatesToScreenIds: string[];
  }>;
  roles: Array<{ id: string; name: string; description?: string }>;
  userFlows: Array<{
    screenId: string;
    screenName: string;
    steps: Array<{
      uiElementId: string;
      uiElementName: string;
      actionId: string;
      actionName: string;
      callsEndpointIds: string[];
      navigatesToScreenIds: string[];
    }>;
  }>;
}

export interface PromptResponse {
  prompt: string;
  structured: PromptStructured;
}

export interface PromptRequestBody {
  nodeIds?: string[];
  includeRelated?: boolean;
  branchId?: string;
  diffOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export type ChangeOperation = 'ADD' | 'MODIFY' | 'DELETE';

export interface Branch {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchCommit {
  id: string;
  branchId: string;
  message: string;
  graphSnapshot: { nodes: AnyNode[]; edges: Edge[] };
  createdAt: string;
}

/** Returned by GET /branches/:id/diff */
export interface BranchNodeDiff {
  nodeId: string;
  operation: ChangeOperation;
  snapshot: Record<string, unknown> | null;
}

export interface BranchEdgeDiff {
  edgeId: string;
  operation: ChangeOperation;
  snapshot: Record<string, unknown> | null;
}

/** Backend returns nodeChanges / edgeChanges (not nodes/edges) */
export interface BranchDiff {
  nodeChanges: BranchNodeDiff[];
  edgeChanges: BranchEdgeDiff[];
}

/** Returned by GET /branches/:id/graph and POST /branches/:id/graph */
export interface BranchGraph {
  nodes: AnyNode[];
  edges: Edge[];
  viewport?: Viewport;
}

/** Merge conflict shapes — backend returns separate node/edge arrays */
export interface MergeNodeConflict {
  nodeId: string;
  sourceOp: ChangeOperation;
  targetOp: ChangeOperation;
  sourceSnapshot: Record<string, unknown> | null;
  targetSnapshot: Record<string, unknown> | null;
}

export interface MergeEdgeConflict {
  edgeId: string;
  sourceOp: ChangeOperation;
  targetOp: ChangeOperation;
  sourceSnapshot: Record<string, unknown> | null;
  targetSnapshot: Record<string, unknown> | null;
}

/** Backend MergeResultDto */
export interface MergeResult {
  merged: boolean;
  nodeConflicts: MergeNodeConflict[];
  edgeConflicts: MergeEdgeConflict[];
}

export interface CreateBranchInput {
  name: string;
  description?: string;
  parentId?: string;
}

/** Backend ResolveMergeDto */
export interface ResolveMergeInput {
  targetBranchId: string;
  resolvedNodes: Array<{ nodeId: string; snapshot: Record<string, unknown> | null }>;
  resolvedEdges: Array<{ edgeId: string; snapshot: Record<string, unknown> | null }>;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export interface BackendErrorBody {
  statusCode: number;
  path: string;
  method: string;
  message: string | string[] | { message: string; errors: string[] };
  timestamp: string;
}

export class BackendError extends Error {
  readonly status: number;
  readonly body: BackendErrorBody | undefined;

  constructor(status: number, message: string, body?: BackendErrorBody) {
    super(message);
    this.name = 'BackendError';
    this.status = status;
    this.body = body;
  }
}
