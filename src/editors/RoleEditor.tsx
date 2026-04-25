import type { AnyNode, RoleData } from '../api/types';
import { Textarea } from '../components/Field';
import { useGraphStore } from '../store/graphStore';

export function RoleEditor({ node }: { node: AnyNode }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const data = (node.data as RoleData) ?? {};
  return (
    <Textarea
      label="Description"
      hint="optional"
      rows={4}
      placeholder="What this role can do."
      value={data.description ?? ''}
      onChange={(e) =>
        updateNode(node.id, {
          data: { ...data, description: e.target.value },
        })
      }
    />
  );
}
