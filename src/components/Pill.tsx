import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface PillProps {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  mono?: boolean;
  className?: string;
}

export function Pill({ children, tone = 'neutral', mono, className }: PillProps) {
  return (
    <span
      className={clsx(
        'pb-pill',
        `pb-pill--${tone}`,
        mono && 'pb-pill--mono',
        className,
      )}
    >
      {children}
    </span>
  );
}
