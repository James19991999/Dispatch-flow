"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useOrg } from "@/components/providers/OrgProvider";
import { signOutEverywhere } from "@/lib/auth/client";
import { ROLE_LABELS } from "@/lib/auth/roles";

export default function ProfilePage() {
  const { org, member } = useOrg();
  const router = useRouter();

  async function handleSignOut() {
    await signOutEverywhere();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div>
      <TopBar title="Your Profile" />
      <div className="space-y-5 px-4 py-5 sm:px-6 max-w-2xl">
        <Link href="/settings" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Back to Settings
        </Link>

        <Card>
          <CardBody className="flex items-center gap-3">
            <Avatar name={member.name} size={52} />
            <div>
              <p className="text-lg font-bold text-ink">{member.name}</p>
              <p className="text-sm text-ink-muted">{member.email}</p>
              <p className="text-xs font-bold uppercase tracking-wide text-brand">{ROLE_LABELS[member.role]} · {org.name}</p>
            </div>
          </CardBody>
        </Card>

        <Button variant="secondary" onClick={handleSignOut} className="w-full sm:w-auto">
          <LogOut size={16} /> Sign Out
        </Button>
      </div>
    </div>
  );
}
