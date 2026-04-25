import { useEffect, useState } from 'react';
import { promptApi } from '../api/prompt';
import { validationApi } from '../api/validation';
import type { PromptResponse } from '../api/types';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';
import { Button } from './Button';
import { Icon } from './Icon';
import { Modal } from './Modal';

type Tab = 'markdown' | 'json';

export function PromptModal() {
  const open = useUiStore((s) => s.promptModalOpen);
  const close = useUiStore((s) => s.closePromptModal);
  const scope = useUiStore((s) => s.promptScopeNodeIds);
  const project = useGraphStore((s) => s.project);
  const flushSave = useGraphStore((s) => s.flushSave);
  const setValidation = useUiStore((s) => s.setValidation);

  const [tab, setTab] = useState<Tab>('markdown');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PromptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !project) return;
    setLoading(true);
    setData(null);
    setError(null);
    setCopied(false);
    setTab('markdown');

    (async () => {
      try {
        await flushSave();
        const validation = await validationApi.run(project.id);
        setValidation(validation.issues);
        if (!validation.valid) {
          const errs = validation.issues.filter((i) => i.severity === 'error');
          setError(
            `Cannot generate prompt — fix ${errs.length} error${
              errs.length === 1 ? '' : 's'
            } first.`,
          );
          setLoading(false);
          return;
        }
        const result = await promptApi.generate(project.id, {
          nodeIds: scope ?? undefined,
        });
        setData(result);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, project, scope, flushSave, setValidation]);

  const handleCopy = async () => {
    if (!data) return;
    const text =
      tab === 'markdown' ? data.prompt : JSON.stringify(data.structured, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.structured, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name ?? 'project'}.brainer-prompt.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={
        <span className="pb-prompt-title">
          <Icon name="zap" size={16} />
          <span>{scope ? 'Prompt for selection' : 'Project prompt'}</span>
        </span>
      }
      width={760}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Close
          </Button>
          {data && tab === 'json' && (
            <Button variant="ghost" iconLeft="download" onClick={handleDownload}>
              Download JSON
            </Button>
          )}
          {data && (
            <Button
              variant="primary"
              iconLeft={copied ? 'check' : 'copy'}
              onClick={handleCopy}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          )}
        </>
      }
    >
      <div className="pb-prompt-tabs">
        <button
          type="button"
          className={`pb-prompt-tab ${tab === 'markdown' ? 'is-active' : ''}`}
          onClick={() => setTab('markdown')}
        >
          Markdown
        </button>
        <button
          type="button"
          className={`pb-prompt-tab ${tab === 'json' ? 'is-active' : ''}`}
          onClick={() => setTab('json')}
        >
          Structured
        </button>
      </div>

      {loading && (
        <div className="pb-empty">
          <Icon name="loader" spin /> Generating…
        </div>
      )}
      {error && <div className="pb-banner pb-banner--danger">{error}</div>}
      {!loading && !error && data && (
        <pre className="pb-prompt-body">
          {tab === 'markdown'
            ? data.prompt
            : JSON.stringify(data.structured, null, 2)}
        </pre>
      )}
    </Modal>
  );
}
