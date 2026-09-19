import { Truck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5 text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand">
          <Truck size={20} />
        </div>
        <div className="leading-tight">
          <p className="text-lg font-extrabold tracking-tight">DispatchFlow</p>
          <p className="text-[11px] font-medium text-white/50">Fleet Ops &amp; Dispatch Hub</p>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-8 max-w-xs text-center text-xs text-white/40">
        Logistics management optimized for growing businesses
      </p>
    </div>
  );
}
