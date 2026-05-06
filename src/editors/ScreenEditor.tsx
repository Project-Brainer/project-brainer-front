import type { AnyNode, ScreenData, Slot } from '../api/types';
import { Textarea } from '../components/Field';
import { useGraphStore } from '../store/graphStore';
import { SlotsEditor } from './SlotsEditor';

export function ScreenEditor({ node }: { node: AnyNode }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const data = (node.data as ScreenData) ?? {};
  return (
    <>
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
      <SlotsEditor
        nodeType="SCREEN"
        slots={data.slots ?? []}
        onChange={(slots: Slot[]) =>
          updateNode(node.id, {
            data: { ...data, slots: slots.length > 0 ? slots : undefined },
          })
        }
      />
    </>
  );
}
