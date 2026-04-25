import type { ActionData, ActionKind, AnyNode } from '../api/types';
import { ACTION_KINDS } from '../api/types';
import { Select, Textarea } from '../components/Field';
import { useGraphStore } from '../store/graphStore';

export function ActionEditor({ node }: { node: AnyNode }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const data = (node.data as ActionData) ?? { kind: 'click' };
  return (
    <>
      <Select<ActionKind>
        label="Kind"
        value={data.kind}
        options={ACTION_KINDS.map((k) => ({ value: k, label: k }))}
        onChange={(value) =>
          updateNode(node.id, { data: { ...data, kind: value } })
        }
      />
      <Textarea
        label="Description"
        hint="optional"
        rows={4}
        value={data.description ?? ''}
        onChange={(e) =>
          updateNode(node.id, {
            data: { ...data, description: e.target.value },
          })
        }
      />
    </>
  );
}
