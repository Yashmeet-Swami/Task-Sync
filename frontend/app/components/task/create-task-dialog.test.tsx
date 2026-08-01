import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateTaskDialog } from "./create-task-dialog";

const mutateMock = vi.fn();

vi.mock("@/hooks/use-task", () => ({
  useCreateTaskMutation: () => ({ mutate: mutateMock, isPending: false }),
}));

const renderDialog = () => {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <CreateTaskDialog
        open={true}
        onOpenChange={() => {}}
        projectId="project-1"
        projectMembers={[]}
      />
    </QueryClientProvider>
  );
};

describe("CreateTaskDialog", () => {
  it("renders the title and description fields", () => {
    renderDialog();
    expect(screen.getByRole("heading", { name: "Create Task" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter task title")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter task description")).toBeInTheDocument();
  });

  it("shows a validation error and does not submit when the title is left empty", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: /create task/i }));

    expect(await screen.findByText("Task title is required")).toBeInTheDocument();
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("re-validates and clears the error once a title is typed", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: /create task/i }));
    expect(await screen.findByText("Task title is required")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Enter task title"), "Write onboarding docs");
    await user.click(screen.getByRole("button", { name: /create task/i }));

    expect(screen.queryByText("Task title is required")).not.toBeInTheDocument();
  });
});
