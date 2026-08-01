import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import ForgotPassword from "./forgot-password";

const mutateMock = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useForgotPasswordMutation: () => ({ mutate: mutateMock, isPending: false }),
}));

const renderPage = () => render(<ForgotPassword />, { wrapper: MemoryRouter });

describe("ForgotPassword", () => {
  it("renders the email field and submit button", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
  });

  it("shows a validation error for an invalid email and does not submit", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("Enter your email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText("Invalid email address")).toBeInTheDocument();
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("submits a valid email and shows the success confirmation", async () => {
    mutateMock.mockImplementationOnce((_data, { onSuccess }) => onSuccess());

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("Enter your email"), "user@example.com");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(mutateMock).toHaveBeenCalledWith(
      { email: "user@example.com" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
    );
    expect(await screen.findByText("Password reset email sent")).toBeInTheDocument();
  });
});
