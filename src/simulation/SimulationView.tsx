import { useEffect, useMemo, useState } from 'react';
import type { AnyNode, UiElementData } from '../api/types';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Pill } from '../components/Pill';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';
import {
  buildScreenViewModel,
  findFirstScreen,
  initialSimState,
  listRoles,
  simulateScreenEnter,
  simulateUiActivation,
  type SimEvent,
  type SimState,
} from './engine';

export function SimulationView() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const setMode = useUiStore((s) => s.setMode);

  const graph = useMemo(() => ({ nodes, edges }), [nodes, edges]);

  const [state, setState] = useState<SimState>(() => initialSimState(graph));
  const [feed, setFeed] = useState<SimEvent[]>([]);

  // Reset state when the project graph changes shape.
  useEffect(() => {
    setState(initialSimState(graph));
    setFeed([]);
  }, [graph]);

  // Auto-fire READS when the screen changes.
  useEffect(() => {
    if (!state.currentScreenId) return;
    const r = simulateScreenEnter(graph, state, state.currentScreenId);
    if (r.events.length) {
      setState(r.state);
      setFeed((prev) => [...prev, ...r.events]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentScreenId]);

  const roles = listRoles(graph);
  const screen = state.currentScreenId
    ? buildScreenViewModel(graph, state, state.currentScreenId)
    : null;

  const onActivate = (uiElementId: string) => {
    const r = simulateUiActivation(graph, state, uiElementId);
    setState(r.state);
    setFeed((prev) => [...prev, ...r.events]);
  };

  const onResetSimulation = () => {
    setState(initialSimState(graph));
    setFeed([]);
  };

  const screensExist = nodes.some((n) => n.type === 'SCREEN');

  return (
    <div className="pb-sim">
      <header className="pb-sim__bar">
        <div className="pb-sim__left">
          <Pill mono tone="accent">
            simulation
          </Pill>
          <select
            className="pb-input pb-select pb-sim__role"
            value={state.currentRoleId ?? ''}
            onChange={(e) => {
              const next = e.target.value || null;
              setState((s) => ({ ...s, currentRoleId: next }));
            }}
          >
            <option value="">— no role —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            className="pb-input pb-select pb-sim__screen"
            value={state.currentScreenId ?? ''}
            onChange={(e) => {
              const next = e.target.value || null;
              setState((s) => ({ ...s, currentScreenId: next }));
            }}
          >
            <option value="">— pick a screen —</option>
            {nodes
              .filter((n) => n.type === 'SCREEN')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
        <div className="pb-sim__right">
          <Button variant="ghost" iconLeft="rotate-ccw" onClick={onResetSimulation}>
            Reset
          </Button>
          <Button variant="primary" iconLeft="log-out" onClick={() => setMode('design')}>
            Exit simulation
          </Button>
        </div>
      </header>

      <div className="pb-sim__body">
        <div className="pb-sim__stage">
          {!screensExist ? (
            <div className="pb-empty">No screens to simulate. Add a SCREEN node first.</div>
          ) : !screen ? (
            <div className="pb-empty">Pick a screen to begin.</div>
          ) : screen.forbidden ? (
            <ForbiddenScreen
              screen={screen.screen}
              setScreen={(id) => setState((s) => ({ ...s, currentScreenId: id }))}
              fallback={findFirstScreen(graph)}
            />
          ) : (
            <SimulatedScreen
              vm={screen}
              state={state}
              onActivate={onActivate}
            />
          )}
        </div>

        <aside className="pb-sim__feed">
          <div className="pb-sim__feed-title">Activity</div>
          {feed.length === 0 ? (
            <div className="pb-empty pb-empty--inline">No events yet.</div>
          ) : (
            <ul>
              {feed.slice().reverse().map((event, idx) => (
                <li key={idx} className={`pb-sim__event pb-sim__event--${event.kind}`}>
                  <Icon name={iconForEvent(event.kind)} size={12} />
                  <span>{event.message}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function ForbiddenScreen({
  screen,
  setScreen,
  fallback,
}: {
  screen: AnyNode;
  setScreen: (id: string | null) => void;
  fallback: string | null;
}) {
  return (
    <div className="pb-card pb-sim__screen pb-sim__screen--forbidden">
      <Icon name="shield-alert" size={20} />
      <h3 className="pb-h4">Forbidden</h3>
      <p className="pb-body-sm">
        “{screen.name}” is restricted for the current role.
      </p>
      {fallback && (
        <Button onClick={() => setScreen(fallback)} iconLeft="arrow-up-right">
          Go to first screen
        </Button>
      )}
    </div>
  );
}

function SimulatedScreen({
  vm,
  state,
  onActivate,
}: {
  vm: NonNullable<ReturnType<typeof buildScreenViewModel>>;
  state: SimState;
  onActivate: (uiId: string) => void;
}) {
  return (
    <div className="pb-card pb-sim__screen">
      <header className="pb-sim__screen-head">
        <h3 className="pb-h4">{vm.screen.name}</h3>
        {(vm.screen.data as { description?: string })?.description && (
          <p className="pb-body-sm">{(vm.screen.data as { description?: string }).description}</p>
        )}
      </header>

      {vm.uiElements.length === 0 ? (
        <div className="pb-empty pb-empty--inline">
          No UI elements on this screen yet.
        </div>
      ) : (
        <div className="pb-sim__ui-list">
          {vm.uiElements.map(({ node, forbidden }) => (
            <SimulatedUi
              key={node.id}
              node={node}
              forbidden={forbidden}
              onActivate={onActivate}
            />
          ))}
        </div>
      )}

      {vm.reads.length > 0 && (
        <div className="pb-sim__reads">
          <div className="pb-eyebrow">Last responses</div>
          {vm.reads.map(({ endpoint, response }) => (
            <details key={endpoint.id} className="pb-sim__read">
              <summary>
                <span className="pb-pill pb-pill--mono">
                  {(endpoint.data as { method?: string }).method ?? '???'}
                </span>
                <span className="pb-mono">{(endpoint.data as { path?: string }).path}</span>
                {response?.status === 'forbidden' && (
                  <span className="pb-pill pb-pill--danger">forbidden</span>
                )}
              </summary>
              <pre className="pb-sim__payload">
                {JSON.stringify(response?.payload ?? null, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}

      {Object.keys(state.entities).length > 0 && (
        <details className="pb-sim__entities">
          <summary className="pb-eyebrow">Mock data</summary>
          {Object.entries(state.entities).map(([modelId, list]) => (
            <div key={modelId} className="pb-sim__entity-group">
              <div className="pb-mono pb-sim__entity-id">{modelId}</div>
              <pre className="pb-sim__payload">{JSON.stringify(list, null, 2)}</pre>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

function SimulatedUi({
  node,
  forbidden,
  onActivate,
}: {
  node: AnyNode;
  forbidden: boolean;
  onActivate: (id: string) => void;
}) {
  const data = node.data as UiElementData;
  const label = data.label || node.name;

  switch (data.kind) {
    case 'button':
      return (
        <button
          type="button"
          className="pb-btn pb-btn--primary"
          disabled={forbidden}
          onClick={() => onActivate(node.id)}
          title={forbidden ? 'Forbidden for current role' : undefined}
        >
          {label}
        </button>
      );
    case 'input':
      return (
        <input
          className="pb-input"
          placeholder={label}
          disabled={forbidden}
          readOnly
          onClick={() => onActivate(node.id)}
        />
      );
    case 'form':
      return (
        <form
          className="pb-sim__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!forbidden) onActivate(node.id);
          }}
        >
          <input className="pb-input" placeholder={label} readOnly />
          <Button variant="primary" type="submit" disabled={forbidden}>
            Submit
          </Button>
        </form>
      );
    case 'list':
      return (
        <div className="pb-sim__list">
          <div className="pb-eyebrow">{label}</div>
          <button
            type="button"
            className="pb-sim__list-refresh"
            onClick={() => onActivate(node.id)}
            disabled={forbidden}
          >
            Refresh
          </button>
        </div>
      );
    case 'modal':
      return (
        <button
          type="button"
          className="pb-btn"
          disabled={forbidden}
          onClick={() => onActivate(node.id)}
        >
          Open modal: {label}
        </button>
      );
    default:
      return null;
  }
}

function iconForEvent(kind: SimEvent['kind']): string {
  switch (kind) {
    case 'navigate':
      return 'arrow-up-right';
    case 'action':
      return 'zap';
    case 'api':
      return 'cloud';
    case 'mutation':
      return 'database';
    case 'restricted':
      return 'shield-alert';
  }
}
