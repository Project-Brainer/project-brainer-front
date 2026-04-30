import clsx from 'clsx';
import {
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

interface BaseProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
}

export function Label({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="pb-field__label">
      <span>{children}</span>
      {hint && <span className="pb-field__hint">{hint}</span>}
    </label>
  );
}

export function FieldShell({
  label,
  hint,
  error,
  className,
  children,
}: BaseProps & { children: ReactNode }) {
  return (
    <div className={clsx('pb-field', className, error && 'pb-field--error')}>
      {label && <Label hint={hint}>{label}</Label>}
      {children}
      {error && <div className="pb-field__error">{error}</div>}
    </div>
  );
}

export function Input(
  props: BaseProps & InputHTMLAttributes<HTMLInputElement>,
) {
  const { label, hint, error, className, ...rest } = props;
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      <input className="pb-input" {...rest} />
    </FieldShell>
  );
}

export function Textarea(
  props: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const { label, hint, error, className, ...rest } = props;
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      <textarea className="pb-textarea" {...rest} />
    </FieldShell>
  );
}

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
}

export function Select<V extends string = string>(
  props: BaseProps &
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
      value: V;
      options: SelectOption<V>[];
      onChange: (value: V) => void;
    },
) {
  const { label, hint, error, className, value, options, onChange, ...rest } =
    props;
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      <select
        className="pb-input pb-select"
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          onChange(e.target.value as V)
        }
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
}) {
  return (
    <label className="pb-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
