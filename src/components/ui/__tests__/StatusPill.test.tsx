import { render, screen } from "@testing-library/react";
import { StatusPill } from "@/components/ui/StatusPill";

describe("StatusPill", () => {
  it("renders a friendly label for a known status", () => {
    render(<StatusPill status="in_transit" />);
    expect(screen.getByText("In Transit")).toBeInTheDocument();
  });

  it("falls back to the raw status string for an unknown value", () => {
    render(<StatusPill status="totally_unknown_status" />);
    expect(screen.getByText("totally_unknown_status")).toBeInTheDocument();
  });

  it("renders delayed and exception with critical styling classes", () => {
    render(<StatusPill status="delayed" />);
    expect(screen.getByText("Delayed").className).toContain("critical");
  });
});
