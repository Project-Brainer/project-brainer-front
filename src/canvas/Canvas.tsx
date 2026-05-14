import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type Connection,
  type Edge as RFEdge,
  type EdgeTypes,
  type Node as RFNode,
  type NodeChange,
  type NodeTypes,
  type OnConnect,
  type ReactFlowInstance,
  type Viewport as RFViewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type {
  AnyNode,
  CallsEdgeData,
  Edge,
  EdgeType,
  NodeType,
  Position,
  UiElementData,
} from '../api/types';
import { GLOBAL_NODE_TYPES } from '../api/types';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';
import { allowedEdgeTypes, canConnect, defaultEdgeData } from '../lib/edgeCompat';
import { relatedNodeIds } from '../lib/dataflow';
import { BrainerNode } from './nodes/BrainerNode';
import { BrainerEdge } from './edges/BrainerEdge';
import { EdgeTypePicker } from './EdgeTypePicker';
import { SlotWires } from './SlotWires';

interface PickerState {
  sourceId: string;
  targetId: string;
  options: EdgeType[];
  x: number;
  y: number;
}

const NODE_TYPES: NodeTypes = {
  brainer: BrainerNode,
};

const EDGE_TYPES: EdgeTypes = {
  brainer: BrainerEdge,
};

function nodeForFlow(
  node: AnyNode,
  selected: boolean,
  related: boolean,
  dataflowRelated: boolean,
  parentScreenId?: string,
  requestBindingFields?: string[],
): RFNode {
  const rf: RFNode = {
    id: node.id,
    type: 'brainer',
    position: node.position,
    data: { node, selected, related, dataflowRelated, requestBindingFields },
    selected,
  };
  if (parentScreenId) {
    // Stored UI_ELEMENT positions are relative to their parent SCREEN, which
    // is exactly what React Flow expects when `parentId` is set. The screen
    // then drags its UI elements with it for free.
    rf.parentId = parentScreenId;
    rf.extent = undefined;
  }
  return rf;
}

function edgeForFlow(edge: Edge, selected: boolean): RFEdge {
  return {
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    type: 'brainer',
    selected,
    data: { edge },
  };
}

