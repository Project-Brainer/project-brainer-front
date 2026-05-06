import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AnyNode, NodeType } from '../api/types';
import { Canvas } from '../canvas/Canvas';
import { Button } from '../components/Button';
import { BranchSelector } from '../components/BranchSelector';
import { CommitModal } from '../components/CommitModal';
import { Icon } from '../components/Icon';
import { MergeModal } from '../components/MergeModal';
import { PromptModal } from '../components/PromptModal';
import { ValidationPanel } from '../components/ValidationPanel';
import { EdgeInspector } from '../editors/EdgeInspector';
import { NodeInspector } from '../editors/NodeInspector';
import { NODE_META } from '../lib/nodeMeta';
import { SimulationView } from '../simulation/SimulationView';
import { useGraphStore } from '../store/graphStore';
import { useBranchStore } from '../store/branchStore';
import { useUiStore } from '../store/uiStore';

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const project = useGraphStore((s) => s.project);
  const loading = useGraphStore((s) => s.loadingProjectId);
  const loadError = useGraphStore((s) => s.loadError);
  const saveStatus = useGraphStore((s) => s.saveStatus);
  const lastSaveError = useGraphStore((s) => s.lastSaveError);
  const loadProject = useGraphStore((s) => s.loadProject);
  const reset = useGraphStore((s) => s.reset);
  const renameProject = useGraphStore((s) => s.renameProject);
  const flushSave = useGraphStore((s) => s.flushSave);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);

  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const selectedEdgeId = useUiStore((s) => s.selectedEdgeId);
  const openPrompt = useUiStore((s) => s.openPromptModal);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);

  const activeBranchId = useBranchStore((s) => s.activeBranchId);
  const openCommitModal = useBranchStore((s) => s.openCommitModal);
  const resetBranches = useBranchStore((s) => s.reset);

  useEffect(() => {
    if (!projectId) return;
    loadProject(projectId);
    return () => {
      reset();
      resetBranches();
    };
  }, [projectId, loadProject, reset, resetBranches]);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;
  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId)
    : null;

  if (loading) {
    return (
      <div className="pb-fullpage-empty">
        <Icon name="loader" spin /> Loading project…
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="pb-fullpage-empty">
        <p>{loadError ?? 'Project not found.'}</p>
        <Link to="/" className="pb-topbar__back">
          <Icon name="arrow-up-right" size={14} /> Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-project-shell">
      <header className="pb-topbar">
        <div className="pb-topbar__left">
          <Link to="/" className="pb-topbar__back">
            <Icon name="chevron-right" size={14} className="pb-rotate-180" /> Projects
          </Link>
          <input
            className="pb-topbar__title"
            value={project.name}
            onChange={(e) => {
              // Optimistic — update store; backend write on blur.
              useGraphStore.setState((s) => ({
                project: s.project ? { ...s.project, name: e.target.value } : s.project,
              }));
            }}
            onBlur={() => renameProject(project.name)}
          />
          <SaveStatusBadge status={saveStatus} error={lastSaveError} />
          <BranchSelector />
        </div>
        <div className="pb-topbar__right">
          {mode === 'design' ? (
            <>
              {activeBranchId && (
                <Button
                  variant="ghost"
                  iconLeft="bookmark"
                  onClick={openCommitModal}
                >
                  Checkpoint
                </Button>
              )}
              <Button
                variant="ghost"
                iconLeft="play"
                onClick={async () => {
                  await flushSave();
                  setMode('simulate');
                }}
              >
                Simulate
              </Button>
              <Button
                variant="primary"
                iconLeft="zap"
                onClick={() => openPrompt(null)}
              >
                Generate prompt
              </Button>
            </>
          ) : (
            <Button variant="primary" iconLeft="log-out" onClick={() => setMode('design')}>
              Exit simulation
            </Button>
          )}
        </div>
      </header>

      {mode === 'design' ? (
        <div
          className="pb-project-body"
          style={{
            gridTemplateColumns: `${sidebarOpen ? '240px' : '0px'} 1fr ${rightPanelOpen ? '320px' : '0px'}`,
          }}
        >
          <Sidebar open={sidebarOpen} />
          <div className="pb-canvas-wrapper">
            <button
              className={`pb-panel-toggle pb-panel-toggle--left${sidebarOpen ? ' pb-panel-toggle--open' : ''}`}
              onClick={toggleSidebar}
              title={sidebarOpen ? 'Скрыть панель элементов' : 'Показать панель элементов'}
            >
              <Icon name="chevron-right" size={14} className={sidebarOpen ? 'pb-rotate-180' : ''} />
            </button>
            <Canvas />
            <button
              className={`pb-panel-toggle pb-panel-toggle--right${rightPanelOpen ? ' pb-panel-toggle--open' : ''}`}
              onClick={toggleRightPanel}
              title={rightPanelOpen ? 'Скрыть инспектор' : 'Показать инспектор'}
            >
              <Icon name="chevron-right" size={14} className={rightPanelOpen ? '' : 'pb-rotate-180'} />
            </button>
          </div>
          <RightPanel
            open={rightPanelOpen}
            selectedNode={selectedNode ?? null}
            selectedEdge={selectedEdge ?? null}
          />
        </div>
      ) : (
        <SimulationView />
      )}

      <PromptModal />
      <CommitModal />
      <MergeModal />
    </div>
  );
}

