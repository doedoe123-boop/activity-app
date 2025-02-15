import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Login from "../app/(auth-pages)/sign-in/page";

// Mock the useSearchParams hook
jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(),
}));

// Mock the signInAction
jest.mock("../app/actions", () => ({
  signInAction: jest.fn().mockImplementation(() => {
    return Promise.resolve(new Response(null, {
      status: 302,
      headers: { Location: "/sign-in?error=Invalid credentials" },
    }));
  }),
}));

describe("Login Component", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  test("User can type email and password", async () => {
    // Mock useSearchParams to return no error
    require("next/navigation").useSearchParams.mockReturnValue(new URLSearchParams());

    render(<Login />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await userEvent.type(emailInput, "testuser@example.com");
    await userEvent.type(passwordInput, "password123");

    expect(emailInput).toHaveValue("testuser@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  test("Shows error message on invalid login", async () => {
    // Mock useSearchParams to return an error
    require("next/navigation").useSearchParams.mockReturnValue(
      new URLSearchParams({ error: "Invalid credentials" })
    );

    render(<Login />);

    // Check the error message
    const errorMessage = await screen.findByText(/invalid credentials/i);
    expect(errorMessage).toBeInTheDocument();
  });
});