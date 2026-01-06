/**
 * useSwipeActions Hook
 * 
 * Handles all swipe-related actions including:
 * - User swipes (individual to individual, team to individual)
 * - Team swipes (individual to team)
 * - Undo functionality
 * 
 * @param params - Configuration object with required dependencies
 * @returns {Object} Swipe action handlers
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, Team } from '@/types';
import { toast } from 'sonner';
import { SwipeHistory } from './useActivityHistory';

interface UseSwipeActionsParams {
  userId: string | undefined;
  myTeam: Team | null;
  profiles: UserProfile[];
  teams: Team[];
  history: SwipeHistory[];
  activeTab: 'individuals' | 'teams';
  removeProfile: (id: string) => void;
  addProfile: (profile: UserProfile) => void;
  removeTeam: (id: string) => void;
  addTeam: (team: Team) => void;
  addToHistory: (item: SwipeHistory) => void;
  removeFromHistory: (index: number) => void;
  removeLastFromHistory: () => void;
  setMatches: React.Dispatch<React.SetStateAction<string[]>>;
  createIndividualToIndividualMatch: (profile: UserProfile) => Promise<any>;
  createTeamToIndividualMatch: (profile: UserProfile) => Promise<any>;
  createIndividualToTeamMatch: (team: Team) => Promise<any>;
  openChat: () => void;
}

interface UseSwipeActionsResult {
  /** Handle user card swipe */
  handleUserSwipe: (direction: 'left' | 'right') => Promise<void>;
  /** Handle team card swipe */
  handleTeamSwipe: (direction: 'left' | 'right') => Promise<void>;
  /** Undo last swipe action */
  handleUndo: () => Promise<void>;
  /** Undo a specific action by index */
  handleUndoByIndex: (index: number) => Promise<void>;
  /** Whether undo is available */
  canUndo: boolean;
}

export function useSwipeActions({
  userId,
  myTeam,
  profiles,
  teams,
  history,
  activeTab,
  removeProfile,
  addProfile,
  removeTeam,
  addTeam,
  addToHistory,
  removeFromHistory,
  removeLastFromHistory,
  setMatches,
  createIndividualToIndividualMatch,
  createTeamToIndividualMatch,
  createIndividualToTeamMatch,
  openChat,
}: UseSwipeActionsParams): UseSwipeActionsResult {

  /**
   * Handles swiping on a user profile
   */
  const handleUserSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (profiles.length === 0) return;

    const currentUserProfile = profiles[0];
    addToHistory({ type: 'user', item: currentUserProfile, direction });

    if (direction === 'right') {
      // Like - create appropriate match type based on team membership
      if (myTeam) {
        const result = await createTeamToIndividualMatch(currentUserProfile);
        if (result) openChat();
      } else {
        const result = await createIndividualToIndividualMatch(currentUserProfile);
        if (result) openChat();
      }
    } else {
      // Pass - record rejection so they don't appear again
      try {
        await supabase.from('matches').insert({
          user_id: userId,
          target_user_id: currentUserProfile.id,
          match_type: 'individual_to_individual',
          status: 'rejected',
        });
      } catch (error) {
        console.error('Error recording pass:', error);
      }
    }

    removeProfile(currentUserProfile.id);
  }, [profiles, myTeam, userId, addToHistory, removeProfile, createIndividualToIndividualMatch, createTeamToIndividualMatch, openChat]);

  /**
   * Handles swiping on a team
   */
  const handleTeamSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (teams.length === 0) return;

    const currentTeam = teams[0];
    addToHistory({ type: 'team', item: currentTeam, direction });

    if (direction === 'right') {
      // Like - create individual to team match
      const result = await createIndividualToTeamMatch(currentTeam);
      if (result) openChat();
    } else {
      // Pass - record rejection
      try {
        await supabase.from('matches').insert({
          user_id: userId,
          target_user_id: currentTeam.createdBy,
          team_id: currentTeam.id,
          match_type: 'individual_to_team',
          status: 'rejected',
        });
      } catch (error) {
        console.error('Error recording team pass:', error);
      }
    }

    removeTeam(currentTeam.id);
  }, [teams, userId, addToHistory, removeTeam, createIndividualToTeamMatch, openChat]);

  /**
   * Undoes the last swipe action
   */
  const handleUndo = useCallback(async () => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];

    if (lastAction.type === 'user' && activeTab === 'individuals') {
      const profile = lastAction.item as UserProfile;
      addProfile(profile);
      
      if (lastAction.direction === 'right') {
        setMatches(prev => prev.filter(id => id !== profile.id));
      }
      
      // Delete the match record from database
      try {
        await supabase
          .from('matches')
          .delete()
          .eq('user_id', userId)
          .eq('target_user_id', profile.id);
      } catch (error) {
        console.error('Error deleting match:', error);
      }
      
      toast.info('Undid last swipe');
    } else if (lastAction.type === 'team' && activeTab === 'teams') {
      const team = lastAction.item as Team;
      addTeam(team);
      
      // Delete the match record from database
      try {
        await supabase
          .from('matches')
          .delete()
          .eq('user_id', userId)
          .eq('team_id', team.id);
      } catch (error) {
        console.error('Error deleting team match:', error);
      }
      
      toast.info('Undid last swipe');
    }

    removeLastFromHistory();
  }, [history, activeTab, userId, addProfile, addTeam, setMatches, removeLastFromHistory]);

  /**
   * Undoes a specific action by index (from Activity modal)
   */
  const handleUndoByIndex = useCallback(async (index: number) => {
    const action = history[index];
    if (!action) return;

    if (action.type === 'user') {
      const profile = action.item as UserProfile;
      addProfile(profile);
      
      if (action.direction === 'right') {
        setMatches(prev => prev.filter(id => id !== profile.id));
      }
      
      try {
        await supabase
          .from('matches')
          .delete()
          .eq('user_id', userId)
          .eq('target_user_id', profile.id);
      } catch (error) {
        console.error('Error deleting match:', error);
      }
    } else if (action.type === 'team') {
      const team = action.item as Team;
      addTeam(team);
      
      try {
        await supabase
          .from('matches')
          .delete()
          .eq('user_id', userId)
          .eq('team_id', team.id);
      } catch (error) {
        console.error('Error deleting team match:', error);
      }
    }

    removeFromHistory(index);
    toast.info('Action undone');
  }, [history, userId, addProfile, addTeam, setMatches, removeFromHistory]);

  // Determine if undo is available
  const canUndo = history.length > 0 && (
    (activeTab === 'individuals' && history[history.length - 1]?.type === 'user') ||
    (activeTab === 'teams' && history[history.length - 1]?.type === 'team')
  );

  return {
    handleUserSwipe,
    handleTeamSwipe,
    handleUndo,
    handleUndoByIndex,
    canUndo,
  };
}
