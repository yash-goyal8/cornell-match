import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { SwipeableCard } from '@/components/SwipeableCard';
import { SwipeableTeamCard } from '@/components/SwipeableTeamCard';
import { SwipeControls } from '@/components/SwipeControls';
import { EmptyState } from '@/components/EmptyState';
import { mockUsers, mockTeams } from '@/data/mockData';
import { UserProfile, Team } from '@/types';
import { toast } from 'sonner';

const Index = () => {
  const [activeTab, setActiveTab] = useState<'individuals' | 'teams'>('individuals');
  const [users, setUsers] = useState<UserProfile[]>(mockUsers);
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [matches, setMatches] = useState<string[]>([]);

  const handleUserSwipe = useCallback((direction: 'left' | 'right') => {
    if (users.length === 0) return;
    
    const currentUser = users[0];
    
    if (direction === 'right') {
      // Simulate match (30% chance)
      if (Math.random() < 0.3) {
        setMatches((prev) => [...prev, currentUser.id]);
        toast.success(`It's a match! 🎉`, {
          description: `You and ${currentUser.name} both expressed interest!`,
        });
      } else {
        toast.info(`Interest sent to ${currentUser.name}`, {
          description: "You'll be notified if they're interested too!",
        });
      }
    }
    
    setUsers((prev) => prev.slice(1));
  }, [users]);

  const handleTeamSwipe = useCallback((direction: 'left' | 'right') => {
    if (teams.length === 0) return;
    
    const currentTeam = teams[0];
    
    if (direction === 'right') {
      toast.success(`Request sent to ${currentTeam.name}!`, {
        description: "The team will review your profile.",
      });
    }
    
    setTeams((prev) => prev.slice(1));
  }, [teams]);

  const resetUsers = () => setUsers(mockUsers);
  const resetTeams = () => setTeams(mockTeams);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        matchCount={matches.length}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Text */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-2">
            <span className="text-gradient">Spring Studio</span> Team Matching
          </h2>
          <p className="text-muted-foreground">
            {activeTab === 'individuals' 
              ? 'Swipe to find your perfect teammates'
              : 'Discover teams looking for talent like you'
            }
          </p>
        </motion.div>

        {/* Cards Stack */}
        <div className="relative h-[520px] flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            {activeTab === 'individuals' ? (
              users.length > 0 ? (
                users.slice(0, 2).map((user, index) => (
                  <SwipeableCard
                    key={user.id}
                    profile={user}
                    onSwipe={handleUserSwipe}
                    isTop={index === 0}
                  />
                ))
              ) : (
                <EmptyState type="individuals" onReset={resetUsers} />
              )
            ) : (
              teams.length > 0 ? (
                teams.slice(0, 2).map((team, index) => (
                  <SwipeableTeamCard
                    key={team.id}
                    team={team}
                    onSwipe={handleTeamSwipe}
                    isTop={index === 0}
                  />
                ))
              ) : (
                <EmptyState type="teams" onReset={resetTeams} />
              )
            )}
          </AnimatePresence>
        </div>

        {/* Swipe Controls */}
        {((activeTab === 'individuals' && users.length > 0) ||
          (activeTab === 'teams' && teams.length > 0)) && (
          <SwipeControls
            onSwipeLeft={() => 
              activeTab === 'individuals' ? handleUserSwipe('left') : handleTeamSwipe('left')
            }
            onSwipeRight={() => 
              activeTab === 'individuals' ? handleUserSwipe('right') : handleTeamSwipe('right')
            }
          />
        )}

        {/* Studio Info */}
        <motion.div
          className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
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
    </div>
  );
};

export default Index;
