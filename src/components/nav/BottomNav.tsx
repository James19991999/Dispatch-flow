"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="flex items-stretch justify-between px-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cx(
                  "flex min-h-touch flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold",
                  active ? "text-brand" : "text-ink-muted"
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
