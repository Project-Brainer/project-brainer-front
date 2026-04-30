import { useMemo } from 'react';
import type { AnyNode, UiElementData, UiElementKind } from '../api/types';
import { UI_ELEMENT_KINDS } from '../api/types';
import { Input, Select } from '../components/Field';
import { useGraphStore } from '../store/graphStore';

export function UiElementEditor({ node }: { node: AnyNode }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  // Read stable `nodes` reference and filter via useMemo — passing a filtered
  // array straight from the selector breaks Zustand's snapshot cache check.
  const allNodes = useGraphStore((s) => s.nodes);
  const screens = useMemo(
    () => allNodes.filter((n) => n.type === 'SCREEN'),
    [allNodes],
  );
  const data = (node.data as UiElementData) ?? { kind: 'button', screenId: '' };

  const screenOptions = [
    { value: '', label: '— select a screen —' },
    ...screens.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <>
      <Select<UiElementKind>
        label="Kind"
        value={data.kind}
        options={UI_ELEMENT_KINDS.map((k) => ({ value: k, label: k }))}
        onChange={(value) =>
          updateNode(node.id, {
            data: { ...data, kind: value },
          })
        }
      />
      <Select
        label="Belongs to screen"
        hint="required"
        value={data.screenId}
        options={screenOptions}
        onChange={(value) =>
          updateNode(node.id, {
            data: { ...data, screenId: value },
          })
        }
      />
      <Input
        label="Label"
        hint="optional"
        placeholder="Button text or input placeholder"
        value={data.label ?? ''}
        onChange={(e) =>
          updateNode(node.id, {
            data: { ...data, label: e.target.value },
          })
        }
      />
    </>
  );
}
