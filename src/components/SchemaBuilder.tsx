import { useCallback, useMemo, useState } from 'react';
import type { SchemaField, SchemaFieldType } from '../api/types';
import { SCHEMA_FIELD_TYPES } from '../api/types';
import { useGraphStore } from '../store/graphStore';
import { Button } from './Button';
import { Checkbox } from './Field';
import { Icon } from './Icon';

/** Types that require a Data Model reference. */
const REF_TYPES: ReadonlySet<SchemaFieldType> = new Set(['object', 'array<object>']);

export interface SchemaBuilderProps {
  label?: string;
  value: unknown;
  onChange: (value: unknown) => void;
  /** ID of the API Endpoint node — used for UPDATES edge syncing. */
  nodeId: string;
  rows?: number;
}

// ---------------------------------------------------------------------------
// Schema ↔ fields conversion helpers
// ---------------------------------------------------------------------------

function schemaToFields(schema: unknown): SchemaField[] {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return [];
  return Object.entries(schema as Record<string, unknown>).map(([name, val]) => {
    if (typeof val !== 'object' || val === null) {
      return { name, type: 'string' as SchemaFieldType, required: false };
    }
    const v = val as Record<string, unknown>;
    return {
      name,
      type: (v.type as SchemaFieldType) ?? 'string',
      required: Boolean(v.required),
      ref: typeof v.$ref === 'string' && v.$ref ? v.$ref : undefined,
      enumValues: Array.isArray(v.enumValues) ? (v.enumValues as string[]) : undefined,
    };
  });
}

function fieldsToSchema(fields: SchemaField[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const f of fields) {
    const entry: Record<string, unknown> = { type: f.type, required: f.required };
    if (REF_TYPES.has(f.type) && f.ref) entry.$ref = f.ref;
    if (f.type === 'enum' && f.enumValues?.length) entry.enumValues = f.enumValues;
    result[f.name] = entry;
  }
  return result;
}

/** Extract all $ref values from a schema object (top-level only). */
function extractRefs(schema: unknown): Set<string> {
  const refs = new Set<string>();
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return refs;
  for (const val of Object.values(schema as Record<string, unknown>)) {
    if (typeof val === 'object' && val !== null) {
      const v = val as Record<string, unknown>;
      if (typeof v.$ref === 'string' && v.$ref.trim()) refs.add(v.$ref.trim());
    }
  }
  return refs;
}

