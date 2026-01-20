/**
 * Supabase Mock for Testing
 * 
 * Provides comprehensive mocking of Supabase client for unit tests.
 * Use these mocks to test components that depend on Supabase without
 * making actual network requests.
 */

import { vi } from "vitest";

// Mock user data
export const mockUser = {
  id: "user-123",
  email: "test@example.com",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
};

// Mock session data
export const mockSession = {
  access_token: "mock-access-token",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "mock-refresh-token",
  user: mockUser,
};

// Mock profile data
export const mockProfile = {
  id: "profile-123",
  user_id: "user-123",
  name: "Test User",
  program: "MBA",
  skills: ["TypeScript", "React"],
  bio: "A test user bio",
  studio_preference: "startup",
  studio_preferences: ["startup", "bigco"],
  avatar: "https://example.com/avatar.jpg",
  linkedin: "https://linkedin.com/in/testuser",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock team data
export const mockTeam = {
  id: "team-123",
  name: "Test Team",
  description: "A test team description",
  studio: "startup",
  looking_for: "Developer",
  skills_needed: ["React", "Node.js"],
  created_by: "user-123",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock team member data
export const mockTeamMember = {
  id: "member-123",
  team_id: "team-123",
  user_id: "user-123",
  role: "owner",
  status: "confirmed",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Create a chainable query builder mock
export const createQueryBuilder = <T>(data: T | T[] | null = null, error: Error | null = null) => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
    then: vi.fn((resolve) => resolve({ data, error })),
  };
  return builder;
};

// Create the main Supabase mock
export const createSupabaseMock = () => {
  const authMock = {
    getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: mockSession, user: mockUser }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { session: mockSession, user: mockUser }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  };

  return {
    auth: authMock,
    from: vi.fn((table: string) => {
      switch (table) {
        case "profiles":
          return createQueryBuilder(mockProfile);
        case "teams":
          return createQueryBuilder(mockTeam);
        case "team_members":
          return createQueryBuilder(mockTeamMember);
        default:
          return createQueryBuilder(null);
      }
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  };
};

// Export default mock instance
export const supabaseMock = createSupabaseMock();
