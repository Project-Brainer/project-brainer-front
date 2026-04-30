import type { AnyNode } from '../api/types';
import { Button } from '../components/Button';
import { Input } from '../components/Field';
import { Icon } from '../components/Icon';
import { NODE_META } from '../lib/nodeMeta';
import { useGraphStore } from '../store/graphStore';
import { useUiStore } from '../store/uiStore';
import { ActionEditor } from './ActionEditor';
import { ApiEndpointEditor } from './ApiEndpointEditor';
import { DataModelEditor } from './DataModelEditor';
import { RoleEditor } from './RoleEditor';
import { ScreenEditor } from './ScreenEditor';
import { UiElementEditor } from './UiElementEditor';

export function NodeInspector({ node }: { node: AnyNode }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const deleteNode = useGraphStore((s) => s.deleteNode);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const meta = NODE_META[node.type];

  return (
    <div className="pb-inspector">
      <header className="pb-inspector__head">
        <div
          className="pb-node__chip"
          style={{ background: meta.bgVar, color: meta.fgVar }}
        >
          <Icon name={meta.iconName} size={12} />
          <span>{meta.shortLabel}</span>
        </div>
        <span className="pb-inspector__hint pb-mono">{meta.label}</span>
      </header>

      <Input
        label="Name"
        autoFocus
        value={node.name}
        onChange={(e) => updateNode(node.id, { name: e.target.value })}
      />

      <div className="pb-divider" />

      {node.type === 'SCREEN' && <ScreenEditor node={node} />}
      {node.type === 'UI_ELEMENT' && <UiElementEditor node={node} />}
      {node.type === 'DATA_MODEL' && <DataModelEditor node={node} />}
      {node.type === 'API_ENDPOINT' && <ApiEndpointEditor node={node} />}
      {node.type === 'ACTION' && <ActionEditor node={node} />}
      {node.type === 'ROLE' && <RoleEditor node={node} />}

      <div className="pb-divider" />

      <div className="pb-inspector__footer">
        <Button
          variant="danger"
          iconLeft="trash"
          onClick={async () => {
            if (
              !confirm(`Delete "${node.name || 'this node'}"? This can't be undone.`)
            )
              return;
            await deleteNode(node.id);
            clearSelection();
          }}
        >
          Delete node
        </Button>
      </div>
    </div>
  );
}
