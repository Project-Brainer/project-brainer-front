import type {
  AnyNode,
  DataModelData,
  DataModelField,
  FieldType,
} from '../api/types';
import { FIELD_TYPES } from '../api/types';
import { Button } from '../components/Button';
import { ChipInput } from '../components/ChipInput';
import { Checkbox, Input, Select } from '../components/Field';
import { Icon } from '../components/Icon';
import { useGraphStore } from '../store/graphStore';

export function DataModelEditor({ node }: { node: AnyNode }) {
  const updateNode = useGraphStore((s) => s.updateNode);
  const data = (node.data as DataModelData) ?? { fields: [] };

  const setFields = (fields: DataModelField[]) =>
    updateNode(node.id, { data: { ...data, fields } });

  const addField = () =>
    setFields([
      ...data.fields,
      { name: `field${data.fields.length + 1}`, type: 'string', required: false },
    ]);

  const updateField = (index: number, patch: Partial<DataModelField>) => {
    const next = data.fields.map((f, i) =>
      i === index ? sanitizeField({ ...f, ...patch }) : f,
    );
    setFields(next);
  };

  const removeField = (index: number) =>
    setFields(data.fields.filter((_, i) => i !== index));

  return (
    <div>
      <div className="pb-fields-list">
        {data.fields.length === 0 && (
          <div className="pb-empty pb-empty--inline">No fields yet.</div>
        )}
        {data.fields.map((field, i) => (
          <div key={i} className="pb-field-row">
            <div className="pb-field-row__head">
              <Input
                placeholder="field name"
                value={field.name}
                onChange={(e) => updateField(i, { name: e.target.value })}
                className="pb-field-row__name"
              />
              <Select<FieldType>
                value={field.type}
                options={FIELD_TYPES.map((t) => ({ value: t, label: t }))}
                onChange={(value) => updateField(i, { type: value })}
                className="pb-field-row__type"
              />
              <button
                type="button"
                className="pb-icon-btn"
                onClick={() => removeField(i)}
                aria-label="Remove field"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
            <div className="pb-field-row__opts">
              <Checkbox
                checked={field.required}
                onChange={(v) => updateField(i, { required: v })}
                label="required"
              />
              {field.type === 'enum' && (
                <ChipInput
                  values={field.enumValues ?? []}
                  onChange={(values) => updateField(i, { enumValues: values })}
                  placeholder="value, value, ..."
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <Button
        size="sm"
        variant="ghost"
        iconLeft="plus"
        onClick={addField}
        className="pb-fields-add"
      >
        Add field
      </Button>
    </div>
  );
}

function sanitizeField(f: DataModelField): DataModelField {
  if (f.type === 'enum') {
    return { ...f, enumValues: f.enumValues ?? [] };
  }
  // Strip enumValues if user changed type away from enum.
  const { enumValues: _enumValues, ...rest } = f;
  void _enumValues;
  return rest;
}
