import { render, screen } from "@testing-library/react";
import { BottomNav } from "../BottomNav";

let mockPath = "/dashboard";
jest.mock("next/navigation", () => ({ usePathname: () => mockPath }));

describe("BottomNav", () => {
  it("includes a Settings tab so mobile users can reach Team, Drivers, Vehicles and Billing", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute("href", "/settings");
  });

  it("highlights Settings on nested settings pages", () => {
    mockPath = "/settings/drivers";
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /settings/i })).toHaveClass("text-brand");
    expect(screen.getByRole("link", { name: /dashboard/i })).not.toHaveClass("text-brand");
  });
});
