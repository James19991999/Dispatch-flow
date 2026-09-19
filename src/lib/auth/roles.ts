import type { Role } from "@/types/models";

// Higher number = more privilege. Used for simple "at least this role" gates.
const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  driver: 1,
  dispatcher: 2,
  admin: 3,
  owner: 4,
};

export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function canManageTeam(role: Role): boolean {
  return roleAtLeast(role, "admin");
}

export function canManageFleet(role: Role): boolean {
  return roleAtLeast(role, "dispatcher");
}

export function canRemoveMember(actor: Role, target: Role, isSelf: boolean, isOwnerTarget: boolean): boolean {
  if (isOwnerTarget) return false; // no ownership-transfer flow exists yet
  if (isSelf) return false; // "leave org" is a different action, not built here
  return roleAtLeast(actor, "admin") && ROLE_RANK[actor] >= ROLE_RANK[target];
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  dispatcher: "Dispatcher",
  driver: "Driver",
  viewer: "Viewer",
};
