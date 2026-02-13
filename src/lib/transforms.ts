/**
 * Data transformation utilities
 * Centralized profile and team transformations to eliminate duplication
 */

import { UserProfile, Team, Program, Studio } from '@/types';

/**
 * Transforms a database profile record into a UserProfile object
 */
export const transformProfile = (p: any): UserProfile => ({
  id: p.user_id || p.id,
  name: p.name,
  program: p.program as Program,
  skills: p.skills || [],
  bio: p.bio || '',
  studioPreference: p.studio_preference as Studio,
  studioPreferences: (p.studio_preferences as Studio[]) || [p.studio_preference as Studio],
  avatar: p.avatar || undefined,
  linkedIn: p.linkedin || undefined,
});

/**
 * Transforms a database team record into a Team object
 */
export const transformTeam = (t: any): Team => ({
  id: t.id,
  name: t.name,
  description: t.description || '',
  studio: t.studio as Studio,
  members: [],
  lookingFor: [],
  skillsNeeded: t.skills_needed || [],
  createdBy: t.created_by,
});
