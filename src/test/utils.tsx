/**
 * Test Utilities
 * 
 * Provides wrapper components and utility functions for testing.
 * Use renderWithProviders for components that need context providers.
 */

import React, { ReactElement } from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { vi, expect } from "vitest";

// Create a fresh query client for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Mock auth context value
export const mockAuthContext = {
  user: {
    id: "user-123",
    email: "test@example.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
  },
  session: {
    access_token: "mock-token",
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "mock-refresh-token",
    user: {
      id: "user-123",
      email: "test@example.com",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
    },
  },
  profile: {
    id: "user-123",
    name: "Test User",
    program: "MBA" as const,
    skills: ["React", "TypeScript"],
    bio: "Test bio",
    studioPreference: "startup" as const,
    studioPreferences: ["startup"] as const,
    avatar: "",
    linkedIn: "",
  },
  loading: false,
  signOut: vi.fn(),
  refreshProfile: vi.fn(),
};

interface WrapperProps {
  children: React.ReactNode;
}

// All providers wrapper
const AllProviders = ({ children }: WrapperProps) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render with all providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
): RenderResult => {
  return render(ui, { wrapper: AllProviders, ...options });
};

// Wait for async operations
export const waitForAsync = (ms: number = 100): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Create a mock event
export const createMockEvent = (overrides = {}) => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  ...overrides,
});

// Type-safe expect helpers
export const expectToBeInDocument = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument();
};

export const expectNotToBeInDocument = (element: HTMLElement | null) => {
  expect(element).not.toBeInTheDocument();
};

// Re-export everything from testing-library
export * from "@testing-library/react";
export { renderWithProviders as render };
