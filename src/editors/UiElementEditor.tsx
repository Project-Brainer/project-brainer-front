import type { AnyNode, UiElementData, UiElementKind } from '../api/types';
import { UI_ELEMENT_KINDS } from '../api/types';
import { Input, Select } from '../components/Field';
import { useGraphStore, selectNodesByType } from '../store/graphStore';

export function UiElementEditor({ node }: { node: AnyNode }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const screens = useGraphStore((s) => selectNodesByType(s, 'SCREEN'));
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
