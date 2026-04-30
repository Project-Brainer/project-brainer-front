import clsx from 'clsx';
import {
  type ButtonHTMLAttributes,
  type ReactNode,
  forwardRef,
} from 'react';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: string;
  iconRight?: string;
  loading?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    iconLeft,
    iconRight,
    loading,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx('pb-btn', `pb-btn--${variant}`, `pb-btn--${size}`, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Icon name="loader" size={size === 'sm' ? 14 : 16} spin />
      ) : iconLeft ? (
        <Icon name={iconLeft} size={size === 'sm' ? 14 : 16} />
      ) : null}
      {children !== undefined && <span>{children}</span>}
      {!loading && iconRight && (
        <Icon name={iconRight} size={size === 'sm' ? 14 : 16} />
      )}
    </button>
  );
});
