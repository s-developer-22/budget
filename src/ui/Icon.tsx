import {
  CalendarDays,
  ListChecks,
  Database,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowDownToLine,
  ArrowUpFromLine,
  Leaf,
  Wallet,
  Landmark,
  ShieldCheck,
  ChartNoAxesColumnIncreasing,
  Info,
  WifiOff,
  X,
  Trash2,
  Settings2,
  type LucideIcon,
} from "lucide-react";
const icons = {
  month: CalendarDays,
  plan: ListChecks,
  data: Database,
  left: ChevronLeft,
  right: ChevronRight,
  check: Check,
  download: ArrowDownToLine,
  upload: ArrowUpFromLine,
  brand: Leaf,
  wallet: Wallet,
  bank: Landmark,
  shield: ShieldCheck,
  chart: ChartNoAxesColumnIncreasing,
  info: Info,
  offline: WifiOff,
  close: X,
  trash: Trash2,
  settings: Settings2,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof icons;
export function Icon({ name }: { name: IconName }) {
  const Component = icons[name];
  return (
    <Component
      className="icon"
      size={20}
      strokeWidth={1.8}
      aria-hidden="true"
    />
  );
}
