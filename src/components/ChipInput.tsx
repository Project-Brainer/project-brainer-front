import clsx from 'clsx';
import { useState, type KeyboardEvent } from 'react';
import { Icon } from './Icon';

export interface ChipInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  /** Treat comma + enter as separators. Defaults to true. */
  splitOnComma?: boolean;
  className?: string;
}

export function ChipInput({
  values,
  onChange,
  placeholder = 'Add and press enter',
  suggestions,
  splitOnComma = true,
  className,
}: ChipInputProps) {
  const [draft, setDraft] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const commit = (raw: string) => {
    const parts = (splitOnComma ? raw.split(',') : [raw])
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...values];
    for (const p of parts) {
      if (!next.includes(p)) next.push(p);
    }
    onChange(next);
    setDraft('');
  };

  const remove = (v: string) => {
    onChange(values.filter((x) => x !== v));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1));
    } else if (e.key === ',' && splitOnComma) {
      e.preventDefault();
      commit(draft);
    }
  };

  const filteredSuggestions = (suggestions ?? []).filter(
    (s) => !values.includes(s) && s.toLowerCase().includes(draft.toLowerCase()),
  );

  return (
    <div className={clsx('pb-chip-input', className)}>
      <div className="pb-chip-input__row">
        {values.map((v) => (
          <span key={v} className="pb-chip">
            <span>{v}</span>
            <button
              type="button"
              className="pb-chip__remove"
              onClick={() => remove(v)}
              aria-label={`Remove ${v}`}
            >
              <Icon name="x" size={12} />
            </button>
          </span>
        ))}
        <input
          className="pb-chip-input__input"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={values.length === 0 ? placeholder : ''}
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="pb-chip-input__suggestions">
          {filteredSuggestions.slice(0, 8).map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(s);
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
