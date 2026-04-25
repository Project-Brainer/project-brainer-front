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
 * Uses the "previous prop" pattern (React docs) to re-derive textarea text
 * when the external `value` changes, without an effect.
 */
export function JsonEditor({
  label,
  hint,
  value,
  onChange,
  rows = 6,
}: JsonEditorProps) {
  const [text, setText] = useState(() => stringify(value));
  const [trackedValue, setTrackedValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  if (value !== trackedValue) {
    setTrackedValue(value);
    setText(stringify(value));
    setError(null);
  }

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
