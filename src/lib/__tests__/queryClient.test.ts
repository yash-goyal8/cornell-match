/**
 * Query Client Configuration Tests
 * 
 * Tests for React Query client setup and configuration.
 */

import { describe, it, expect } from "vitest";
import { queryClient, queryKeys, createQueryClient, STALE_TIMES, CACHE_TIMES } from "@/lib/queryClient";

describe("Query Client Configuration", () => {
  describe("queryClient instance", () => {
    it("should be defined", () => {
      expect(queryClient).toBeDefined();
    });

    it("should have default options configured", () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions).toBeDefined();
    });

    it("should have queries configured with staleTime", () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.staleTime).toBeDefined();
    });
  });

  describe("createQueryClient", () => {
    it("should create a new QueryClient instance", () => {
      const client = createQueryClient();
      expect(client).toBeDefined();
      expect(client.getDefaultOptions()).toBeDefined();
    });
  });

  describe("STALE_TIMES", () => {
    it("should have PROFILE stale time of 5 minutes", () => {
      expect(STALE_TIMES.PROFILE).toBe(5 * 60 * 1000);
    });

    it("should have TEAMS stale time of 2 minutes", () => {
      expect(STALE_TIMES.TEAMS).toBe(2 * 60 * 1000);
    });

    it("should have MATCHES stale time of 30 seconds", () => {
      expect(STALE_TIMES.MATCHES).toBe(30 * 1000);
    });

    it("should have MESSAGES stale time of 10 seconds", () => {
      expect(STALE_TIMES.MESSAGES).toBe(10 * 1000);
    });
  });

  describe("CACHE_TIMES", () => {
    it("should have DEFAULT cache time of 10 minutes", () => {
      expect(CACHE_TIMES.DEFAULT).toBe(10 * 60 * 1000);
    });
  });

  describe("queryKeys", () => {
    it("should generate profiles keys", () => {
      expect(queryKeys.profiles.all).toEqual(["profiles"]);
      expect(queryKeys.profiles.detail("user-1")).toEqual(["profiles", "detail", "user-1"]);
    });

    it("should generate teams keys", () => {
      expect(queryKeys.teams.all).toEqual(["teams"]);
      expect(queryKeys.teams.myTeam("user-1")).toEqual(["teams", "my", "user-1"]);
    });

    it("should generate matches keys", () => {
      expect(queryKeys.matches.all).toEqual(["matches"]);
      expect(queryKeys.matches.list("user-1")).toEqual(["matches", "list", "user-1"]);
    });

    it("should generate conversations keys", () => {
      expect(queryKeys.conversations.all).toEqual(["conversations"]);
      expect(queryKeys.conversations.unreadCount("user-1")).toEqual(["conversations", "unread", "user-1"]);
    });
  });
});
