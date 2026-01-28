/**
 * Index Page - Main Application Entry Point
 * 
 * This is the primary page of the Spring Studio Team Matching application.
 * It handles:
 * - User authentication state
 * - Profile onboarding flow
 * - Team and individual matching via swipe interface
 * - Filter management for both people and teams
 * 
 * @module pages/Index
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Plus, History } from 'lucide-react';

// Components
import { Header } from '@/components/Header';
import { SwipeableCard } from '@/components/SwipeableCard';
import { SwipeableTeamCard } from '@/components/SwipeableTeamCard';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { ProfileDetailModal } from '@/components/ProfileDetailModal';
import { TeamDetailModal } from '@/components/TeamDetailModal';
import { MyProfileModal } from '@/components/MyProfileModal';
import { ChatModal } from '@/components/chat/ChatModal';
import { CreateTeamModal } from '@/components/CreateTeamModal';
import { TeamManagementModal } from '@/components/TeamManagementModal';
import { ActivityModal } from '@/components/ActivityModal';
import { FilterPanel, PeopleFilters, TeamFilters } from '@/components/FilterPanel';
import { PrivacySettingsModal } from '@/components/PrivacySettingsModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SwipeStackSkeleton, PageSkeleton } from '@/components/ui/skeleton-card';

// Hooks
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMatching } from '@/hooks/useTeamMatching';
import { useProfiles } from '@/hooks/useProfiles';
import { useTeams } from '@/hooks/useTeams';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useMyTeam } from '@/hooks/useMyTeam';
import { useActivityHistory } from '@/hooks/useActivityHistory';
import { useSwipeActions } from '@/hooks/useSwipeActions';

// Types & Utils
import { UserProfile, Team, Program, Studio } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { profileSchema, validateInput } from '@/lib/validation';

/**
 * Main Index Component
 * 
 * Orchestrates the entire matching experience including:
 * - Authentication and profile management
 * - Swipeable cards for individuals and teams
 * - Filtering and activity history
 * - Team creation and management
 */
