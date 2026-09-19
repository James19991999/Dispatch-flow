// Core Firestore data model for DispatchFlow.
// Every collection below (except top-level `organizations` and the platform
// `invites` lookup) is scoped under `organizations/{orgId}/...` so that
// tenant isolation is structural, not just a filtered query.

export type Role = "owner" | "admin" | "dispatcher" | "driver" | "viewer";

export interface Organization {
  id: string;
  name: string;
  depotName: string;
  depotAddress: string;
  // Optional — powers the Live GPS / Route Optimization maps. No geocoding
  // provider is wired in this build (see README), so these are set manually
  // in Settings rather than derived from depotAddress automatically.
  depotLat?: number | null;
  depotLng?: number | null;
  timezone: string;
  units: "mi" | "km";
  logoUrl: string | null;
  planTier: "starter" | "growth" | "enterprise";
  seeded?: boolean;
  createdAt: string;
  createdBy: string;
  ownerId: string;
}

export interface Member {
  uid: string;
  orgId: string;
  email: string;
  name: string;
  role: Role;
  status: "active" | "invited" | "disabled";
  driverId?: string | null;
  createdAt: string;
  invitedBy?: string;
}

export interface Invite {
  id: string; // token
  orgId: string;
  orgName: string;
  email: string;
  role: Role;
  invitedBy: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  expiresAt: string;
}

export type DeliveryStatus =
  | "pending"
  | "in_transit"
  | "delivered"
  | "delayed"
  | "exception";

export type DeliveryPriority = "standard" | "priority" | "cold_chain" | "medical";

export interface JourneyEvent {
  label: string;
  at: string;
  note?: string;
}

export interface Delivery {
  id: string;
  orgId: string;
  trackingCode: string; // e.g. DF-9042
  recipientName: string;
  destinationAddress: string;
  // Approximate map coordinates, generated as a deterministic offset from
  // the org's depot location at creation time (no geocoding provider is
  // wired in — see README "Known gaps"). Null until the org has set depot
  // coordinates in Settings.
  lat?: number | null;
  lng?: number | null;
  status: DeliveryStatus;
  priority: DeliveryPriority;
  weightKg?: number;
  parcelCount: number;
  driverId?: string | null;
  vehicleId?: string | null;
  routeId?: string | null;
  eta?: string | null;
  coldChainTempC?: number | null;
  signedBy?: string | null;
  proofOfDeliveryUrl?: string | null;
  journey: JourneyEvent[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type DriverStatus = "on_road" | "available" | "off_duty";

export interface Driver {
  id: string;
  orgId: string;
  name: string;
  phone: string;
  email?: string;
  status: DriverStatus;
  rating: number;
  vehicleId?: string | null;
  licenseExpiry?: string | null;
  memberUid?: string | null;
  lastKnownPosition?: { lat: number; lng: number; heading?: number; speedKph?: number } | null;
  lastPingAt?: string | null;
  createdAt: string;
}

export type VehicleStatus = "active" | "maintenance" | "idle";

export interface Vehicle {
  id: string;
  orgId: string;
  label: string; // e.g. "Van-04"
  plate: string;
  type: "van" | "truck" | "motorbike" | "ev";
  status: VehicleStatus;
  fuelOrChargePct?: number | null;
  insuranceExpiry?: string | null;
  maintenanceDueAt?: string | null;
  assignedDriverId?: string | null;
  createdAt: string;
}

export interface RouteStop {
  id: string;
  deliveryId: string;
  sequence: number;
  address: string;
  label: string;
  status: "pending" | "completed";
  etaOffsetMin?: number;
}

export interface Route {
  id: string;
  orgId: string;
  name: string;
  driverId?: string | null;
  vehicleId?: string | null;
  status: "draft" | "optimized" | "active" | "completed";
  stops: RouteStop[];
  estMilesSaved?: number;
  estMinutesSaved?: number;
  estFuelSavedGal?: number;
  constraints: {
    medicalColdChainFirst: boolean;
    strictTimeWindows: boolean;
    minimizeLeftTurns: boolean;
    timeWindowToleranceMin: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  orgId: string;
  deliveryId?: string | null;
  driverId?: string | null;
  recipientName: string;
  rating: number; // 1-5
  comment: string;
  status: "unreplied" | "responded" | "flagged";
  response?: string | null;
  createdAt: string;
}

export type NotificationKind =
  | "delay"
  | "sla_breach"
  | "new_review"
  | "route_change"
  | "exception"
  | "system";

export interface AppNotification {
  id: string;
  orgId: string;
  targetUid?: string | null; // null = org-wide
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  link?: string | null;
}

export interface AuditLogEntry {
  id: string;
  orgId: string;
  actorUid: string;
  actorName: string;
  action: string; // e.g. "driver.create", "route.optimize", "member.role_change"
  targetType: string;
  targetId: string;
  detail?: string;
  createdAt: string;
}
