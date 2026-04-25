import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { NodeType } from '../api/types';
import { Canvas } from '../canvas/Canvas';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { PromptModal } from '../components/PromptModal';
import { ValidationPanel } from '../components/ValidationPanel';
import { EdgeInspector } from '../editors/EdgeInspector';
import { NodeInspector } from '../editors/NodeInspector';
import { NODE_META } from '../lib/nodeMeta';
import { SimulationView } from '../simulation/SimulationView';
import { useGraphStore } from '../store/graphStore';
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

  useEffect(() => {
    if (!projectId) return;
    loadProject(projectId);
    return () => {
      reset();
    };
  }, [projectId, loadProject, reset]);

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
        </div>
        <div className="pb-topbar__right">
          {mode === 'design' ? (
            <>
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
        <div className="pb-project-body">
          <Sidebar />
          <Canvas />
          <RightPanel
            selectedNode={selectedNode ?? null}
            selectedEdge={selectedEdge ?? null}
          />
        </div>
      ) : (
        <SimulationView />
      )}

      <PromptModal />
    </div>
  );
}

function Sidebar() {
  const createNode = useGraphStore((s) => s.createNode);

  return (
    <aside className="pb-sidebar">
      <div className="pb-sidebar__group">
        <div className="pb-sidebar__title">Add node</div>
        {(Object.keys(NODE_META) as NodeType[]).map((type) => {
          const meta = NODE_META[type];
          return (
            <button
              key={type}
              className="pb-sidebar__btn"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-brainer-node', type);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => createNode({ type })}
              title={meta.description}
            >
              <span
                className="pb-sidebar__btn-dot"
                style={{ background: meta.fgVar }}
              />
              <Icon name={meta.iconName} size={14} />
              <span>{meta.label}</span>
            </button>
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
  selectedNode,
  selectedEdge,
}: {
  selectedNode: ReturnType<typeof useGraphStore.getState>['nodes'][number] | null;
  selectedEdge: ReturnType<typeof useGraphStore.getState>['edges'][number] | null;
}) {
  return (
    <aside className="pb-rightpanel">
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