function stringify(v: unknown): string {
  if (v === undefined || v === null) return '';
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

function sanitizeField(f: SchemaField): SchemaField {
  if (!REF_TYPES.has(f.type)) {
    // Strip ref for non-object types
    const { ref: _ref, ...rest } = f;
    void _ref;
    if (f.type !== 'enum') {
      const { enumValues: _ev, ...noEnum } = rest;
      void _ev;
      return noEnum;
    }
    return rest;
  }
  // For object/array<object> — strip enumValues
  const { enumValues: _ev, ...rest } = f;
  void _ev;
  return rest;
}

// ---------------------------------------------------------------------------
// Edge sync — reads fresh store state at call time (no stale closure risk)
// ---------------------------------------------------------------------------

function useSyncEdges(nodeId: string) {
  return useCallback(
    async (schema: unknown) => {
      const { nodes, edges, createEdge, deleteEdge, createNode } =
        useGraphStore.getState();

      const refs = extractRefs(schema);
      const endpointNode = nodes.find((n) => n.id === nodeId);
      const dataModelNodes = nodes.filter((n) => n.type === 'DATA_MODEL');
      const updatesEdges = edges.filter(
        (e) => e.sourceId === nodeId && e.type === 'UPDATES',
      );

      // Ensure each ref has a DATA_MODEL node + UPDATES edge
      let refIndex = 0;
      for (const ref of refs) {
        let dmNode = dataModelNodes.find((n) => n.name === ref);
        if (!dmNode) {
          const baseX = endpointNode ? endpointNode.position.x + 320 : 400;
          const baseY = endpointNode
            ? endpointNode.position.y + refIndex * 150
            : 200 + refIndex * 150;
          dmNode =
            (await createNode({
              type: 'DATA_MODEL',
              name: ref,
              position: { x: baseX, y: baseY },
            })) ?? undefined;
        }
        if (!dmNode) { refIndex++; continue; }

        const edgeExists = updatesEdges.some((e) => e.targetId === dmNode!.id);
        if (!edgeExists) {
          await createEdge({
            sourceId: nodeId,
            targetId: dmNode.id,
            type: 'UPDATES',
          });
        }
        refIndex++;
      }

      // Remove stale UPDATES edges for models no longer in schema
      // Re-read nodes after possible createNode calls
      const freshNodes = useGraphStore.getState().nodes;
      for (const edge of updatesEdges) {
        const target = freshNodes.find((n) => n.id === edge.targetId);
        if (target && !refs.has(target.name)) {
          await deleteEdge(edge.id);
        }
      }
    },
    [nodeId],
  );
}

// ---------------------------------------------------------------------------
// SchemaBuilder component
// ---------------------------------------------------------------------------

export function SchemaBuilder({
  label,
  value,
  onChange,
  nodeId,
  rows = 5,
}: SchemaBuilderProps) {
  const [mode, setMode] = useState<'builder' | 'json'>('builder');
  const [jsonText, setJsonText] = useState(() => stringify(value ?? {}));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [fields, setFields] = useState<SchemaField[]>(() =>
    schemaToFields(value),
  );

  const allNodes = useGraphStore((s) => s.nodes);
  const dataModelNodes = useMemo(
    () => allNodes.filter((n) => n.type === 'DATA_MODEL'),
    [allNodes],
  );

  const syncEdges = useSyncEdges(nodeId);

  // ---- mode switching ----

  const switchToBuilder = () => {
    try {
      const parsed = jsonText.trim() ? JSON.parse(jsonText) : {};
      setFields(schemaToFields(parsed));
      setJsonError(null);
      setMode('builder');
    } catch (err) {
      setJsonError((err as Error).message);
    }
  };

  const switchToJson = () => {
    const schema = fieldsToSchema(fields);
    setJsonText(stringify(schema));
    setJsonError(null);
    setMode('json');
  };

  // ---- builder operations ----

  const commitFields = (next: SchemaField[]) => {
    setFields(next);
    const schema = fieldsToSchema(next);
    onChange(schema);
    void syncEdges(schema);
  };

  const addField = () =>
    commitFields([
      ...fields,
      { name: `field${fields.length + 1}`, type: 'string', required: false },
    ]);

  const updateField = (i: number, patch: Partial<SchemaField>) =>
    commitFields(
      fields.map((f, idx) =>
        idx === i ? sanitizeField({ ...f, ...patch }) : f,
      ),
    );

  const removeField = (i: number) =>
    commitFields(fields.filter((_, idx) => idx !== i));

  // ---- JSON commit (on blur) ----

  const commitJson = () => {
    if (jsonText.trim() === '') {
      setJsonError(null);
      onChange({});
      void syncEdges({});
      return;
    }
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError(null);
      onChange(parsed);
      void syncEdges(parsed);
    } catch (err) {
      setJsonError((err as Error).message);
    }
  };

  // ---- render ----

  const datalistId = `dm-list-${nodeId}`;

  return (
    <div className={`pb-field pb-schema-builder${jsonError ? ' pb-field--error' : ''}`}>
      {/* Header row: label + mode toggle */}
      <div className="pb-schema-builder__header">
        {label && <span className="pb-schema-builder__label">{label}</span>}
        <div className="pb-schema-mode">
          <button
            type="button"
            className={`pb-schema-mode__btn${mode === 'builder' ? ' pb-schema-mode__btn--active' : ''}`}
            onClick={mode === 'json' ? switchToBuilder : undefined}
          >
            Builder
          </button>
          <button
            type="button"
            className={`pb-schema-mode__btn${mode === 'json' ? ' pb-schema-mode__btn--active' : ''}`}
            onClick={mode === 'builder' ? switchToJson : undefined}
          >
            JSON
          </button>
        </div>
      </div>

      {/* Builder mode */}
      {mode === 'builder' && (
        <div>
          <div className="pb-fields-list">
            {fields.length === 0 && (
              <div className="pb-empty pb-empty--inline">
                No fields yet. Click + to add.
              </div>
            )}
            {fields.map((field, i) => (
              <div key={i} className="pb-field-row">
                {/* Name + Type + Delete */}
                <div className="pb-field-row__head pb-schema-field-head">
                  <input
                    className="pb-input"
                    placeholder="field name"
                    value={field.name}
                    onChange={(e) => updateField(i, { name: e.target.value })}
                  />
                  <select
                    className="pb-input pb-select"
                    value={field.type}
                    onChange={(e) =>
                      updateField(i, {
                        type: e.target.value as SchemaFieldType,
                      })
                    }
                  >
                    {SCHEMA_FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="pb-icon-btn"
                    onClick={() => removeField(i)}
                    aria-label="Remove field"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>

                {/* Options row */}
                <div className="pb-field-row__opts">
                  <Checkbox
                    checked={field.required}
                    onChange={(v) => updateField(i, { required: v })}
                    label="required"
                  />

                  {/* Data Model picker — shown only for object / array<object> */}
                  {REF_TYPES.has(field.type) && (
                    <div className="pb-schema-ref">
                      <span className="pb-schema-ref__label">Data Model</span>
                      <input
                        className="pb-input pb-schema-ref__input"
                        list={datalistId}
                        placeholder="Model name (existing or new)..."
                        value={field.ref ?? ''}
                        onChange={(e) =>
                          updateField(i, {
                            ref: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                  )}

                  {/* Enum values — shown only for enum type */}
                  {field.type === 'enum' && (
                    <input
                      className="pb-input"
                      placeholder="value1, value2, ..."
                      value={(field.enumValues ?? []).join(', ')}
                      onChange={(e) =>
                        updateField(i, {
                          enumValues: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
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
      )}

      {/* JSON mode */}
      {mode === 'json' && (
        <textarea
          className="pb-textarea pb-textarea--mono"
          rows={rows}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          onBlur={commitJson}
          spellCheck={false}
        />
      )}

      {jsonError && <div className="pb-field__error">{jsonError}</div>}

      {/* Datalist for Data Model autocomplete */}
      <datalist id={datalistId}>
        {dataModelNodes.map((n) => (
          <option key={n.id} value={n.name} />
        ))}
      </datalist>
    </div>
  );
}