function Sidebar({ open }: { open: boolean }) {
  const createNode = useGraphStore((s) => s.createNode);
  const nodes = useGraphStore((s) => s.nodes);
  const selectedNodeId = useUiStore((s) => s.selectedNodeId);
  const selectNode = useUiStore((s) => s.selectNode);
  const focusNode = useUiStore((s) => s.focusNode);

  const nodesByType = useMemo(() => {
    const map: Partial<Record<NodeType, AnyNode[]>> = {};
    for (const node of nodes) {
      if (!map[node.type as NodeType]) map[node.type as NodeType] = [];
      map[node.type as NodeType]!.push(node);
    }
    return map;
  }, [nodes]);

  return (
    <aside className={`pb-sidebar${open ? '' : ' pb-sidebar--hidden'}`}>
      <div className="pb-sidebar__group">
        <div className="pb-sidebar__title">Elements</div>
        {(Object.keys(NODE_META) as NodeType[]).map((type) => {
          const meta = NODE_META[type];
          const typeNodes = nodesByType[type] ?? [];
          return (
            <div key={type} className="pb-sidebar__type-group">
              <div className="pb-sidebar__section-head">
                <span
                  className="pb-sidebar__section-title"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-brainer-node', type);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  title={`Drag to add ${meta.label}`}
                >
                  {meta.label}
                </span>
                <button
                  className="pb-sidebar__add-btn"
                  onClick={async () => {
                    const created = await createNode({ type });
                    if (created) {
                      selectNode(created.id);
                      focusNode(created.id);
                    }
                  }}
                  title={`Add ${meta.label}`}
                >
                  <Icon name="plus" size={12} />
                </button>
              </div>
              {typeNodes.map((node) => (
                <button
                  key={node.id}
                  className={`pb-sidebar__node-item${selectedNodeId === node.id ? ' pb-sidebar__node-item--active' : ''}`}
                  onClick={() => {
                    selectNode(node.id);
                    focusNode(node.id);
                  }}
                  title={node.name || meta.label}
                >
                  <Icon name={meta.iconName} size={14} />
                  <span className="pb-sidebar__node-name">
                    {node.name || <span className="pb-sidebar__node-unnamed">{meta.shortLabel}</span>}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div className="pb-sidebar__group">
        <div className="pb-sidebar__title">Validation</div>
        <ValidationPanel />
      </div>
    </aside>
  );
}

function RightPanel({
  open,
  selectedNode,
  selectedEdge,
}: {
  open: boolean;
  selectedNode: ReturnType<typeof useGraphStore.getState>['nodes'][number] | null;
  selectedEdge: ReturnType<typeof useGraphStore.getState>['edges'][number] | null;
}) {
  return (
    <aside className={`pb-rightpanel${open ? '' : ' pb-rightpanel--hidden'}`}>
      <header className="pb-rightpanel__header">
        <span className="pb-rightpanel__title">
          {selectedNode
            ? 'Node properties'
            : selectedEdge
            ? 'Connection'
            : 'Inspector'}
        </span>
      </header>
      <div className="pb-rightpanel__body">
        {selectedNode ? (
          <NodeInspector node={selectedNode} />
        ) : selectedEdge ? (
          <EdgeInspector edge={selectedEdge} />
        ) : (
          <EmptyInspector />
        )}
      </div>
    </aside>
  );
}

function EmptyInspector() {
  return (
    <div className="pb-empty pb-empty--inline">
      Select a node or connection to edit it. Drop nodes from the sidebar onto
      the canvas, then drag from the right edge of one node to another to
      connect them.
    </div>
  );
}

function SaveStatusBadge({
  status,
  error,
}: {
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  error: string | null;
}) {
  const map: Record<typeof status, { text: string; cls: string }> = {
    idle: { text: 'Up to date', cls: 'pb-save-saved' },
    pending: { text: 'Pending save', cls: 'pb-save-pending' },
    saving: { text: 'Saving…', cls: 'pb-save-saving' },
    saved: { text: 'Saved', cls: 'pb-save-saved' },
    error: { text: error ?? 'Save error', cls: 'pb-save-error' },
  };
  const m = map[status];
  return <span className={`pb-topbar__save ${m.cls}`}>{m.text}</span>;
}
