"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck, Settings, LogOut } from "lucide-react";
import { cx } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { useOrg } from "@/components/providers/OrgProvider";
import { signOutEverywhere } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { org, member } = useOrg();
  const router = useRouter();

  async function handleSignOut() {
    await signOutEverywhere();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-outline-variant bg-surface sm:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
          <Truck size={20} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-extrabold text-ink">DispatchFlow</p>
          <p className="truncate text-[11px] font-medium text-ink-muted max-w-[9rem]">{org.name}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition-colors",
                active ? "bg-brand-light text-brand-dark" : "text-ink-muted hover:bg-surface-container hover:text-ink"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-outline-variant px-3 py-3">
        <Link
          href="/settings"
          className={cx(
            "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition-colors",
            pathname.startsWith("/settings") ? "bg-brand-light text-brand-dark" : "text-ink-muted hover:bg-surface-container hover:text-ink"
          )}
        >
          <Settings size={18} />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold text-ink-muted hover:bg-surface-container hover:text-ink"
        >
          <LogOut size={18} />
          Sign out
        </button>
        <div className="mt-2 flex items-center gap-2 px-3 py-1 text-xs text-ink-muted">
          Signed in as <span className="font-semibold text-ink">{member.name}</span>
        </div>
      </div>
    </aside>
  );
}
