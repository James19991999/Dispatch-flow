import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/server";
import { OrgProvider } from "@/components/providers/OrgProvider";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  return (
    <OrgProvider uid={session.uid} initialOrg={session.org} initialMember={session.member}>
      <div className="min-h-screen bg-canvas sm:pl-64">
        <Sidebar />
        <main className="pb-20 sm:pb-6">{children}</main>
        <BottomNav />
      </div>
    </OrgProvider>
  );
}
