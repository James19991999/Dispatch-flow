import { render, screen, act } from "@testing-library/react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useLiveCollection } from "../useCollection";
import { identityConverter } from "../collections";

jest.mock("@/lib/firebase/client", () => ({ clientDb: jest.fn() }));

jest.mock("firebase/firestore", () => ({
  ...jest.requireActual("firebase/firestore"),
  onSnapshot: jest.fn(),
}));

const mockedOnSnapshot = onSnapshot as unknown as jest.Mock;

function makeQuery() {
  const db = getFirestore(initializeApp({ projectId: "demo" }, "t"));
  // Same construction the real pages use: a brand-new Query object on every render.
  return query(collection(db, "organizations/o1/deliveries").withConverter(identityConverter<{ id: string }>()), orderBy("createdAt", "desc"));
}

function Probe() {
  const { data, loading } = useLiveCollection(makeQuery());
  return <div>{loading ? "loading" : `rows:${data.length}`}</div>;
}

describe("useLiveCollection", () => {
  beforeEach(() => {
    mockedOnSnapshot.mockReset();
    mockedOnSnapshot.mockImplementation((_q, onNext) => {
      // Deliver one snapshot asynchronously, like Firestore does.
      Promise.resolve().then(() => onNext({ docs: [{ data: () => ({ id: "a" }) }] }));
      return () => {};
    });
  });

  it("subscribes once even though pages build a new Query object on every render", async () => {
    render(<Probe />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByText("rows:1")).toBeInTheDocument();
    // Before the fix this ran away (hundreds of subscriptions); it must stay tiny.
    expect(mockedOnSnapshot.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
