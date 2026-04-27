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
] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];

export const FIELD_TYPES = [
  'string',
  'number',
  'date',
  'file',
  'boolean',
  'enum',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

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
// Node data shapes
// ---------------------------------------------------------------------------

export type ScreenData = {
  description?: string;
};

export type UiElementData = {
  kind: UiElementKind;
  screenId: string;
  label?: string;
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

export interface BranchNodeDiff {
  nodeId: string;
  operation: ChangeOperation;
  snapshot: AnyNode | null;
}

export interface BranchEdgeDiff {
  edgeId: string;
  operation: ChangeOperation;
  snapshot: Edge | null;
}

export interface BranchDiff {
  nodes: BranchNodeDiff[];
  edges: BranchEdgeDiff[];
}

export interface MergeConflict {
  entityType: 'node' | 'edge';
  entityId: string;
  sourceOperation: ChangeOperation;
  targetOperation: ChangeOperation;
  sourceSnapshot: AnyNode | Edge | null;
  targetSnapshot: AnyNode | Edge | null;
}

export interface MergeResult {
  conflicts: MergeConflict[];
  merged: boolean;
}

export interface CreateBranchInput {
  name: string;
  description?: string;
  parentId?: string;
}

export interface ResolveMergeInput {
  sourceBranchId: string;
  resolutions: Array<{
    entityType: 'node' | 'edge';
    entityId: string;
    useSource: boolean;
  }>;
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
