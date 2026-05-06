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
import { branchesApi } from '../api/branches';
import { edgesApi } from '../api/edges';
import { graphApi } from '../api/graph';
import { nodesApi } from '../api/nodes';
import { projectsApi } from '../api/projects';
import { useBranchStore } from './branchStore';
import { useUiStore } from './uiStore';
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
  UiElementData,
  Viewport,
} from '../api/types';
import { debounce } from '../lib/debounce';
import { defaultNodeData, defaultNodeName } from '../lib/nodeMeta';
import { uuid } from '../lib/uuid';

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

  /**
   * Nodes created locally that are not yet persisted on the server.
   * UI_ELEMENT nodes need a screenId before the backend will accept them,
   * so we keep them client-only until the inspector fills it in. Pending
   * nodes are excluded from the autosave payload to avoid validation errors.
   */
  pendingNodeIds: string[];

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
  /**
   * Atomically rebind a UI_ELEMENT to a different SCREEN.
   *
   * UI_ELEMENT positions are stored relative to their parent screen so that
   * dragging the screen carries its children. Changing screenId therefore
   * has to recompute the position too, otherwise the element jumps to the
   * wrong absolute spot. Doing it in one set() also ensures the pending
   * promote (POST /nodes) sees the already-relative position.
   */
  setUiElementScreen: (nodeId: string, newScreenId: string) => void;
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

  // -------- branch graph loading --------
  loadBranchGraph: (projectId: string, branchId: string) => Promise<void>;
}

