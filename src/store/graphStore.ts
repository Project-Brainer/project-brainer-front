/**
 * Core graph store — single source of truth for the active project.
 *
 * Architecture:
 *  - Mutations update the local store synchronously (optimistic UI).
 *  - Create/delete go through dedicated REST endpoints so the server can mint
 *    canonical ids; the store reconciles by replacing temp records.
 *  - All other edits (rename, move, data update, viewport) are persisted via
 *    a debounced `PUT /projects/:id/graph` call (~600ms).
 *  - `simulation` is mounted as a sibling slice but lives in its own file;
 *    only graph data lives here.
 */

import { create } from 'zustand';
import { edgesApi } from '../api/edges';
import { graphApi } from '../api/graph';
import { nodesApi } from '../api/nodes';
import { projectsApi } from '../api/projects';
import type {
  AnyNode,
  CreateEdgeInput,
  CreateNodeInput,
  Edge,
  EdgeType,
  NodeType,
  Position,
  Project,
  ProjectGraph,
  ReplaceGraphBody,
  Viewport,
} from '../api/types';
import { debounce } from '../lib/debounce';
import { defaultNodeData, defaultNodeName } from '../lib/nodeMeta';

const AUTOSAVE_MS = 600;

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface GraphState {
  project: Project | null;
  nodes: AnyNode[];
  edges: Edge[];

  loadingProjectId: string | null;
  loadError: string | null;

  saveStatus: SaveStatus;
  lastSaveError: string | null;
  lastSavedAt: number | null;

  // -------- lifecycle --------
  loadProject: (projectId: string) => Promise<void>;
  reset: () => void;

  // -------- node ops --------
  createNode: (input: {
    type: NodeType;
    position?: Position;
    name?: string;
  }) => Promise<AnyNode | null>;
  updateNode: (
    nodeId: string,
    patch: Partial<{
      name: string;
      position: Position;
      data: Record<string, unknown>;
    }>,
  ) => void;
  deleteNode: (nodeId: string) => Promise<void>;

  // -------- edge ops --------
  createEdge: (input: CreateEdgeInput) => Promise<Edge | null>;
  updateEdge: (
    edgeId: string,
    patch: Partial<{ label: string | null; data: Record<string, unknown> }>,
  ) => void;
  deleteEdge: (edgeId: string) => Promise<void>;

  // -------- viewport --------
  setViewport: (viewport: Viewport) => void;

  // -------- project meta --------
  renameProject: (name: string) => Promise<void>;

  // -------- save control --------
  flushSave: () => Promise<void>;

  // -------- replace (import) --------
  replaceFromGraph: (graph: ProjectGraph) => void;
}

let saveAbort: AbortController | null = null;

