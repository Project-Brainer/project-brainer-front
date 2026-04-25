import clsx from 'clsx';
import { type ReactNode, useEffect } from 'react';
import { Icon } from './Icon';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  width?: number | string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  width = 560,
  children,
  footer,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="pb-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={clsx('pb-modal', className)}
        style={{ width }}
        role="dialog"
        aria-modal="true"
      >
        {title !== undefined && (
          <header className="pb-modal__header">
            <div className="pb-modal__title">{title}</div>
            <button
              className="pb-icon-btn"
              onClick={onClose}
              aria-label="Close"
              type="button"
            >
              <Icon name="x" size={16} />
            </button>
          </header>
        )}
        <div className="pb-modal__body">{children}</div>
        {footer && <footer className="pb-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
