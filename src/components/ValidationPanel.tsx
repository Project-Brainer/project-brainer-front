import clsx from 'clsx';
import { validationApi } from '../api/validation';
import type { ValidationIssue } from '../api/types';
import { Button } from './Button';
import { Icon } from './Icon';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';

export function ValidationPanel() {
  const projectId = useGraphStore((s) => s.project?.id ?? null);
  const issues = useUiStore((s) => s.validationIssues);
  const running = useUiStore((s) => s.validationRunning);
  const ranAt = useUiStore((s) => s.validationRunAt);
  const error = useUiStore((s) => s.validationError);
  const setValidation = useUiStore((s) => s.setValidation);
  const setRunning = useUiStore((s) => s.setValidationRunning);
  const setError = useUiStore((s) => s.setValidationError);
  const selectNode = useUiStore((s) => s.selectNode);
  const selectEdge = useUiStore((s) => s.selectEdge);
  const focusNode = useUiStore((s) => s.focusNode);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warnCount = issues.filter((i) => i.severity === 'warning').length;
  const hasRun = ranAt !== null;

  const run = async () => {
    if (!projectId) return;
    setRunning(true);
    try {
      const result = await validationApi.run(projectId);
      setValidation(result.issues);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="pb-validation-panel">
      <div className="pb-validation-panel__head">
        <div className="pb-validation-panel__title">
          <Icon name="shield-alert" size={14} />
          <span>Validation</span>
        </div>
        <Button size="sm" variant="ghost" onClick={run} loading={running}>
          Run check
        </Button>
      </div>

      {error && (
        <div className="pb-banner pb-banner--danger">
          {error}
        </div>
      )}

      {issues.length === 0 ? (
        running ? (
          <div className="pb-validation-empty">Checking…</div>
        ) : hasRun ? (
          <div className="pb-validation-summary">
            <span className="pb-pill pb-pill--success">All clear</span>
          </div>
        ) : (
          <div className="pb-validation-empty">
            Run check to validate the graph.
          </div>
        )
      ) : (
        <>
          <div className="pb-validation-summary">
            {errorCount > 0 && (
              <span className="pb-pill pb-pill--danger">{errorCount} error{errorCount === 1 ? '' : 's'}</span>
            )}
            {warnCount > 0 && (
              <span className="pb-pill pb-pill--warning">{warnCount} warning{warnCount === 1 ? '' : 's'}</span>
            )}
            {errorCount === 0 && warnCount === 0 && (
              <span className="pb-pill pb-pill--success">All clear</span>
            )}
          </div>

          <ul className="pb-validation-list">
            {issues.map((issue, i) => {
              const hasTarget = Boolean(issue.nodeId || issue.edgeId);
              return (
                <li
                  key={i}
                  className={clsx(
                    'pb-validation-item',
                    `pb-validation-item--${issue.severity}`,
                    !hasTarget && 'pb-validation-item--inert',
                  )}
                >
                  <button
                    type="button"
                    className="pb-validation-item__btn"
                    disabled={!hasTarget}
                    onClick={
                      hasTarget
                        ? () => focusIssue(issue, selectNode, selectEdge, focusNode)
                        : undefined
                    }
                  >
                    <span className="pb-validation-item__head">
                      <span className="pb-validation-item__code pb-mono">
                        {issue.code}
                      </span>
                    </span>
                    <span className="pb-validation-item__msg">
                      {issue.message}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function focusIssue(
  issue: ValidationIssue,
  selectNode: (id: string | null) => void,
  selectEdge: (id: string | null) => void,
  focusNode: (id: string) => void,
) {
  if (issue.nodeId) {
    selectNode(issue.nodeId);
    focusNode(issue.nodeId);
  } else if (issue.edgeId) {
    selectEdge(issue.edgeId);
  }
}