const Index = () => {
  // ============================================================================
  // AUTH & NAVIGATION
  // ============================================================================
  const { user, profile, loading, profileLoading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  // ============================================================================
  // UI STATE
  // ============================================================================
  const [activeTab, setActiveTab] = useState<'individuals' | 'teams'>('individuals');
  const [matches, setMatches] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  // Modal states
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Filter state
  const [peopleFilters, setPeopleFilters] = useState<PeopleFilters>({
    skills: [],
    programs: [],
    studios: [],
  });
  const [teamFilters, setTeamFilters] = useState<TeamFilters>({
    skillsNeeded: [],
    lookingFor: [],
    studios: [],
    teamSize: null,
  });

  // Determine if we have a profile (for conditional hook execution)
  const hasProfile = !!profile;

  // ============================================================================
  // DATA HOOKS - Only fetch when profile exists
  // ============================================================================
  
  /** Profiles available for swiping */
  const { 
    profiles, 
    loading: loadingProfiles, 
    removeProfile, 
    addProfile,
    refresh: refreshProfiles 
  } = useProfiles(user?.id, hasProfile);

  /** Teams available for swiping */
  const { 
    teams, 
    loading: loadingTeams, 
    removeTeam, 
    addTeam 
  } = useTeams(user?.id, hasProfile);

  /** Unread message count for notification badge - deferred */
  const unreadCount = useUnreadCount(hasProfile ? user?.id : undefined);

  /** Current user's team membership */
  const { myTeam, setMyTeam, createTeam, refreshTeam } = useMyTeam(
    hasProfile ? user?.id : undefined, 
    profile
  );

  /** Swipe activity history - deferred, not critical for initial render */
  const { 
    history, 
    loading: loadingHistory,
    addToHistory, 
    removeFromHistory, 
    removeLastFromHistory 
  } = useActivityHistory(hasProfile ? user?.id : undefined, hasProfile);

  // ============================================================================
  // MATCHING HOOKS
  // ============================================================================
  
  const { 
    createIndividualToIndividualMatch, 
    createTeamToIndividualMatch, 
    createIndividualToTeamMatch 
  } = useTeamMatching({
    currentUserId: user?.id || '',
    myTeam,
    onMatchCreated: () => {
      // Could refresh data here if needed
    },
  });

  /** Swipe action handlers */
  const { 
    handleUserSwipe, 
    handleTeamSwipe, 
    handleUndo, 
    handleUndoByIndex, 
    canUndo 
  } = useSwipeActions({
    userId: user?.id,
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
    openChat: () => setIsChatOpen(true),
  });

  // ============================================================================
  // AUTH REDIRECT
  // ============================================================================
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // ============================================================================
  // PROFILE HANDLERS
  // ============================================================================

  /**
   * Handles completing the onboarding wizard
   * Creates a new profile in the database
   */
  const handleOnboardingComplete = async (profileData: Omit<UserProfile, 'id'>) => {
    if (!user) return;

    const validation = validateInput(profileSchema, profileData);
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    const validatedData = (validation as { success: true; data: typeof profileData }).data;

    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        name: validatedData.name,
        program: validatedData.program,
        skills: validatedData.skills,
        bio: validatedData.bio,
        studio_preference: validatedData.studioPreference,
        studio_preferences: validatedData.studioPreferences,
        avatar: validatedData.avatar,
        linkedin: validatedData.linkedIn,
      });

      if (error) {
        console.error('Error saving profile:', error);
        toast.error('Failed to save profile. Please try again.');
        return;
      }

      await refreshProfile();
      toast.success(`Welcome, ${validatedData.name}!`, {
        description: 'Your profile is ready. Start swiping to find teammates!',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setSavingProfile(false);
    }
  };

  /**
   * Handles updating an existing profile
   */
  const handleProfileUpdate = async (updatedProfile: Omit<UserProfile, 'id'>) => {
    if (!user) return;

    const validation = validateInput(profileSchema, updatedProfile);
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    const validatedData = (validation as { success: true; data: typeof updatedProfile }).data;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: validatedData.name,
          program: validatedData.program,
          skills: validatedData.skills,
          bio: validatedData.bio,
          studio_preference: validatedData.studioPreference,
          studio_preferences: validatedData.studioPreferences,
          avatar: validatedData.avatar,
          linkedin: validatedData.linkedIn,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
        return;
      }

      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('An unexpected error occurred');
    }
  };

  // ============================================================================
  // UI HANDLERS
  // ============================================================================

  const handleProfileTap = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setIsProfileModalOpen(true);
  };

  const handleTeamTap = (team: Team) => {
    setSelectedTeam(team);
    setIsTeamModalOpen(true);
  };

  // ============================================================================
  // FILTERED DATA
  // ============================================================================

  /** Filtered profiles based on current filter settings */
  const filteredUsers = useMemo(() => {
    return profiles.filter(user => {
      // Filter by skills
      if (peopleFilters.skills.length > 0) {
        const hasMatchingSkill = peopleFilters.skills.some(skill =>
          user.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
        );
        if (!hasMatchingSkill) return false;
      }
      // Filter by program
      if (peopleFilters.programs.length > 0) {
        if (!peopleFilters.programs.includes(user.program)) return false;
      }
      // Filter by studio preference
      if (peopleFilters.studios.length > 0) {
        const userStudios = user.studioPreferences || [user.studioPreference];
        const hasMatchingStudio = peopleFilters.studios.some(studio =>
          userStudios.includes(studio)
        );
        if (!hasMatchingStudio) return false;
      }
      return true;
    });
  }, [profiles, peopleFilters]);

  /** Filtered teams based on current filter settings */
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      if (teamFilters.skillsNeeded.length > 0) {
        const hasMatchingSkill = teamFilters.skillsNeeded.some(skill =>
          team.skillsNeeded.some(s => s.toLowerCase().includes(skill.toLowerCase()))
        );
        if (!hasMatchingSkill) return false;
      }
      if (teamFilters.lookingFor.length > 0) {
        const hasMatchingProgram = teamFilters.lookingFor.some(program =>
          team.lookingFor.includes(program)
        );
        if (!hasMatchingProgram) return false;
      }
      if (teamFilters.studios.length > 0) {
        if (!teamFilters.studios.includes(team.studio)) return false;
      }
      if (teamFilters.teamSize !== null) {
        if (teamFilters.teamSize === 4) {
          if (team.members.length < 4) return false;
        } else {
          if (team.members.length !== teamFilters.teamSize) return false;
        }
      }
      return true;
    });
  }, [teams, teamFilters]);

  // ============================================================================
  // LOADING & AUTH STATES
  // ============================================================================

  // Show loading spinner during auth check - using inline styles for guaranteed visibility
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0f1a' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: '#ef4444' }} />
          <p className="mt-4 text-lg" style={{ color: '#ffffff' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if no user (after loading completes)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0f1a' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: '#ef4444' }} />
          <p className="mt-4 text-lg" style={{ color: '#ffffff' }}>Redirecting...</p>
        </div>
      </div>
    );
  }
  
  // Show onboarding if no profile exists (profileLoading=false means we checked)
  if (!profileLoading && !profile) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }
  
  // If profile is still loading or doesn't exist yet, show loading
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0f1a' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: '#ef4444' }} />
          <p className="mt-4 text-lg" style={{ color: '#ffffff' }}>Loading profile...</p>
        </div>
      </div>
    );
  }
  
  // Track if data is still loading (for showing skeleton states in card area)
  const isDataLoading = loadingProfiles || loadingTeams;

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const currentItems = activeTab === 'individuals' ? filteredUsers : filteredTeams;
  const hasCards = currentItems.length > 0;

  const currentUserProfile: Omit<UserProfile, 'id'> = {
    name: profile.name,
    program: profile.program,
    skills: profile.skills,
    bio: profile.bio,
    studioPreference: profile.studioPreference,
    studioPreferences: profile.studioPreferences || [profile.studioPreference],
    avatar: profile.avatar,
    linkedIn: profile.linkedIn,
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-background">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        matchCount={matches.length}
        unreadCount={unreadCount}
        onProfileClick={() => setIsMyProfileOpen(true)}
        onChatClick={() => setIsChatOpen(true)}
        onPrivacyClick={() => setIsPrivacyOpen(true)}
        userAvatar={profile?.avatar}
        userName={profile?.name}
        onSignOut={signOut}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Team Status Banner */}
        <motion.div className="mb-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          {myTeam ? (
            <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <span className="text-sm">
                You're part of <strong>{myTeam.name}</strong>
              </span>
              <Button size="sm" variant="outline" onClick={() => setIsTeamManagementOpen(true)}>
                Manage Team
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-accent/50 border border-border">
              <span className="text-sm text-muted-foreground">You're not in a team yet</span>
              <Button size="sm" onClick={() => setIsCreateTeamOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Create Team
              </Button>
            </div>
          )}
        </motion.div>

        {/* Hero Text */}
        <motion.div className="text-center mb-4" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-gradient">Spring Studio</span> Team Matching
          </h2>
          <p className="text-muted-foreground">
            {activeTab === 'individuals'
              ? `${filteredUsers.length} ${filteredUsers.length === 1 ? 'person' : 'people'} to discover${filteredUsers.length !== profiles.length ? ` (${profiles.length} total)` : ''}`
              : `${filteredTeams.length} ${filteredTeams.length === 1 ? 'team' : 'teams'} to explore${filteredTeams.length !== teams.length ? ` (${teams.length} total)` : ''}`}
          </p>
        </motion.div>

        {/* Filter Panel and Activity Button */}
        <div className="flex items-start justify-center gap-2 mb-4 max-w-sm mx-auto">
          <div className="flex-1">
            {activeTab === 'individuals' ? (
              <FilterPanel
                type="people"
                peopleFilters={peopleFilters}
                onPeopleFiltersChange={setPeopleFilters}
              />
            ) : (
              <FilterPanel
                type="teams"
                teamFilters={teamFilters}
                onTeamFiltersChange={setTeamFilters}
              />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsActivityOpen(true)}
            className="gap-2 shrink-0"
          >
            <History className="w-4 h-4" />
            Activity
            {history.length > 0 && (
              <Badge className="ml-1 px-1.5 py-0 text-xs">
                {history.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Swipe Instructions */}
        {hasCards && (
          <motion.div
            className="flex justify-center gap-4 mb-4 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="flex items-center gap-1">
              <span className="text-destructive">←</span>Swipe left to Pass
            </span>
            <span className="border-l border-border pl-4">Tap for details</span>
            <span className="flex items-center gap-1 border-l border-border pl-4">
              Swipe right to Like <span className="text-primary">→</span>
            </span>
          </motion.div>
        )}

        {/* Cards Stack */}
        <div className="relative flex items-start justify-center pb-8">
          <div className="relative w-full max-w-sm h-[420px] sm:h-[460px]">
            {isDataLoading ? (
              <SwipeStackSkeleton />
            ) : (
              <AnimatePresence mode="popLayout">
                {activeTab === 'individuals' ? (
                  hasCards ? (
                    filteredUsers.slice(0, 2).map((user, index) => (
                      <SwipeableCard
                        key={user.id}
                        profile={user}
                        onSwipe={handleUserSwipe}
                        onTap={() => handleProfileTap(user)}
                        isTop={index === 0}
                      />
                    ))
                  ) : (
                    <motion.div
                      key="empty-users"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <p className="text-muted-foreground mb-4">
                        {profiles.length > 0 ? 'No matches for current filters' : "You've seen everyone!"}
                      </p>
                      {canUndo && (
                        <p className="text-sm text-muted-foreground">Use the undo button to go back through profiles</p>
                      )}
                    </motion.div>
                  )
                ) : hasCards ? (
                  filteredTeams.slice(0, 2).map((team, index) => (
                    <SwipeableTeamCard
                      key={team.id}
                      team={team}
                      onSwipe={handleTeamSwipe}
                      onTap={() => handleTeamTap(team)}
                      isTop={index === 0}
                    />
                  ))
                ) : (
                  <motion.div
                    key="empty-teams"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <p className="text-muted-foreground mb-4">
                      {teams.length > 0 ? 'No matches for current filters' : "You've seen all teams!"}
                    </p>
                    {canUndo && (
                      <p className="text-sm text-muted-foreground">Use the undo button to go back through teams</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Studio Info */}
        <motion.div
          className="grid grid-cols-3 gap-2 sm:gap-4 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {[
            { name: 'BigCo Studio', color: 'studio-bigco', desc: 'Fortune 500 innovation' },
            { name: 'Startup Studio', color: 'studio-startup', desc: 'Build your venture' },
            { name: 'PiTech Studio', color: 'studio-pitech', desc: 'Tech for social good' },
          ].map(studio => (
            <div
              key={studio.name}
              className="p-2 sm:p-4 rounded-xl glass text-center hover:scale-105 transition-transform cursor-pointer"
            >
              <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${studio.color} mx-auto mb-1 sm:mb-2`} />
              <h4 className="font-semibold text-foreground text-xs sm:text-sm">{studio.name}</h4>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{studio.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* ======================================================================== */}
      {/* MODALS */}
      {/* ======================================================================== */}

      {/* Profile Detail Modal */}
      <ProfileDetailModal
        profile={selectedProfile}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onLike={() => handleUserSwipe('right')}
        onPass={() => handleUserSwipe('left')}
      />

      {/* Team Detail Modal */}
      <TeamDetailModal
        team={selectedTeam}
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onJoin={() => handleTeamSwipe('right')}
        onPass={() => handleTeamSwipe('left')}
      />

      {/* My Profile Modal */}
      <MyProfileModal
        profile={currentUserProfile}
        isOpen={isMyProfileOpen}
        onClose={() => setIsMyProfileOpen(false)}
        onSave={handleProfileUpdate}
      />

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUserId={user?.id || 'dev-user'}
        onMemberAdded={refreshTeam}
      />

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreateTeam={createTeam}
      />

      {/* Team Management Modal */}
      <TeamManagementModal
        isOpen={isTeamManagementOpen}
        onClose={() => setIsTeamManagementOpen(false)}
        team={myTeam}
        currentUserId={user?.id || ''}
        onOpenChat={() => {
          setIsTeamManagementOpen(false);
          setIsChatOpen(true);
        }}
        onTeamDeleted={() => {
          setMyTeam(null);
          refreshProfiles();
        }}
      />

      {/* Activity Modal */}
      <ActivityModal
        open={isActivityOpen}
        onOpenChange={setIsActivityOpen}
        history={history}
        onUndo={handleUndoByIndex}
        activeTabContext={activeTab}
      />

      {/* Privacy & Security Modal */}
      <PrivacySettingsModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </div>
  );
};

export default Index;
