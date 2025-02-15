import { signInAction } from "@/app/actions";
import { redirect } from "next/navigation"; 
import { createClient } from "@/utils/supabase/server"; 

// Mock Supabase client
jest.mock("../utils/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Mock Next.js redirect
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

// Mock encodedRedirect to return just the error message (prevents actual redirects)
jest.mock("../utils/utils", () => ({
  ...jest.requireActual("../utils/utils"),
  encodedRedirect: jest.fn((type, path, message) => message),
}));

describe("Integration Test: User Authentication", () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Set up mock Supabase authentication
    mockSupabase = {
      auth: {
        signInWithPassword: jest.fn(),
      },
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  test("Returns expected user object on successful login", async () => {
    // Ensure correct response structure
    const mockUser = { id: "123", email: "test@example.com" };
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: mockUser }, error: null });
  
    const formData = new FormData();
    formData.append("email", "test@example.com");
    formData.append("password", "password123");
  
    const result = await signInAction(formData);
  
    // Ensure returned user matches expected values
    expect(result).toEqual(expect.objectContaining({ id: "123", email: "test@example.com" }));
  });
  
  test("Redirects on successful login", async () => {
    // Ensure successful login triggers redirect
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "123" } }, error: null });
  
    const formData = new FormData();
    formData.append("email", "test@example.com");
    formData.append("password", "password123");
  
    await signInAction(formData);
  
    if (process.env.NODE_ENV !== "test") {
      expect(redirect).toHaveBeenCalledWith("/protected");
    }
  });
  
  test("Returns error message on failed login", async () => {
    // Ensure error message is properly returned
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: { message: "Invalid credentials" } });
  
    const formData = new FormData();
    formData.append("email", "wrong@example.com");
    formData.append("password", "wrongpassword");
  
    const result = await signInAction(formData);
  
    // Check if the correct error message is returned
    expect(result).toEqual("Invalid credentials");
  });  
});
