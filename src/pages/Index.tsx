import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { SwipeableCard } from '@/components/SwipeableCard';
import { SwipeableTeamCard } from '@/components/SwipeableTeamCard';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { ProfileDetailModal } from '@/components/ProfileDetailModal';
import { TeamDetailModal } from '@/components/TeamDetailModal';
import { MyProfileModal } from '@/components/MyProfileModal';
import { ChatModal } from '@/components/chat/ChatModal';
import { UserProfile, Team, Program, Studio } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface SwipeHistory {
  type: 'user' | 'team';
  item: UserProfile | Team;
  direction: 'left' | 'right';
}

const Index = () => {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'individuals' | 'teams'>('individuals');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<string[]>([]);
  const [history, setHistory] = useState<SwipeHistory[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Fetch profiles of users NOT in any team (excluding current user)
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user) return;
      
      setLoadingProfiles(true);
      try {
        // First get all user_ids who are active team members
        const { data: teamMembers, error: tmError } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('status', 'active');

        if (tmError) {
          console.error('Error fetching team members:', tmError);
        }

        const usersInTeams = new Set((teamMembers || []).map(tm => tm.user_id));

        // Fetch all profiles except current user
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('user_id', user.id);

        if (error) {
          console.error('Error fetching profiles:', error);
          toast.error('Failed to load profiles');
          return;
        }

        // Filter out users who are already in a team
        const availableProfiles = (data || []).filter(p => !usersInTeams.has(p.user_id));

        // Transform database profiles to UserProfile format
        const transformedProfiles: UserProfile[] = availableProfiles.map((p) => ({
          id: p.id,
          name: p.name,
          program: p.program as Program,
          skills: p.skills || [],
          bio: p.bio || '',
          studioPreference: p.studio_preference as Studio,
          avatar: p.avatar || undefined,
          linkedIn: p.linkedin || undefined,
        }));

        setUsers(transformedProfiles);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoadingProfiles(false);
      }
    };

    if (profile) {
      fetchProfiles();
    }
  }, [user, profile]);

  // Fetch real teams with their members from database
  useEffect(() => {
    const fetchTeams = async () => {
      if (!user) return;
      
      setLoadingTeams(true);
      try {
        // Fetch all teams
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*');

        if (teamsError) {
          console.error('Error fetching teams:', teamsError);
          toast.error('Failed to load teams');
          return;
        }

        if (!teamsData || teamsData.length === 0) {
          setTeams([]);
          return;
        }

        // Fetch all team members
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select('team_id, user_id, role')
          .eq('status', 'active');

        if (membersError) {
          console.error('Error fetching team members:', membersError);
        }

        // Fetch profiles for all team members
        const memberUserIds = (membersData || []).map(m => m.user_id);
        let profilesMap: Record<string, any> = {};
        
        if (memberUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('user_id', memberUserIds);

          if (profilesError) {
            console.error('Error fetching member profiles:', profilesError);
          }

          (profilesData || []).forEach(p => {
            profilesMap[p.user_id] = p;
          });
        }

        // Group members by team with their profile data
        const membersByTeam: Record<string, UserProfile[]> = {};
        (membersData || []).forEach(member => {
          if (!membersByTeam[member.team_id]) {
            membersByTeam[member.team_id] = [];
          }
          const profile = profilesMap[member.user_id];
          if (profile) {
            membersByTeam[member.team_id].push({
              id: profile.id,
              name: profile.name,
              program: profile.program as Program,
              skills: profile.skills || [],
              bio: profile.bio || '',
              studioPreference: profile.studio_preference as Studio,
              avatar: profile.avatar || undefined,
              linkedIn: profile.linkedin || undefined,
            });
          }
        });

        // Transform teams data
        const transformedTeams: Team[] = teamsData.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          studio: t.studio as Studio,
          members: membersByTeam[t.id] || [],
          lookingFor: [], // Can be added to teams table later
          skillsNeeded: [], // Can be added to teams table later
          createdBy: t.created_by,
        }));

        setTeams(transformedTeams);
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoadingTeams(false);
      }
    };

    if (profile) {
      fetchTeams();
    }
  }, [user, profile]);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Modal state
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleOnboardingComplete = async (profileData: Omit<UserProfile, 'id'>) => {
    if (!user) return;
    
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        name: profileData.name,
        program: profileData.program,
        skills: profileData.skills,
        bio: profileData.bio,
        studio_preference: profileData.studioPreference,
        avatar: profileData.avatar,
        linkedin: profileData.linkedIn,
      });

      if (error) {
        console.error('Error saving profile:', error);
        toast.error('Failed to save profile. Please try again.');
        return;
      }

      await refreshProfile();
      toast.success(`Welcome, ${profileData.name}!`, {
        description: "Your profile is ready. Start swiping to find teammates!",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile: Omit<UserProfile, 'id'>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: updatedProfile.name,
          program: updatedProfile.program,
          skills: updatedProfile.skills,
          bio: updatedProfile.bio,
          studio_preference: updatedProfile.studioPreference,
          avatar: updatedProfile.avatar,
          linkedin: updatedProfile.linkedIn,
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

  const handleUserSwipe = useCallback((direction: 'left' | 'right') => {
    if (users.length === 0) return;
    
    const currentUserProfile = users[0];
    
    setHistory((prev) => [...prev, { type: 'user', item: currentUserProfile, direction }]);
    
    if (direction === 'right') {
      if (Math.random() < 0.3) {
        setMatches((prev) => [...prev, currentUserProfile.id]);
        toast.success(`It's a match! 🎉`, {
          description: `You and ${currentUserProfile.name} both expressed interest!`,
        });
      } else {
        toast.info(`Interest sent to ${currentUserProfile.name}`, {
          description: "You'll be notified if they're interested too!",
        });
      }
    }
    
    setUsers((prev) => prev.slice(1));
  }, [users]);

  const handleTeamSwipe = useCallback((direction: 'left' | 'right') => {
    if (teams.length === 0) return;
    
    const currentTeam = teams[0];
    
    setHistory((prev) => [...prev, { type: 'team', item: currentTeam, direction }]);
    
    if (direction === 'right') {
      toast.success(`Request sent to ${currentTeam.name}!`, {
        description: "The team will review your profile.",
      });
    }
    
    setTeams((prev) => prev.slice(1));
  }, [teams]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    
    const lastAction = history[history.length - 1];
    
    if (lastAction.type === 'user' && activeTab === 'individuals') {
      setUsers((prev) => [lastAction.item as UserProfile, ...prev]);
      if (lastAction.direction === 'right') {
        setMatches((prev) => prev.filter((id) => id !== (lastAction.item as UserProfile).id));
      }
      toast.info('Undid last swipe');
    } else if (lastAction.type === 'team' && activeTab === 'teams') {
      setTeams((prev) => [lastAction.item as Team, ...prev]);
      toast.info('Undid last swipe');
    }
    
    setHistory((prev) => prev.slice(0, -1));
  }, [history, activeTab]);

  const handleProfileTap = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setIsProfileModalOpen(true);
  };

  const handleTeamTap = (team: Team) => {
    setSelectedTeam(team);
    setIsTeamModalOpen(true);
  };

  const canUndo = history.length > 0 && (
    (activeTab === 'individuals' && history[history.length - 1]?.type === 'user') ||
    (activeTab === 'teams' && history[history.length - 1]?.type === 'team')
  );

  // Show loading state
  if (loading || (profile && (loadingProfiles || loadingTeams))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show onboarding if no profile exists
  if (!profile) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  const currentItems = activeTab === 'individuals' ? users : teams;
  const isLastCard = currentItems.length === 1;
  const hasCards = currentItems.length > 0;

  const currentUserProfile: Omit<UserProfile, 'id'> = {
    name: profile.name,
    program: profile.program,
    skills: profile.skills,
    bio: profile.bio,
    studioPreference: profile.studioPreference,
    avatar: profile.avatar,
    linkedIn: profile.linkedIn,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        matchCount={matches.length}
        onProfileClick={() => setIsMyProfileOpen(true)}
        onChatClick={() => setIsChatOpen(true)}
        userAvatar={profile?.avatar}
        onSignOut={signOut}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Text */}
        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-gradient">Spring Studio</span> Team Matching
          </h2>
          <p className="text-muted-foreground">
            {activeTab === 'individuals' 
              ? `${users.length} ${users.length === 1 ? 'person' : 'people'} to discover`
              : `${teams.length} ${teams.length === 1 ? 'team' : 'teams'} to explore`
            }
          </p>
        </motion.div>

        {/* Swipe Instructions */}
        {hasCards && (
          <motion.div
            className="flex justify-center gap-4 mb-4 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="flex items-center gap-1">
              <span className="text-destructive">←</span> Pass
            </span>
            <span className="border-l border-border pl-4">Tap for details</span>
            <span className="flex items-center gap-1 border-l border-border pl-4">
              Like <span className="text-primary">→</span>
            </span>
          </motion.div>
        )}

        {/* Cards Stack */}
        <div className="relative flex items-start justify-center pb-8">
          <div className="relative w-full max-w-sm h-[420px] sm:h-[460px]">
            <AnimatePresence mode="popLayout">
              {activeTab === 'individuals' ? (
                hasCards ? (
                  users.slice(0, 2).map((user, index) => (
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
                    <p className="text-muted-foreground mb-4">You've seen everyone!</p>
                    {canUndo && (
                      <p className="text-sm text-muted-foreground">
                        Use the undo button to go back through profiles
                      </p>
                    )}
                  </motion.div>
                )
              ) : (
                hasCards ? (
                  teams.slice(0, 2).map((team, index) => (
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
                    <p className="text-muted-foreground mb-4">You've seen all teams!</p>
                    {canUndo && (
                      <p className="text-sm text-muted-foreground">
                        Use the undo button to go back through teams
                      </p>
                    )}
                  </motion.div>
                )
              )}
            </AnimatePresence>
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
          ].map((studio) => (
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
      />
    </div>
  );
};

export default Index;
