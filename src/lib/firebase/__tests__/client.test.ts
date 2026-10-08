const calls: string[] = [];

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({ name: "app" })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: "app" })),
}));
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => {
    calls.push("auth");
    return { name: "auth" };
  }),
}));
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => {
    calls.push("firestore");
    return { name: "db" };
  }),
}));

import { clientDb } from "../client";

describe("clientDb", () => {
  it("initializes Firebase Auth before Firestore so queries carry the user's token", () => {
    clientDb();
    expect(calls).toEqual(["auth", "firestore"]);
  });
});
