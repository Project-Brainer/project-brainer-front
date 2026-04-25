import { useMemo } from 'react';
import type { AnyNode, ApiEndpointData, HttpMethod } from '../api/types';
import { HTTP_METHODS } from '../api/types';
import { ChipInput } from '../components/ChipInput';
import { Input, Select } from '../components/Field';
import { JsonEditor } from '../components/JsonEditor';
import { useGraphStore } from '../store/graphStore';

export function ApiEndpointEditor({ node }: { node: AnyNode }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  // Read stable `nodes` reference, then filter in render. Selecting a filtered
  // array directly would return a new array each call and trip Zustand's
  // `getSnapshot should be cached` check (infinite-loop guard).
  const allNodes = useGraphStore((s) => s.nodes);
  const roleNodes = useMemo(
    () => allNodes.filter((n) => n.type === 'ROLE'),
    [allNodes],
  );

  const data: ApiEndpointData =
    (node.data as ApiEndpointData) ?? {
      method: 'GET',
      path: '/',
      request: {},
      response: {},
      allowedRoles: [],
    };

  const roleSuggestions = useMemo(
    () => roleNodes.map((r) => r.name),
    [roleNodes],
  );

  const pathError =
    data.path && !data.path.startsWith('/')
      ? 'Path must start with "/"'
      : undefined;

  return (
    <>
      <div className="pb-row pb-row--method-path">
        <Select<HttpMethod>
          label="Method"
          value={data.method}
          options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}
          onChange={(value) =>
            updateNode(node.id, { data: { ...data, method: value } })
          }
        />
        <Input
          label="Path"
          placeholder="/projects/:id"
          value={data.path}
          error={pathError}
          onChange={(e) =>
            updateNode(node.id, { data: { ...data, path: e.target.value } })
          }
        />
      </div>
      <JsonEditor
        key={`${node.id}-request`}
        label="Request schema"
        hint="JSON"
        value={data.request ?? {}}
        onChange={(v) => updateNode(node.id, { data: { ...data, request: v } })}
        rows={5}
      />
      <JsonEditor
        key={`${node.id}-response`}
        label="Response schema"
        hint="JSON"
        value={data.response ?? {}}
        onChange={(v) =>
          updateNode(node.id, { data: { ...data, response: v } })
        }
        rows={5}
      />
      <div className="pb-field">
        <label className="pb-field__label">
          <span>Allowed roles</span>
          <span className="pb-field__hint">role names</span>
        </label>
        <ChipInput
          values={data.allowedRoles ?? []}
          suggestions={roleSuggestions}
          onChange={(values) =>
            updateNode(node.id, { data: { ...data, allowedRoles: values } })
          }
          placeholder="add a role and press enter"
        />
      </div>
    </>
  );
}
