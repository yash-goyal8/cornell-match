import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { SwipeableCard } from '@/components/SwipeableCard';
import { SwipeableTeamCard } from '@/components/SwipeableTeamCard';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { ProfileDetailModal } from '@/components/ProfileDetailModal';
import { TeamDetailModal } from '@/components/TeamDetailModal';
import { MyProfileModal } from '@/components/MyProfileModal';
import { mockUsers, mockTeams } from '@/data/mockData';
import { UserProfile, Team } from '@/types';
import { toast } from 'sonner';

interface SwipeHistory {
  type: 'user' | 'team';
  item: UserProfile | Team;
  direction: 'left' | 'right';
}

const Index = () => {
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [currentUser, setCurrentUser] = useState<Omit<UserProfile, 'id'> | null>(null);
  const [activeTab, setActiveTab] = useState<'individuals' | 'teams'>('individuals');
  const [users, setUsers] = useState<UserProfile[]>(mockUsers);
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [matches, setMatches] = useState<string[]>([]);
  const [history, setHistory] = useState<SwipeHistory[]>([]);
  
  // Modal state
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);

  const handleOnboardingComplete = (profile: Omit<UserProfile, 'id'>) => {
    setCurrentUser(profile);
    setHasOnboarded(true);
    toast.success(`Welcome, ${profile.name}!`, {
      description: "Your profile is ready. Start swiping to find teammates!",
    });
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

  if (!hasOnboarded) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  const currentItems = activeTab === 'individuals' ? users : teams;
  const isLastCard = currentItems.length === 1;
  const hasCards = currentItems.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        matchCount={matches.length}
        onProfileClick={() => setIsMyProfileOpen(true)}
        userAvatar={currentUser?.avatar}
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
        <div className="relative h-[380px] flex items-start justify-center">
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


        {/* Studio Info */}
        <motion.div
          className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto relative z-0"
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
              className="p-4 rounded-xl glass text-center hover:scale-105 transition-transform cursor-pointer"
            >
              <div className={`w-3 h-3 rounded-full ${studio.color} mx-auto mb-2`} />
              <h4 className="font-semibold text-foreground text-sm">{studio.name}</h4>
              <p className="text-xs text-muted-foreground">{studio.desc}</p>
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
        profile={currentUser}
        isOpen={isMyProfileOpen}
        onClose={() => setIsMyProfileOpen(false)}
        onSave={(updatedProfile) => setCurrentUser(updatedProfile)}
      />
    </div>
  );
};

export default Index;
