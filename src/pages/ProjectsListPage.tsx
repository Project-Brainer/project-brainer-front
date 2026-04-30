import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Project, ProjectGraph } from '../api/types';
import { graphApi } from '../api/graph';
import { projectsApi } from '../api/projects';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { Input, Textarea } from '../components/Field';

export function ProjectsListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [importingFor, setImportingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      setProjects(await projectsApi.list());
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDuplicate = async (project: Project) => {
    try {
      const graph = await graphApi.exportJson(project.id);
      const fresh = await projectsApi.create({
        name: `${project.name} copy`,
        description: project.description ?? undefined,
      });
      await graphApi.importJson(fresh.id, {
        nodes: graph.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          name: n.name,
          position: n.position,
          data: n.data,
        })),
        edges: graph.edges.map((e) => ({
          id: e.id,
          sourceId: e.sourceId,
          targetId: e.targetId,
          type: e.type,
          label: e.label ?? undefined,
          data: e.data,
        })),
        viewport: project.viewport,
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleExport = async (project: Project) => {
    try {
      const graph = await graphApi.exportJson(project.id);
      downloadJson(graph, slugify(project.name) + '.brainer.json');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleImportClick = (projectId: string) => {
    setImportingFor(projectId);
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importingFor) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ProjectGraph | { nodes?: unknown };
      const body = ('project' in parsed
        ? parsed
        : (parsed as ProjectGraph)) as ProjectGraph;
      await graphApi.importJson(importingFor, {
        nodes: body.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          name: n.name,
          position: n.position,
          data: n.data,
        })),
        edges: body.edges.map((edge) => ({
          id: edge.id,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          type: edge.type,
          label: edge.label ?? undefined,
          data: edge.data,
        })),
        viewport: body.project?.viewport,
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImportingFor(null);
      e.target.value = '';
    }
  };

  return (
    <div className="pb-projects-page">
      <header className="pb-projects-page__header">
        <div className="pb-projects-page__brand">
          <img src="/brainer-wordmark.svg" alt="Brainer" height={20} />
        </div>
        <Button
          variant="primary"
          iconLeft="plus"
          onClick={() => setCreating(true)}
        >
          New project
        </Button>
      </header>

      <main className="pb-projects-page__main">
        <h1 className="pb-display pb-projects-page__title">
          Your <em>projects</em>.
        </h1>
        <p className="pb-body pb-projects-page__sub">
          Visual logic for software products. Pick one to design, simulate, or
          generate a prompt.
        </p>

        {error && <div className="pb-banner pb-banner--danger">{error}</div>}
        {successMessage && (
          <div className="pb-banner pb-banner--success">{successMessage}</div>
        )}

        <div className="pb-projects-grid">
          {projects === null ? (
            <div className="pb-empty">
              <Icon name="loader" spin /> Loading projects…
            </div>
          ) : projects.length === 0 ? (
            <div className="pb-empty">
              Empty. Create your first project to begin.
            </div>
          ) : (
            projects.map((p) => (
              <div className="pb-project-card" key={p.id}>
                <div className="pb-project-card__body">
                  <Link to={`/projects/${p.id}`} className="pb-project-card__title">
                    {p.name}
                  </Link>
                  <p className="pb-project-card__desc">
                    {p.description || 'No description.'}
                  </p>
                  <div className="pb-project-card__meta pb-mono">
                    Updated {new Date(p.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="pb-project-card__actions">
                  <Button size="sm" onClick={() => navigate(`/projects/${p.id}`)} iconLeft="arrow-up-right">
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDuplicate(p)}
                    iconLeft="copy"
                  >
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleExport(p)}
                    iconLeft="download"
                  >
                    Export
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleImportClick(p.id)}
                    iconLeft="upload"
                  >
                    Import
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeletingProject(p)}
                    iconLeft="trash"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      {creating && (
        <CreateProjectModal
          onClose={() => setCreating(false)}
          onCreated={(p) => {
            setCreating(false);
            navigate(`/projects/${p.id}`);
          }}
        />
      )}

      {deletingProject && (
        <DeleteProjectModal
          project={deletingProject}
          onClose={() => setDeletingProject(null)}
          onDeleted={async () => {
            const name = deletingProject.name;
            setDeletingProject(null);
            await refresh();
            showSuccess(`Проект «${name}» удалён.`);
          }}
        />
      )}
    </div>
  );
}

function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal
      open
      onClose={onClose}
      title="New project"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            disabled={!name.trim()}
            onClick={async () => {
              setSubmitting(true);
              setError(null);
              try {
                const created = await projectsApi.create({
                  name: name.trim(),
                  description: description.trim() || undefined,
                });
                onCreated(created);
              } catch (err) {
                setError((err as Error).message);
                setSubmitting(false);
              }
            }}
          >
            Create
          </Button>
        </>
      }
    >
      <Input
        label="Name"
        autoFocus
        placeholder="e.g. Task tracker"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Textarea
        label="Description"
        placeholder="A short, plain description (optional)."
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && <div className="pb-banner pb-banner--danger">{error}</div>}
    </Modal>
  );
}

function DeleteProjectModal({
  project,
  onClose,
  onDeleted,
}: {
  project: Project;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await projectsApi.remove(project.id);
      onDeleted();
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  };

  return (
    <Modal
      open
      onClose={deleting ? () => {} : onClose}
      title="Удалить проект?"
      width={440}
      footer={
        <>
          <Button
            variant="ghost"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            disabled={deleting}
            onClick={onClose}
          >
            Отмена
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            onClick={handleDelete}
          >
            Удалить
          </Button>
        </>
      }
    >
      <p className="pb-body" style={{ margin: 0 }}>
        Проект <strong>{project.name}</strong> будет удалён вместе со всеми
        узлами и связями. Это действие необратимо.
      </p>
      {error && (
        <div className="pb-banner pb-banner--danger" style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
          {error}
        </div>
      )}
    </Modal>
  );
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}