export const useGraphStore = create<GraphState>()((set, get) => {
  const scheduleSave = debounce(async () => {
    await persistNow();
  }, AUTOSAVE_MS);

  const persistNow = async () => {
    const { project, nodes, edges } = get();
    if (!project) return;
    if (saveAbort) saveAbort.abort();
    saveAbort = new AbortController();

    set({ saveStatus: 'saving', lastSaveError: null });

    const body: ReplaceGraphBody = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        name: n.name,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        sourceId: e.sourceId,
        targetId: e.targetId,
        type: e.type,
        label: e.label ?? undefined,
        data: e.data,
      })),
      viewport: project.viewport,
    };

    try {
      const updated = await graphApi.replace(project.id, body);
      // Reconcile server response — keeps timestamps fresh, ids canonical.
      set({
        project: updated.project,
        nodes: updated.nodes,
        edges: updated.edges,
        saveStatus: 'saved',
        lastSavedAt: Date.now(),
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      set({
        saveStatus: 'error',
        lastSaveError: (err as Error).message,
      });
    }
  };

  const markDirty = () => {
    set({ saveStatus: 'pending' });
    scheduleSave();
  };

  return {
    project: null,
    nodes: [],
    edges: [],
    loadingProjectId: null,
    loadError: null,
    saveStatus: 'idle',
    lastSaveError: null,
    lastSavedAt: null,

    async loadProject(projectId) {
      set({
        loadingProjectId: projectId,
        loadError: null,
        project: null,
        nodes: [],
        edges: [],
        saveStatus: 'idle',
        lastSavedAt: null,
      });
      try {
        const graph = await graphApi.get(projectId);
        set({
          project: graph.project,
          nodes: graph.nodes,
          edges: graph.edges,
          loadingProjectId: null,
        });
      } catch (err) {
        set({
          loadError: (err as Error).message,
          loadingProjectId: null,
        });
      }
    },

    reset() {
      scheduleSave.cancel();
      saveAbort?.abort();
      saveAbort = null;
      set({
        project: null,
        nodes: [],
        edges: [],
        saveStatus: 'idle',
        lastSaveError: null,
        lastSavedAt: null,
        loadError: null,
        loadingProjectId: null,
      });
    },

    async createNode({ type, position, name }) {
      const { project, nodes } = get();
      if (!project) return null;
      const data = defaultNodeData(type);
      const input: CreateNodeInput = {
        type,
        name: name ?? defaultNodeName(type, nodes.filter((n) => n.type === type).length),
        position: position ?? { x: 80, y: 80 },
        data: data as Record<string, unknown>,
      };
      try {
        const created = await nodesApi.create(project.id, input);
        set({ nodes: [...get().nodes, created] });
        return created;
      } catch (err) {
        set({ saveStatus: 'error', lastSaveError: (err as Error).message });
        return null;
      }
    },

    updateNode(nodeId, patch) {
      set({
        nodes: get().nodes.map((n) =>
          n.id === nodeId
            ? ({
                ...n,
                ...('name' in patch && patch.name !== undefined ? { name: patch.name } : null),
                ...('position' in patch && patch.position
                  ? { position: patch.position }
                  : null),
                ...('data' in patch && patch.data
                  ? { data: patch.data as never }
                  : null),
              } as AnyNode)
            : n,
        ),
      });
      markDirty();
    },

    async deleteNode(nodeId) {
      const { project } = get();
      if (!project) return;
      // Optimistic — remove node + dependent edges from local store.
      const nodes = get().nodes.filter((n) => n.id !== nodeId);
      const edges = get().edges.filter(
        (e) => e.sourceId !== nodeId && e.targetId !== nodeId,
      );
      set({ nodes, edges });
      try {
        await nodesApi.remove(project.id, nodeId);
      } catch (err) {
        set({ saveStatus: 'error', lastSaveError: (err as Error).message });
      }
    },

    async createEdge(input) {
      const { project } = get();
      if (!project) return null;
      try {
        const created = await edgesApi.create(project.id, input);
        set({ edges: [...get().edges, created] });
        return created;
      } catch (err) {
        set({ saveStatus: 'error', lastSaveError: (err as Error).message });
        return null;
      }
    },

    updateEdge(edgeId, patch) {
      set({
        edges: get().edges.map((e) =>
          e.id === edgeId
            ? {
                ...e,
                ...('label' in patch ? { label: patch.label ?? null } : null),
                ...('data' in patch && patch.data ? { data: patch.data } : null),
              }
            : e,
        ),
      });
      markDirty();
    },

    async deleteEdge(edgeId) {
      const { project } = get();
      if (!project) return;
      set({ edges: get().edges.filter((e) => e.id !== edgeId) });
      try {
        await edgesApi.remove(project.id, edgeId);
      } catch (err) {
        set({ saveStatus: 'error', lastSaveError: (err as Error).message });
      }
    },

    setViewport(viewport) {
      const { project } = get();
      if (!project) return;
      set({ project: { ...project, viewport } });
      markDirty();
    },

    async renameProject(name) {
      const { project } = get();
      if (!project) return;
      const updated = await projectsApi.update(project.id, { name });
      set({ project: updated });
    },

    async flushSave() {
      scheduleSave.flush();
      // give the in-flight call a chance to finish if any
      const start = Date.now();
      while (get().saveStatus === 'saving' && Date.now() - start < 5000) {
        await new Promise((r) => setTimeout(r, 50));
      }
    },

    replaceFromGraph(graph) {
      set({
        project: graph.project,
        nodes: graph.nodes,
        edges: graph.edges,
        saveStatus: 'saved',
        lastSavedAt: Date.now(),
      });
    },
  };
});

/** Helper for components — returns the typed node by id. */
export function selectNodeById(state: GraphState, id: string | null) {
  if (!id) return null;
  return state.nodes.find((n) => n.id === id) ?? null;
}

/** Helper — list of nodes by type. */
export function selectNodesByType(state: GraphState, type: NodeType) {
  return state.nodes.filter((n) => n.type === type);
}

/** Helper — connected edges for a node. */
export function selectEdgesForNode(state: GraphState, nodeId: string) {
  return state.edges.filter(
    (e) => e.sourceId === nodeId || e.targetId === nodeId,
  );
}

/** Helper — find edges with a given type going from a source. */
export function selectOutgoingEdges(
  state: GraphState,
  sourceId: string,
  type?: EdgeType,
) {
  return state.edges.filter(
    (e) => e.sourceId === sourceId && (type ? e.type === type : true),
  );
}
