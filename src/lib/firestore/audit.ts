import "server-only";
import { adminDb } from "@/lib/firebase/admin";

export async function writeAuditLog(opts: {
  orgId: string;
  actorUid: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  detail?: string;
}) {
  const ref = adminDb().collection(`organizations/${opts.orgId}/auditLog`).doc();
  await ref.set({
    id: ref.id,
    orgId: opts.orgId,
    actorUid: opts.actorUid,
    actorName: opts.actorName,
    action: opts.action,
    targetType: opts.targetType,
    targetId: opts.targetId,
    detail: opts.detail ?? "",
    createdAt: new Date().toISOString(),
  });
}

export async function notifyOrg(opts: {
  orgId: string;
  kind: string;
  title: string;
  body: string;
  link?: string;
  targetUid?: string | null;
}) {
  const ref = adminDb().collection(`organizations/${opts.orgId}/notifications`).doc();
  await ref.set({
    id: ref.id,
    orgId: opts.orgId,
    targetUid: opts.targetUid ?? null,
    kind: opts.kind,
    title: opts.title,
    body: opts.body,
    read: false,
    link: opts.link ?? null,
    createdAt: new Date().toISOString(),
  });
}
