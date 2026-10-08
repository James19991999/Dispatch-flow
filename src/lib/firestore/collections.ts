import { collection, CollectionReference, DocumentData, FirestoreDataConverter } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import type {
  Driver,
  Vehicle,
  Delivery,
  Route,
  Review,
  AppNotification,
  AuditLogEntry,
  Member,
} from "@/types/models";

// One shared converter instance. Firestore's queryEqual() treats queries with
// different converter objects as different, so building a fresh converter per
// call made every query "new" and defeated useLiveCollection's de-duplication.
const IDENTITY_CONVERTER: FirestoreDataConverter<DocumentData> = {
  toFirestore: (data) => data as DocumentData,
  fromFirestore: (snap) => snap.data() as DocumentData,
};

export function identityConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return IDENTITY_CONVERTER as FirestoreDataConverter<T>;
}

const converter = identityConverter;

function orgCollection<T extends DocumentData>(orgId: string, name: string): CollectionReference<T> {
  return collection(clientDb(), `organizations/${orgId}/${name}`).withConverter(converter<T>());
}

export const driversCol = (orgId: string) => orgCollection<Driver>(orgId, "drivers");
export const vehiclesCol = (orgId: string) => orgCollection<Vehicle>(orgId, "vehicles");
export const deliveriesCol = (orgId: string) => orgCollection<Delivery>(orgId, "deliveries");
export const routesCol = (orgId: string) => orgCollection<Route>(orgId, "routes");
export const reviewsCol = (orgId: string) => orgCollection<Review>(orgId, "reviews");
export const notificationsCol = (orgId: string) => orgCollection<AppNotification>(orgId, "notifications");
export const auditLogCol = (orgId: string) => orgCollection<AuditLogEntry>(orgId, "auditLog");
export const membersCol = (orgId: string) => orgCollection<Member>(orgId, "members");
