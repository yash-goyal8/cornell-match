/**
 * Mock Data for Testing
 * 
 * Comprehensive mock data for all entity types used in tests.
 * Use these to create consistent, predictable test scenarios.
 */

import { UserProfile, Team, Program, Studio } from "@/types";

// ============= User Profiles =============

export const createMockProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: `user-${Math.random().toString(36).substr(2, 9)}`,
  name: "Test User",
  program: "MBA" as Program,
  skills: ["TypeScript", "React", "Node.js"],
  bio: "A passionate developer focused on building great products.",
  studioPreference: "startup" as Studio,
  studioPreferences: ["startup", "bigco"] as Studio[],
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=test",
  linkedIn: "https://linkedin.com/in/testuser",
  ...overrides,
});

export const mockProfiles: UserProfile[] = [
  createMockProfile({ id: "user-1", name: "Alice Johnson", program: "MBA" }),
  createMockProfile({ id: "user-2", name: "Bob Smith", program: "CM" }),
  createMockProfile({ id: "user-3", name: "Carol Williams", program: "HealthTech" }),
  createMockProfile({ id: "user-4", name: "David Brown", program: "MEng-CS" }),
  createMockProfile({ id: "user-5", name: "Eve Davis", program: "UrbanTech" }),
];

// ============= Teams =============

export const createMockTeam = (overrides: Partial<Team> = {}): Team => ({
  id: `team-${Math.random().toString(36).substr(2, 9)}`,
  name: "Test Team",
  studio: "startup" as Studio,
  description: "An innovative team working on cutting-edge solutions.",
  members: [createMockProfile()],
  lookingFor: ["MBA", "CM"] as Program[],
  skillsNeeded: ["React", "Python", "Machine Learning"],
  createdBy: "user-123",
  ...overrides,
});

export const mockTeams: Team[] = [
  createMockTeam({
    id: "team-1",
    name: "Alpha Innovators",
    studio: "startup",
    description: "Building the next big thing in fintech",
    skillsNeeded: ["React", "Blockchain", "Finance"],
  }),
  createMockTeam({
    id: "team-2",
    name: "Beta Builders",
    studio: "bigco",
    description: "Enterprise solutions for Fortune 500",
    skillsNeeded: ["Java", "AWS", "Enterprise"],
  }),
  createMockTeam({
    id: "team-3",
    name: "Gamma Makers",
    studio: "pitech",
    description: "Public interest technology for social good",
    skillsNeeded: ["Python", "Data Science", "Policy"],
  }),
];

// ============= Programs & Studios =============

export const allPrograms: Program[] = [
  "MEng-CS",
  "MEng-DSDA",
  "MEng-ECE",
  "CM",
  "DesignTech",
  "HealthTech",
  "UrbanTech",
  "MBA",
  "LLM",
];

export const allStudios: Studio[] = ["startup", "bigco", "pitech"];

// ============= Filter States =============

export const mockPeopleFilters = {
  programs: ["MBA", "CM"] as Program[],
  studios: ["startup"] as Studio[],
  skills: ["React", "TypeScript"],
};

export const mockTeamFilters = {
  studios: ["startup", "bigco"] as Studio[],
  skills: ["React", "Python"],
};

// ============= Swipe History =============

export const mockSwipeHistory = [
  { type: "user" as const, item: mockProfiles[0], direction: "right" as const },
  { type: "user" as const, item: mockProfiles[1], direction: "left" as const },
  { type: "team" as const, item: mockTeams[0], direction: "right" as const },
];

// ============= Match Data =============

export const mockMatch = {
  id: "match-123",
  user_id: "user-123",
  target_user_id: "user-456",
  match_type: "individual_to_individual",
  status: "pending",
  team_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============= Conversation Data =============

export const mockConversation = {
  id: "conv-123",
  type: "match",
  match_id: "match-123",
  team_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockMessage = {
  id: "msg-123",
  conversation_id: "conv-123",
  sender_id: "user-123",
  content: "Hello, this is a test message!",
  created_at: new Date().toISOString(),
};
