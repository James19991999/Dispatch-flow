import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/auth/server";
import { OrgProvider } from "@/components/providers/OrgProvider";
import { Sidebar } from "@/components/nav/Sidebar";
import { BottomNav } from "@/components/nav/BottomNav";
import { QueryErrorBanner } from "@/components/nav/QueryErrorBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const state = await getSessionState();
  // Signed in but never finished creating an organization: send them to
  // finish onboarding rather than back to login.
  if (state.status === "no_org") redirect("/onboarding?reason=no-org");
  if (state.status !== "ok") redirect("/login?reason=session");
  const session = state.session;

  return (
    <OrgProvider uid={session.uid} initialOrg={session.org} initialMember={session.member}>
      <div className="min-h-screen bg-canvas sm:pl-64">
        <Sidebar />
        <main className="pb-20 sm:pb-6">
          <QueryErrorBanner />
          {children}
        </main>
        <BottomNav />
      </div>
    </OrgProvider>
  );
}
