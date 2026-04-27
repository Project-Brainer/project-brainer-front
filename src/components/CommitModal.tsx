import { useState } from 'react';
import { branchesApi } from '../api/branches';
import { useGraphStore } from '../store/graphStore';
import { useBranchStore } from '../store/branchStore';
import { Button } from './Button';
import { Icon } from './Icon';
import { Modal } from './Modal';

export function CommitModal() {
  const open = useBranchStore((s) => s.commitModalOpen);
  const close = useBranchStore((s) => s.closeCommitModal);
  const activeBranchId = useBranchStore((s) => s.activeBranchId);
  const project = useGraphStore((s) => s.project);
  const flushSave = useGraphStore((s) => s.flushSave);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleCommit = async () => {
    if (!project || !activeBranchId || !message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await flushSave();
      await branchesApi.createCommit(project.id, activeBranchId, message.trim());
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setMessage('');
        close();
      }, 1200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setMessage('');
    setError(null);
    setDone(false);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <span className="pb-prompt-title">
          <Icon name="bookmark" size={16} />
          <span>Save checkpoint</span>
        </span>
      }
      width={440}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            iconLeft={done ? 'check' : 'bookmark'}
            onClick={handleCommit}
            disabled={!message.trim() || loading || done}
          >
            {done ? 'Saved!' : loading ? 'Saving…' : 'Save checkpoint'}
          </Button>
        </>
      }
    >
      <div className="pb-field">
        <label className="pb-field__label">Checkpoint message</label>
        <input
          className="pb-input"
          autoFocus
          placeholder="e.g. Add login flow with auth API"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCommit();
          }}
          disabled={loading || done}
        />
        <span className="pb-field__hint">
          Describe the current state of the branch. You can restore from any checkpoint.
        </span>
      </div>
      {error && <div className="pb-banner pb-banner--danger">{error}</div>}
    </Modal>
  );
}
