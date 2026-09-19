import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No deliveries" description="Create a dispatch to get started." />);
    expect(screen.getByText("No deliveries")).toBeInTheDocument();
    expect(screen.getByText("Create a dispatch to get started.")).toBeInTheDocument();
  });

  it("renders an action when provided", () => {
    render(
      <EmptyState
        title="No drivers"
        description="Add one."
        action={<button>Add Driver</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Add Driver" })).toBeInTheDocument();
  });

  it("renders no action button when none is provided", () => {
    render(<EmptyState title="Empty" description="Nothing here." />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
