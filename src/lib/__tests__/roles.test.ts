import { roleAtLeast, canManageTeam, canManageFleet, canRemoveMember } from "@/lib/auth/roles";

describe("roleAtLeast", () => {
  it("ranks owner above every other role", () => {
    expect(roleAtLeast("owner", "admin")).toBe(true);
    expect(roleAtLeast("owner", "viewer")).toBe(true);
  });

  it("rejects a lower role claiming a higher minimum", () => {
    expect(roleAtLeast("viewer", "dispatcher")).toBe(false);
    expect(roleAtLeast("driver", "admin")).toBe(false);
  });

  it("treats equal roles as satisfying the minimum", () => {
    expect(roleAtLeast("dispatcher", "dispatcher")).toBe(true);
  });
});

describe("canManageTeam / canManageFleet", () => {
  it("requires at least admin to manage the team", () => {
    expect(canManageTeam("admin")).toBe(true);
    expect(canManageTeam("owner")).toBe(true);
    expect(canManageTeam("dispatcher")).toBe(false);
    expect(canManageTeam("viewer")).toBe(false);
  });

  it("requires at least dispatcher to manage the fleet", () => {
    expect(canManageFleet("dispatcher")).toBe(true);
    expect(canManageFleet("admin")).toBe(true);
    expect(canManageFleet("driver")).toBe(false);
    expect(canManageFleet("viewer")).toBe(false);
  });
});

describe("canRemoveMember", () => {
  it("never allows removing the owner, even by another owner-ranked actor", () => {
    expect(canRemoveMember("owner", "owner", false, true)).toBe(false);
    expect(canRemoveMember("admin", "owner", false, true)).toBe(false);
  });

  it("never allows a member to remove themselves", () => {
    expect(canRemoveMember("admin", "admin", true, false)).toBe(false);
    expect(canRemoveMember("owner", "dispatcher", true, false)).toBe(false);
  });

  it("allows an admin to remove a lower-ranked member", () => {
    expect(canRemoveMember("admin", "dispatcher", false, false)).toBe(true);
    expect(canRemoveMember("owner", "viewer", false, false)).toBe(true);
  });

  it("blocks a dispatcher (below admin) from removing anyone", () => {
    expect(canRemoveMember("dispatcher", "viewer", false, false)).toBe(false);
  });

  it("blocks removing a peer or higher-ranked member", () => {
    expect(canRemoveMember("admin", "admin", false, false)).toBe(true); // equal rank allowed per >= rule
    expect(canRemoveMember("dispatcher", "admin", false, false)).toBe(false);
  });
});
