import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw, Heart, X, Users, User } from 'lucide-react';
import { UserProfile, Team } from '@/types';
import { ProfileDetailModal } from './ProfileDetailModal';
import { TeamDetailModal } from './TeamDetailModal';

interface SwipeHistory {
  type: 'user' | 'team';
  item: UserProfile | Team;
  direction: 'left' | 'right';
}

interface ActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: SwipeHistory[];
  onUndo: (index: number) => void;
  activeTabContext: 'individuals' | 'teams';
}

export const ActivityModal = ({
  open,
  onOpenChange,
  history,
  onUndo,
  activeTabContext,
}: ActivityModalProps) => {
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  const peopleHistory = history.filter((h) => h.type === 'user');
  const teamHistory = history.filter((h) => h.type === 'team');

  const renderPersonItem = (item: SwipeHistory, index: number) => {
    const profile = item.item as UserProfile;
    const originalIndex = history.findIndex((h) => h === item);

    return (
      <div
        key={`person-${index}`}
        className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/50"
      >
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
          onClick={() => setSelectedProfile(profile)}
        >
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarImage src={profile.avatar} alt={profile.name} />
              <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                item.direction === 'right'
                  ? 'bg-green-500'
                  : 'bg-muted-foreground/50'
              }`}
            >
              {item.direction === 'right' ? (
                <Heart className="w-3 h-3 text-white" />
              ) : (
                <X className="w-3 h-3 text-white" />
              )}
            </div>
          </div>
          <div>
            <p className="font-medium text-foreground">{profile.name}</p>
            <p className="text-xs text-muted-foreground">{profile.program}</p>
            <Badge
              variant={item.direction === 'right' ? 'default' : 'secondary'}
              className="mt-1 text-xs"
            >
              {item.direction === 'right' ? 'Interest Sent' : 'Passed'}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUndo(originalIndex)}
          className="gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Undo
        </Button>
      </div>
    );
  };

  const renderTeamItem = (item: SwipeHistory, index: number) => {
    const team = item.item as Team;
    const originalIndex = history.findIndex((h) => h === item);

    return (
      <div
        key={`team-${index}`}
        className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/50"
      >
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
          onClick={() => setSelectedTeam(team)}
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                item.direction === 'right'
                  ? 'bg-green-500'
                  : 'bg-muted-foreground/50'
              }`}
            >
              {item.direction === 'right' ? (
                <Heart className="w-3 h-3 text-white" />
              ) : (
                <X className="w-3 h-3 text-white" />
              )}
            </div>
          </div>
          <div>
            <p className="font-medium text-foreground">{team.name}</p>
            <p className="text-xs text-muted-foreground">{team.studio}</p>
            <Badge
              variant={item.direction === 'right' ? 'default' : 'secondary'}
              className="mt-1 text-xs"
            >
              {item.direction === 'right' ? 'Request Sent' : 'Passed'}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUndo(originalIndex)}
          className="gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Undo
        </Button>
      </div>
    );
  };

  // Prevent Activity modal from closing when profile/team modal is open
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && (selectedProfile || selectedTeam)) {
      // Don't close if a profile or team modal is open
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => {
          if (selectedProfile || selectedTeam) {
            e.preventDefault();
          }
        }}>
          <DialogHeader>
            <DialogTitle>Activity</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue={activeTabContext === 'individuals' ? 'people' : 'teams'}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="people" className="gap-2">
                <User className="w-4 h-4" />
                People ({peopleHistory.length})
              </TabsTrigger>
              <TabsTrigger value="teams" className="gap-2">
                <Users className="w-4 h-4" />
                Teams ({teamHistory.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="people" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {peopleHistory.length > 0 ? (
                  <div className="space-y-2">
                    {[...peopleHistory].reverse().map((item, index) =>
                      renderPersonItem(item, index)
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <User className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No activity yet</p>
                    <p className="text-xs text-muted-foreground/70">
                      Start swiping to see your history here
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="teams" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {teamHistory.length > 0 ? (
                  <div className="space-y-2">
                    {[...teamHistory].reverse().map((item, index) =>
                      renderTeamItem(item, index)
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No activity yet</p>
                    <p className="text-xs text-muted-foreground/70">
                      Start swiping teams to see your history here
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Profile Detail Modal */}
      <ProfileDetailModal
        profile={selectedProfile}
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        showActions={false}
      />

      {/* Team Detail Modal */}
      <TeamDetailModal
        team={selectedTeam}
        isOpen={!!selectedTeam}
        onClose={() => setSelectedTeam(null)}
        onJoin={() => setSelectedTeam(null)}
        onPass={() => setSelectedTeam(null)}
      />
    </>
  );
};