function CanvasInner() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<ReactFlowInstance | null>(null);

  const project = useGraphStore((s) => s.project);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const updateNode = useGraphStore((s) => s.updateNode);
  const setViewport = useGraphStore((s) => s.setViewport);
  const createEdge = useGraphStore((s) => s.createEdge);
  const createNode = useGraphStore((s) => s.createNode);

  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const selectedEdgeId = useUiStore((s) => s.selectedEdgeId);
  const focusNodeId = useUiStore((s) => s.focusNodeId);
  const focusedPageId = useUiStore((s) => s.focusedPageId);
  const selectNode = useUiStore((s) => s.selectNode);
  const selectEdge = useUiStore((s) => s.selectEdge);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const clearFocusNode = useUiStore((s) => s.clearFocusNode);

  const [picker, setPicker] = useState<PickerState | null>(null);

  useEffect(() => {
    if (!focusNodeId || !instanceRef.current) return;
    instanceRef.current.fitView({
      nodes: [{ id: focusNodeId }],
      duration: 450,
      padding: 0.4,
    });
    clearFocusNode();
  }, [focusNodeId, clearFocusNode]);

  const initialViewport = project?.viewport;
  useEffect(() => {
    if (initialViewport && instanceRef.current) {
      instanceRef.current.setViewport(initialViewport);
    }
  }, [initialViewport]);

  const { related, dataflow } = useMemo(() => {
    if (!selectedNodeId) return { related: new Set<string>(), dataflow: new Set<string>() };
    return relatedNodeIds(selectedNodeId, nodes, edges);
  }, [selectedNodeId, nodes, edges]);

  // For each API endpoint, the unique request fields that some incoming
  // CALLS edge binds to. Drives the synthetic anchor rows on the endpoint
  // card so the wire overlay can land on the exact field.
  const requestFieldsByEndpoint = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of edges) {
      if (e.type !== 'CALLS') continue;
      const data = e.data as CallsEdgeData | undefined;
      const bindings = data?.requestBindings ?? [];
      if (bindings.length === 0) continue;
      const list = m.get(e.targetId) ?? [];
      for (const b of bindings) {
        if (!b.field) continue;
        if (!list.includes(b.field)) list.push(b.field);
      }
      if (list.length) m.set(e.targetId, list);
    }
    return m;
  }, [edges]);

  // Apply focus-mode filter: if focusedPageId is set, show only nodes that
  // belong to that page or are global (DATA_MODEL, API_ENDPOINT).
  const visibleNodes = useMemo<AnyNode[]>(() => {
    if (!focusedPageId) return nodes;
    return nodes.filter(
      (n) =>
        (GLOBAL_NODE_TYPES as readonly string[]).includes(n.type) ||
        n.pageId === focusedPageId,
    );
  }, [nodes, focusedPageId]);

  const rfNodes = useMemo<RFNode[]>(() => {
    const screenIds = new Set(
      visibleNodes.filter((n) => n.type === 'SCREEN').map((n) => n.id),
    );
    const sorted = [...visibleNodes].sort((a, b) => {
      if (a.type === 'SCREEN' && b.type !== 'SCREEN') return -1;
      if (b.type === 'SCREEN' && a.type !== 'SCREEN') return 1;
      return 0;
    });
    return sorted.map((n) => {
      let parentScreenId: string | undefined;
      if (n.type === 'UI_ELEMENT') {
        const screenId = (n.data as UiElementData).screenId;
        if (screenId && screenIds.has(screenId)) parentScreenId = screenId;
      }
      return nodeForFlow(
        n,
        n.id === selectedNodeId,
        related.has(n.id),
        dataflow.has(n.id),
        parentScreenId,
        n.type === 'API_ENDPOINT' ? requestFieldsByEndpoint.get(n.id) : undefined,
      );
    });
  }, [visibleNodes, selectedNodeId, related, dataflow, requestFieldsByEndpoint]);

  const rfEdges = useMemo<RFEdge[]>(() => {
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    // Only show edges where both endpoints are visible.
    const visibleEdges = edges.filter(
      (e) => visibleIds.has(e.sourceId) && visibleIds.has(e.targetId),
    );
    const real = visibleEdges.map((e) => edgeForFlow(e, e.id === selectedEdgeId));
    const screenIds = new Set(
      visibleNodes.filter((n) => n.type === 'SCREEN').map((n) => n.id),
    );
    const synthetic: RFEdge[] = [];
    for (const n of visibleNodes) {
      if (n.type !== 'UI_ELEMENT') continue;
      const screenId = (n.data as UiElementData).screenId;
      if (!screenId || !screenIds.has(screenId)) continue;
      synthetic.push({
        id: `pb-belongs:${n.id}`,
        source: screenId,
        target: n.id,
        type: 'straight',
        focusable: false,
        deletable: false,
        interactionWidth: 0,
        zIndex: -1,
        style: {
          stroke: 'var(--node-screen-fg, currentColor)',
          strokeDasharray: '4 4',
          strokeWidth: 1.25,
          opacity: 0.5,
        },
      });
    }
    return [...real, ...synthetic];
  }, [edges, visibleNodes, selectedEdgeId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const ch of changes) {
        if (ch.type === 'position' && ch.position && ch.dragging === false) {
          updateNode(ch.id, { position: ch.position });
        } else if (ch.type === 'position' && ch.position && ch.dragging) {
          updateNode(ch.id, { position: ch.position });
        } else if (ch.type === 'remove') {
          // We control delete via the UI panel — ignore RF native delete
          // to avoid double removal.
        }
      }
    },
    [updateNode],
  );

  const onConnect = useCallback<OnConnect>(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      if (conn.source === conn.target) return;
      const src = nodes.find((n) => n.id === conn.source);
      const tgt = nodes.find((n) => n.id === conn.target);
      if (!src || !tgt) return;

      const options = allowedEdgeTypes(
        src.type as NodeType,
        tgt.type as NodeType,
      );
      if (options.length === 0) return;

      if (options.length === 1) {
        void createEdge({
          sourceId: src.id,
          targetId: tgt.id,
          type: options[0],
          data: defaultEdgeData(options[0], tgt.type as NodeType),
        });
        return;
      }

      const project = (instanceRef.current as ReactFlowInstance).project ?? null;
      const midpoint = project
        ? project({
            x: (src.position.x + tgt.position.x) / 2,
            y: (src.position.y + tgt.position.y) / 2,
          })
        : { x: 0, y: 0 };

      const vp = instanceRef.current?.getViewport() ?? { x: 0, y: 0, zoom: 1 };
      const screenX = midpoint.x * vp.zoom + vp.x;
      const screenY = midpoint.y * vp.zoom + vp.y;

      const rect = wrapperRef.current?.getBoundingClientRect();
      setPicker({
        sourceId: src.id,
        targetId: tgt.id,
        options,
        x: (rect?.left ?? 0) + screenX,
        y: (rect?.top ?? 0) + screenY,
      });
    },
    [nodes, createEdge],
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: RFNode) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: RFEdge) => {
      if (edge.id.startsWith('pb-belongs:')) return;
      selectEdge(edge.id);
    },
    [selectEdge],
  );

  const onPaneClick = useCallback(() => {
    clearSelection();
    setPicker(null);
  }, [clearSelection]);

  const onMoveEnd = useCallback(
    (_e: unknown, vp: RFViewport) => {
      setViewport(vp);
    },
    [setViewport],
  );

  const isValidConnection = useCallback(
    (conn: Connection): boolean => {
      if (!conn.source || !conn.target) return false;
      if (conn.source === conn.target) return false;
      const s = nodes.find((n) => n.id === conn.source);
      const t = nodes.find((n) => n.id === conn.target);
      if (!s || !t) return false;
      return canConnect(s.type as NodeType, t.type as NodeType);
    },
    [nodes],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/x-brainer-node');
      if (!type) return;
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect || !instanceRef.current) return;
      const point: Position = instanceRef.current.project({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      const created = await createNode({ type: type as NodeType, position: point });
      if (created) selectNode(created.id);
    },
    [createNode, selectNode],
  );

  return (
    <div ref={wrapperRef} className="pb-canvas-area" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onInit={(inst) => {
          instanceRef.current = inst;
          if (initialViewport) inst.setViewport(initialViewport);
        }}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onMoveEnd={onMoveEnd}
        isValidConnection={isValidConnection}
        defaultEdgeOptions={{ type: 'brainer' }}
        connectionLineStyle={{
          stroke: 'var(--accent)',
          strokeWidth: 1.5,
          strokeDasharray: '4 4',
        }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
        fitView={false}
        minZoom={0.25}
        maxZoom={2.5}
      >
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <marker
              id="pb-arrow"
              viewBox="0 0 12 12"
              refX="9"
              refY="6"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 1 1 L 11 6 L 1 11"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </marker>
          </defs>
        </svg>
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="var(--neutral-3)"
        />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="pb-rf-controls"
        />
        <MiniMap
          position="bottom-left"
          className="pb-minimap"
          nodeColor={(n) => {
            const t = (n.data as { node?: AnyNode })?.node?.type;
            if (t === 'SCREEN') return 'var(--node-screen-bg)';
            if (t === 'UI_ELEMENT') return 'var(--node-ui-bg)';
            if (t === 'DATA_MODEL') return 'var(--node-model-bg)';
            if (t === 'API_ENDPOINT') return 'var(--node-api-bg)';
            if (t === 'ACTION') return 'var(--accent-soft)';
            if (t === 'ROLE') return 'var(--node-role-bg)';
            return 'var(--neutral-2)';
          }}
          maskColor="var(--canvas-minimap-mask, rgba(0,0,0,0.08))"
          style={{ borderRadius: 8 }}
        />
        <SlotWires nodes={visibleNodes} edges={edges} wrapperRef={wrapperRef} />
      </ReactFlow>

      {picker && (
        <EdgeTypePicker
          x={picker.x}
          y={picker.y}
          options={picker.options}
          onCancel={() => setPicker(null)}
          onPick={async (type) => {
            const { sourceId, targetId } = picker;
            setPicker(null);
            const target = nodes.find((n) => n.id === targetId);
            await createEdge({
              sourceId,
              targetId,
              type,
              data: target
                ? defaultEdgeData(type, target.type as NodeType)
                : undefined,
            });
          }}
        />
      )}
    </div>
  );
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
