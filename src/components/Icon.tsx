import {
  type LucideIcon,
  AlertTriangle,
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileJson,
  GripVertical,
  Loader2,
  LogOut,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  Square,
  Trash2,
  Upload,
  UserCog,
  X,
  XCircle,
  Zap,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  'alert-triangle': AlertTriangle,
  'arrow-down': ArrowDown,
  'arrow-up-right': ArrowUpRight,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  cloud: Cloud,
  copy: Copy,
  database: Database,
  download: Download,
  'external-link': ExternalLink,
  'file-json': FileJson,
  'grip-vertical': GripVertical,
  loader: Loader2,
  'log-out': LogOut,
  monitor: Monitor,
  'more-horizontal': MoreHorizontal,
  'mouse-pointer-2': MousePointer2,
  pencil: Pencil,
  play: Play,
  plus: Plus,
  'rotate-ccw': RotateCcw,
  search: Search,
  settings: Settings,
  'shield-alert': ShieldAlert,
  square: Square,
  trash: Trash2,
  upload: Upload,
  'user-cog': UserCog,
  x: X,
  'x-circle': XCircle,
  zap: Zap,
};

export interface IconProps {
  name: keyof typeof ICONS | string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
  spin?: boolean;
}

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.5,
  className,
  color,
  spin,
}: IconProps) {
  const Cmp = ICONS[name];
  if (!Cmp) {
    // Render an empty box for unknown icons rather than crash.
    return (
      <span
        className={className}
        style={{
          display: 'inline-block',
          width: size,
          height: size,
        }}
        aria-hidden
      />
    );
  }
  return (
    <Cmp
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      className={className}
      style={spin ? { animation: 'pb-spin 0.8s linear infinite' } : undefined}
    />
  );
}
