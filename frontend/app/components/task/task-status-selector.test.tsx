import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TaskStatusSelector } from "./task-status-selector";

const mutateMock = vi.fn();

vi.mock("@/hooks/use-task", () => ({
  useUpdateTaskStatusMutation: () => ({ mutate: mutateMock, isPending: false }),
}));

const renderWithClient = (ui: React.ReactElement) => {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe("TaskStatusSelector", () => {
  it("renders the current status", () => {
    renderWithClient(<TaskStatusSelector status="In Progress" taskId="task-1" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("calls the update mutation with the new status when changed", async () => {
    const user = userEvent.setup();
    renderWithClient(<TaskStatusSelector status="To Do" taskId="task-1" />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Done" }));

    expect(mutateMock).toHaveBeenCalledWith(
      { taskId: "task-1", status: "Done" },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it("optimistically reverts to the previous status if the mutation errors", async () => {
    mutateMock.mockImplementationOnce((_vars, { onError }) => {
      onError({ response: { data: { message: "Failed to update status" } } });
    });

    const user = userEvent.setup();
    renderWithClient(<TaskStatusSelector status="To Do" taskId="task-1" />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Done" }));

    // the mutation's onError rolled the optimistic update back to "To Do"
    expect(screen.getByText("To Do")).toBeInTheDocument();
  });
});
