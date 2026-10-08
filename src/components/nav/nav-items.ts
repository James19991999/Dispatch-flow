import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  MapPinned,
  Route as RouteIcon,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/deliveries", label: "Deliveries", icon: Package },
  { href: "/live-gps", label: "Live GPS", icon: MapPinned },
  { href: "/routes", label: "Routes", icon: RouteIcon },
  { href: "/reports", label: "Analytics", icon: BarChart3 },
];

// Desktop shows Settings in the sidebar footer; on mobile there is no sidebar,
// so it has to be a bottom-nav tab or Team, Drivers, Vehicles, Billing and
// Sign out are unreachable.
export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings };
