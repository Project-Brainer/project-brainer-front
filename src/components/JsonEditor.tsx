import { useState } from 'react';
import { FieldShell } from './Field';

export interface JsonEditorProps {
  label?: string;
  hint?: string;
  value: unknown;
  onChange: (value: unknown) => void;
  rows?: number;
}

/**
 * Lightweight JSON editor — a textarea that parses on blur. We surface parse
 * errors inline rather than blocking user typing.
 *
 * To re-derive the textarea when the external `value` changes (e.g. switching
 * inspected node), the caller should pass a stable `key` prop — that remounts
 * this component cleanly without us having to track prop diffs ourselves.
 * That avoids set-state-in-render loops when the parent passes literal objects
 * like `data.request ?? {}` whose reference changes on every render.
 */
export function JsonEditor({
  label,
  hint,
  value,
  onChange,
  rows = 6,
}: JsonEditorProps) {
  const [text, setText] = useState(() => stringify(value));
  const [error, setError] = useState<string | null>(null);

  return (
    <FieldShell label={label} hint={hint} error={error}>
      <textarea
        className="pb-textarea pb-textarea--mono"
        rows={rows}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() === '') {
            setError(null);
            onChange({});
            return;
          }
          try {
            const parsed = JSON.parse(text);
            setError(null);
            onChange(parsed);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
        spellCheck={false}
      />
    </FieldShell>
  );
}

function stringify(v: unknown): string {
  if (v === undefined || v === null) return '';
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
