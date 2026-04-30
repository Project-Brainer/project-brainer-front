import type { AnyNode, ScreenData } from '../api/types';
import { Textarea } from '../components/Field';
import { useGraphStore } from '../store/graphStore';

export function ScreenEditor({ node }: { node: AnyNode }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const data = (node.data as ScreenData) ?? {};
  return (
    <Textarea
      label="Description"
      hint="optional"
      placeholder="What this screen does."
      rows={4}
      value={data.description ?? ''}
      onChange={(e) =>
        updateNode(node.id, {
          data: { ...data, description: e.target.value },
        })
      }
    />
  );
}