export const useGraphStore = create<GraphState>()((set, get) => {
  const scheduleSave = debounce(async () => {
    await persistNow();
  }, AUTOSAVE_MS);

  // Tracks nodes whose promote-to-server request is in flight.
  // Lives outside store state — purely a deduplication guard.
  const promoting = new Set<string>();

  // Bumped on every local mutation that schedules a save. Used purely to
  // detect "did anything change while a PUT was in flight?" — if so, the
  // save loop sends one more PUT with the freshest state.
  let mutationVersion = 0;

  // Save serialisation — only one PUT in flight at a time. While a save is
  // running, `markDirty()` just bumps mutationVersion; the running loop
  // notices and re-runs with the latest snapshot on its next pass. A burst
  // of fast edits collapses into "first save (already running) + one final
  // save with the latest state". Two PUTs are never in flight, so out-of-
  // order responses are impossible.
  let saveInFlight = false;

  /**
   * Local state is authoritative for what the user sees. PUTs are
   * fire-and-forget: we send the latest snapshot, treat the response as
   * "ack" only, and never write server data back into the store. That's
   * what eliminates every visible "snap back" — there's literally no code
   * path that can replace a freshly-edited node with stale server data.
   *
   * (Initial load and explicit imports go through loadProject /
   * replaceFromGraph / loadBranchGraph — those still take server data,
   * because that's where it belongs.)
   */
  const persistNow = async () => {
    if (saveInFlight) return;
    if (!get().project) return;

    saveInFlight = true;
    set({ saveStatus: 'saving', lastSaveError: null });

    try {
      while (true) {
        const { project, nodes, edges, pendingNodeIds } = get();
        if (!project) break;

        const versionAtSend = mutationVersion;

        const pending = new Set(pendingNodeIds);
        const persistedNodes = nodes.filter((n) => !pending.has(n.id));
        const persistedEdges = edges.filter(
          (e) => !pending.has(e.sourceId) && !pending.has(e.targetId),
        );

        const body: ReplaceGraphBody = {
          nodes: persistedNodes.map((n) => ({
            id: n.id,
            type: n.type,
            name: n.name,
            position: n.position,
            data: n.data,
          })),
          edges: persistedEdges.map((e) => ({
            id: e.id,
            sourceId: e.sourceId,
            targetId: e.targetId,
            type: e.type,
            label: e.label ?? undefined,
            data: e.data,
          })),
          viewport: project.viewport,
        };

        const activeBranchId = useBranchStore.getState().activeBranchId;
        if (activeBranchId) {
          await branchesApi.replaceGraph(project.id, activeBranchId, body);
        } else {
          await graphApi.replace(project.id, body);
        }

        // More edits during the PUT? Loop and send the freshest state.
        if (mutationVersion !== versionAtSend) continue;

        set({ saveStatus: 'saved', lastSavedAt: Date.now() });
        break;
      }
    } catch (err) {
      set({
        saveStatus: 'error',
        lastSaveError: (err as Error).message,
      });
    } finally {
      saveInFlight = false;
    }
  };

  const markDirty = () => {
    mutationVersion++;
    set({ saveStatus: 'pending' });
    scheduleSave();
  };

  /**
   * Promote a locally-created UI_ELEMENT to the server.
   * In main mode this means POSTing to /nodes so the server mints the
   * canonical id; we then swap the temp node for the canonical one.
   * In branch mode there's no per-node create endpoint — replaceGraph
   * accepts client-side ids, so we just clear the pending flag and let
   * the next autosave include the node.
   */
  const promotePending = async (nodeId: string) => {
    if (promoting.has(nodeId)) return;
    promoting.add(nodeId);
    try {
      const { project, nodes, pendingNodeIds } = get();
      if (!project) return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const activeBranchId = useBranchStore.getState().activeBranchId;
      if (activeBranchId) {
        set({ pendingNodeIds: pendingNodeIds.filter((id) => id !== nodeId) });
        markDirty();
        return;
      }

      try {
        const created = await nodesApi.create(project.id, {
          type: node.type,
          name: node.name,
          position: node.position,
          data: node.data as Record<string, unknown>,
        });
        const fresh = get();
        set({
          nodes: fresh.nodes.map((n) => (n.id === nodeId ? created : n)),
          pendingNodeIds: fresh.pendingNodeIds.filter((id) => id !== nodeId),
        });
        const ui = useUiStore.getState();
        if (ui.selectedNodeId === nodeId) ui.selectNode(created.id);
        // Pick up any local edits (e.g. label) that landed during the create.
        markDirty();
      } catch (err) {
        set({ saveStatus: 'error', lastSaveError: (err as Error).message });
      }
    } finally {
      promoting.delete(nodeId);
    }
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
    pendingNodeIds: [],

    async loadProject(projectId) {
      set({
        loadingProjectId: projectId,
        loadError: null,
        project: null,
        nodes: [],
        edges: [],
        saveStatus: 'idle',
        lastSavedAt: null,
        pendingNodeIds: [],
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
      promoting.clear();
      set({
        project: null,
        nodes: [],
        edges: [],
        saveStatus: 'idle',
        lastSaveError: null,
        lastSavedAt: null,
        loadError: null,
        loadingProjectId: null,
        pendingNodeIds: [],
      });
    },

    async createNode({ type, position, name }) {
      const { project, nodes } = get();
      if (!project) return null;
      const data = defaultNodeData(type);
      const resolvedName =
        name ?? defaultNodeName(type, nodes.filter((n) => n.type === type).length);
      const resolvedPosition = position ?? { x: 80, y: 80 };

      // UI_ELEMENT requires a screenId, which the user picks via the inspector.
      // Create it locally as pending in both branch and main mode; promote it
      // to the server once a screen is selected.
      const isPendingUiElement = type === 'UI_ELEMENT';

      const activeBranchId = useBranchStore.getState().activeBranchId;
      if (activeBranchId || isPendingUiElement) {
        const now = new Date().toISOString();
        const localNode: AnyNode = {
          id: uuid(),
          projectId: project.id,
          type,
          name: resolvedName,
          position: resolvedPosition,
          data: data as never,
          createdAt: now,
          updatedAt: now,
        };
        const next = get();
        set({
          nodes: [...next.nodes, localNode],
          pendingNodeIds: isPendingUiElement
            ? [...next.pendingNodeIds, localNode.id]
            : next.pendingNodeIds,
        });
        // Branch mode persists via replaceGraph; pending UI_ELEMENTs wait for
        // promotePending. Don't markDirty for pending — autosave skips them.
        if (activeBranchId && !isPendingUiElement) markDirty();
        return localNode;
      }

      const input: CreateNodeInput = {
        type,
        name: resolvedName,
        position: resolvedPosition,
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
      const nextNodes = get().nodes.map((n) =>
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
      );
      set({ nodes: nextNodes });

      const isPending = get().pendingNodeIds.includes(nodeId);
      if (isPending) {
        // Pending UI_ELEMENT: promote once the user picks a screen, otherwise
        // stay client-only. Skip markDirty so the autosave payload doesn't
        // try to send a still-incomplete node.
        const updated = nextNodes.find((n) => n.id === nodeId);
        if (updated && updated.type === 'UI_ELEMENT') {
          const data = updated.data as UiElementData;
          if (data.screenId) {
            void promotePending(nodeId);
          }
        }
        return;
      }

      markDirty();
    },

    setUiElementScreen(nodeId, newScreenId) {
      const state = get();
      const node = state.nodes.find((n) => n.id === nodeId);
      if (!node || node.type !== 'UI_ELEMENT') return;

      const oldData = node.data as UiElementData;
      const oldScreen = oldData.screenId
        ? state.nodes.find((n) => n.id === oldData.screenId && n.type === 'SCREEN')
        : null;
      const newScreen = newScreenId
        ? state.nodes.find((n) => n.id === newScreenId && n.type === 'SCREEN')
        : null;

      // Position semantics: if a UI_ELEMENT has a screenId, its position is
      // relative to that screen; otherwise it's absolute. Recompute on rebind
      // so the element doesn't jump.
      let newPosition = node.position;
      if (!oldScreen && newScreen) {
        // Pending → attached. Stack beneath the new screen.
        const siblings = state.nodes.filter(
          (n) =>
            n.type === 'UI_ELEMENT' &&
            n.id !== nodeId &&
            (n.data as UiElementData).screenId === newScreen.id,
        ).length;
        newPosition = { x: 20, y: 200 + siblings * 70 };
      } else if (oldScreen && !newScreen) {
        // Attached → orphan. Convert relative to absolute so it stays where
        // the user last saw it.
        newPosition = {
          x: node.position.x + oldScreen.position.x,
          y: node.position.y + oldScreen.position.y,
        };
      } else if (oldScreen && newScreen && oldScreen.id !== newScreen.id) {
        // Switching parents. Preserve the absolute on-screen position.
        newPosition = {
          x: node.position.x + oldScreen.position.x - newScreen.position.x,
          y: node.position.y + oldScreen.position.y - newScreen.position.y,
        };
      }

      const updatedData: UiElementData = { ...oldData, screenId: newScreenId };
      const nextNodes = state.nodes.map((n) =>
        n.id === nodeId
          ? ({ ...n, data: updatedData as never, position: newPosition } as AnyNode)
          : n,
      );
      set({ nodes: nextNodes });

      const isPending = state.pendingNodeIds.includes(nodeId);
      if (isPending) {
        if (newScreenId) void promotePending(nodeId);
        return;
      }
      markDirty();
    },

    async deleteNode(nodeId) {
      const { project } = get();
      if (!project) return;
      const wasPending = get().pendingNodeIds.includes(nodeId);
      // Optimistic — remove node + dependent edges from local store.
      const nodes = get().nodes.filter((n) => n.id !== nodeId);
      const edges = get().edges.filter(
        (e) => e.sourceId !== nodeId && e.targetId !== nodeId,
      );
      set({
        nodes,
        edges,
        pendingNodeIds: get().pendingNodeIds.filter((id) => id !== nodeId),
      });

      // Pending nodes never reached the server — nothing to delete remotely.
      if (wasPending) return;

      const activeBranchId = useBranchStore.getState().activeBranchId;
      if (activeBranchId) {
        // Branch mode: save as DELETE delta via replaceGraph, don't touch project table.
        markDirty();
        return;
      }

      try {
        await nodesApi.remove(project.id, nodeId);
      } catch (err) {
        set({ saveStatus: 'error', lastSaveError: (err as Error).message });
      }
    },

    async createEdge(input) {
      const { project } = get();
      if (!project) return null;

      const activeBranchId = useBranchStore.getState().activeBranchId;
      if (activeBranchId) {
        // Branch mode: create locally with a client-side ID.
        // replaceGraph will compute the ADD delta vs parent and persist it.
        const now = new Date().toISOString();
        const branchEdge: Edge = {
          id: uuid(),
          projectId: project.id,
          sourceId: input.sourceId,
          targetId: input.targetId,
          type: input.type,
          label: input.label ?? null,
          data: (input.data as Record<string, unknown>) ?? {},
          createdAt: now,
          updatedAt: now,
        };
        set({ edges: [...get().edges, branchEdge] });
        markDirty();
        return branchEdge;
      }

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

      const activeBranchId = useBranchStore.getState().activeBranchId;
      if (activeBranchId) {
        // Branch mode: save as DELETE delta via replaceGraph, don't touch project table.
        markDirty();
        return;
      }

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
        pendingNodeIds: [],
      });
    },

    async loadBranchGraph(projectId, branchId) {
      set({ loadingProjectId: projectId, loadError: null, saveStatus: 'idle' });
      try {
        // BranchGraph has no `project` field — keep existing project metadata.
        const graph = await branchesApi.getGraph(projectId, branchId);
        set((s) => ({
          project: s.project,
          nodes: graph.nodes as AnyNode[],
          edges: graph.edges as Edge[],
          loadingProjectId: null,
          pendingNodeIds: [],
        }));
      } catch (err) {
        set({ loadError: (err as Error).message, loadingProjectId: null });
      }
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
