import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { onSnapshot } from "firebase/firestore";
import DeliveriesPage from "../page";

jest.mock("@/lib/firebase/client", () => ({ clientDb: jest.fn(() => ({ type: "firestore", toJSON: () => ({}) })), clientAuth: jest.fn() }));
jest.mock("@/lib/auth/client", () => ({ signOutEverywhere: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: jest.fn(), refresh: jest.fn(), push: jest.fn() }) }));
jest.mock("@/components/providers/OrgProvider", () => ({
  useOrg: () => ({ uid: "u1", org: { id: "o1", name: "Org" }, member: { name: "Jane", role: "owner" } }),
}));
jest.mock("@/components/ui/Toast", () => ({ useToast: () => ({ push: jest.fn() }) }));
jest.mock("firebase/firestore", () => {
  const actual = jest.requireActual("firebase/firestore");
  return { ...actual, collection: jest.fn((_db: unknown, path: string) => ({ path, withConverter: () => ({ type: "collection", path }) })), query: jest.fn((...a: unknown[]) => ({ args: a })), orderBy: jest.fn(), where: jest.fn(), limit: jest.fn(), queryEqual: jest.fn(() => true), onSnapshot: jest.fn() };
});

describe("Deliveries page", () => {
  it("opens the Create Dispatch sheet when New is clicked, without re-render storms", async () => {
    (onSnapshot as unknown as jest.Mock).mockImplementation((_q, onNext) => {
      Promise.resolve().then(() => onNext({ docs: [] }));
      return () => {};
    });
    render(<DeliveriesPage />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    await userEvent.click(screen.getAllByRole("button", { name: /create dispatch|new/i })[0]);
    expect(await screen.findByRole("dialog", { name: "Create New Dispatch" })).toBeInTheDocument();
  });
});
