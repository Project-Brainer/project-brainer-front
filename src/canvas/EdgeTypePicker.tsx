import { useEffect } from 'react';
import type { EdgeType } from '../api/types';
import { edgeTypeLabel } from '../lib/edgeCompat';

export interface EdgeTypePickerProps {
  /** Page-coordinate position where the menu should anchor. */
  x: number;
  y: number;
  options: EdgeType[];
  onPick: (type: EdgeType) => void;
  onCancel: () => void;
}

export function EdgeTypePicker({
  x,
  y,
  options,
  onPick,
  onCancel,
}: EdgeTypePickerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="pb-edge-picker"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="pb-edge-picker__title">Connect as</div>
      <ul className="pb-edge-picker__list">
        {options.map((type) => (
          <li key={type}>
            <button
              type="button"
              onClick={() => onPick(type)}
              className="pb-edge-picker__btn"
            >
              <span className="pb-edge-picker__type">
                {edgeTypeLabel(type)}
              </span>
              <span className="pb-edge-picker__code pb-mono">{type}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
