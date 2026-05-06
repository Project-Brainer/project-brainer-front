/**
 * Visual overlay that draws literal lines between slot endpoints on the
 * canvas — turning slot bindings, apiResponse references, and CALLS
 * request bindings into something the user can see without opening
 * any inspector.
 *
 * Rendered as an absolutely-positioned SVG layer over .pb-canvas-area.
 * Lines use real DOM rects so they always anchor to the actual on-screen
 * row. The overlay re-measures on graph change (drags, edits) and on
 * viewport pan/zoom.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useStore } from 'reactflow';
import type { AnyNode, CallsEdgeData, Edge, Slot } from '../api/types';

type WireKind = 'binding' | 'apiResponse' | 'requestBinding';

interface Wire {
  id: string;
  kind: WireKind;
  fromAnchor: string;
  toAnchor: string;
  fromLabel: string;
  toLabel: string;
}

interface Geometry {
  wire: Wire;
  path: string;
  midX: number;
  midY: number;
}

interface SlotWiresProps {
  nodes: AnyNode[];
  edges: Edge[];
  wrapperRef: RefObject<HTMLDivElement | null>;
}

const transformSelector = (s: { transform: [number, number, number] }) => s.transform;

export function SlotWires({ nodes, edges, wrapperRef }: SlotWiresProps) {
  const transform = useStore(transformSelector);

  const nodeById = useMemo(() => {
    const m = new Map<string, AnyNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const wires = useMemo<Wire[]>(() => {
    const list: Wire[] = [];
    const nodeName = (id: string): string => nodeById.get(id)?.name || 'Untitled';
    const slotName = (nodeId: string, slotId: string): string => {
      const n = nodeById.get(nodeId);
      const slots = (n?.data as { slots?: Slot[] } | undefined)?.slots ?? [];
      return slots.find((s) => s.id === slotId)?.name || '?';
    };

    for (const node of nodes) {
      const slots = (node.data as { slots?: Slot[] }).slots ?? [];
      for (const slot of slots) {
        if (slot.source.kind === 'binding') {
          const { fromNodeId, fromSlotId } = slot.source;
          if (!fromNodeId || !fromSlotId) continue;
          if (!nodeById.has(fromNodeId)) continue;
          list.push({
            id: `bind:${node.id}:${slot.id}`,
            kind: 'binding',
            fromAnchor: `${fromNodeId}::${fromSlotId}`,
            toAnchor: `${node.id}::${slot.id}`,
            fromLabel: `${nodeName(fromNodeId)}.${slotName(fromNodeId, fromSlotId)}`,
            toLabel: `${nodeName(node.id)}.${slot.name || '?'}`,
          });
        } else if (slot.source.kind === 'apiResponse') {
          const { endpointId } = slot.source;
          if (!endpointId || !nodeById.has(endpointId)) continue;
          list.push({
            id: `resp:${node.id}:${slot.id}`,
            kind: 'apiResponse',
            fromAnchor: `${endpointId}::response`,
            toAnchor: `${node.id}::${slot.id}`,
            fromLabel: `${nodeName(endpointId)}.response`,
            toLabel: `${nodeName(node.id)}.${slot.name || '?'}`,
          });
        }
      }
    }

    for (const edge of edges) {
      if (edge.type !== 'CALLS') continue;
      const data = edge.data as CallsEdgeData | undefined;
      const bindings = data?.requestBindings ?? [];
      for (const binding of bindings) {
        if (!binding.field || !binding.sourceSlotId) continue;
        if (!nodeById.has(edge.sourceId) || !nodeById.has(edge.targetId)) continue;
        list.push({
          id: `req:${edge.id}:${binding.field}`,
          kind: 'requestBinding',
          fromAnchor: `${edge.sourceId}::${binding.sourceSlotId}`,
          toAnchor: `${edge.targetId}::request:${binding.field}`,
          fromLabel: `${nodeName(edge.sourceId)}.${slotName(edge.sourceId, binding.sourceSlotId)}`,
          toLabel: `${nodeName(edge.targetId)}.req.${binding.field}`,
        });
      }
    }
    return list;
  }, [nodes, edges, nodeById]);

  const [geometries, setGeometries] = useState<Geometry[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const measure = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const wrapperRect = wrapper.getBoundingClientRect();

    const next: Geometry[] = [];
    for (const wire of wires) {
      const fromEl = selectAnchor(wrapper, wire.fromAnchor);
      const toEl = selectAnchor(wrapper, wire.toAnchor);
      if (!fromEl || !toEl) continue;
      const fr = fromEl.getBoundingClientRect();
      const tr = toEl.getBoundingClientRect();

      if (isOffViewport(fr, wrapperRect) && isOffViewport(tr, wrapperRect)) continue;

      const fromCx = fr.left + fr.width / 2;
      const toCx = tr.left + tr.width / 2;
      const sourceFromRight = fromCx <= toCx;
      const fromX = sourceFromRight ? fr.right : fr.left;
      const toX = sourceFromRight ? tr.left : tr.right;
      const fromY = fr.top + fr.height / 2;
      const toY = tr.top + tr.height / 2;

      const x1 = fromX - wrapperRect.left;
      const y1 = fromY - wrapperRect.top;
      const x2 = toX - wrapperRect.left;
      const y2 = toY - wrapperRect.top;

      const dx = Math.max(40, Math.abs(x2 - x1) * 0.4);
      const c1x = x1 + (sourceFromRight ? dx : -dx);
      const c2x = x2 + (sourceFromRight ? -dx : dx);

      const path = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
      next.push({ wire, path, midX: (x1 + x2) / 2, midY: (y1 + y2) / 2 });
    }
    setGeometries(next);
  }, [wires, wrapperRef]);

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();
  }, [measure, transform, nodes, edges]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, wrapperRef]);

  const rafScheduled = useRef(false);
  useEffect(() => {
    if (rafScheduled.current) return;
    rafScheduled.current = true;
    const id = requestAnimationFrame(() => {
      rafScheduled.current = false;
      measure();
    });
    return () => cancelAnimationFrame(id);
  }, [measure]);

  const hovered = useMemo(
    () => geometries.find((g) => g.wire.id === hoveredId) ?? null,
    [geometries, hoveredId],
  );

  return (
    <svg className="pb-slot-wires" aria-hidden="true">
      <defs>
        <marker id="pb-wire-dot" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5">
          <circle cx="3" cy="3" r="2" fill="currentColor" />
        </marker>
      </defs>
      <g>
        {geometries.map((g) => (
          <g
            key={g.wire.id}
            className={`pb-slot-wire pb-slot-wire--${g.wire.kind}`}
            onMouseEnter={() => setHoveredId(g.wire.id)}
            onMouseLeave={() => setHoveredId((cur) => (cur === g.wire.id ? null : cur))}
          >
            <path d={g.path} className="pb-slot-wire__hit" />
            <path
              d={g.path}
              className="pb-slot-wire__line"
              markerStart="url(#pb-wire-dot)"
              markerEnd="url(#pb-wire-dot)"
            />
          </g>
        ))}
      </g>
      {hovered && (
        <WireLabel
          x={hovered.midX}
          y={hovered.midY}
          text={`${hovered.wire.fromLabel} → ${hovered.wire.toLabel}`}
        />
      )}
    </svg>
  );
}

function WireLabel({ x, y, text }: { x: number; y: number; text: string }) {
  const textRef = useRef<SVGTextElement>(null);
  const [bbox, setBbox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const b = el.getBBox();
    setBbox({ w: b.width, h: b.height });
  }, [text]);
  const padX = 8;
  const padY = 3;
  return (
    <g className="pb-slot-wire-label" transform={`translate(${x}, ${y})`}>
      {bbox.w > 0 && (
        <rect
          x={-bbox.w / 2 - padX}
          y={-bbox.h / 2 - padY}
          width={bbox.w + padX * 2}
          height={bbox.h + padY * 2}
          rx={4}
        />
      )}
      <text ref={textRef} x={0} y={0} dominantBaseline="middle" textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

function selectAnchor(scope: HTMLElement, key: string): HTMLElement | null {
  const safe = key.replace(/(["\\])/g, '\\$1');
  return scope.querySelector<HTMLElement>(`[data-anchor="${safe}"]`);
}

function isOffViewport(rect: DOMRect, viewport: DOMRect): boolean {
  return (
    rect.right < viewport.left ||
    rect.left > viewport.right ||
    rect.bottom < viewport.top ||
    rect.top > viewport.bottom
  );
}
