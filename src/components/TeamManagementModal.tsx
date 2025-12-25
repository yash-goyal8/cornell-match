import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Team, UserProfile, Program, Studio } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Crown, MoreVertical, UserPlus, Shield, UserMinus, Loader2, MessageSquare, Trash2 } from 'lucide-react';
import { MemberProfileModal } from './MemberProfileModal';

interface TeamMember extends UserProfile {
  role: string;
  memberId: string;
}

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  currentUserId: string;
  onOpenChat: () => void;
  onTeamDeleted?: () => void;
}

export const TeamManagementModal = ({ 
  isOpen, 
  onClose, 
  team, 
  currentUserId,
  onOpenChat,
  onTeamDeleted
}: TeamManagementModalProps) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isTeamOwner = team?.createdBy === currentUserId;

  const isCurrentUserAdmin = members.some(m => m.id === currentUserId && m.role === 'admin') || 
                              team?.createdBy === currentUserId;

  useEffect(() => {
    if (isOpen && team) {
      fetchMembers();
      fetchAvailableUsers();
    }
  }, [isOpen, team]);

  const fetchMembers = async () => {
    if (!team) return;
    
    setLoading(true);
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('id, user_id, role')
        .eq('team_id', team.id)
        .eq('status', 'confirmed');

      if (membersError) throw membersError;

      const userIds = membersData?.map(m => m.user_id) || [];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const membersList: TeamMember[] = (membersData || []).map(m => {
          const profile = profiles?.find(p => p.user_id === m.user_id);
          return {
            id: profile?.user_id || m.user_id,
            memberId: m.id,
            name: profile?.name || 'Unknown',
            program: (profile?.program || 'MBA') as Program,
            skills: profile?.skills || [],
            bio: profile?.bio || '',
            studioPreference: (profile?.studio_preference || 'startup') as Studio,
            avatar: profile?.avatar || '',
            linkedIn: profile?.linkedin,
            role: m.role,
          };
        });

        setMembers(membersList);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    if (!team) return;

    try {
      // Get current team member user_ids
      const { data: currentMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team.id)
        .eq('status', 'confirmed');

      const memberUserIds = new Set((currentMembers || []).map(m => m.user_id));

      // Get all profiles not in this team
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;

      const available: UserProfile[] = (profiles || [])
        .filter(p => !memberUserIds.has(p.user_id))
        .map(p => ({
          id: p.user_id,
          name: p.name,
          program: p.program as Program,
          skills: p.skills || [],
          bio: p.bio || '',
          studioPreference: p.studio_preference as Studio,
          avatar: p.avatar || '',
          linkedIn: p.linkedin,
        }));

      setAvailableUsers(available);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!team) return;
    
    setAddingMember(userId);
    try {
      // Add to team_members
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          role: 'member',
          status: 'confirmed',
        });

      if (memberError) throw memberError;

      // Add to team conversation if exists
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('team_id', team.id)
        .eq('type', 'team')
        .maybeSingle();

      if (conversation) {
        await supabase
          .from('conversation_participants')
          .insert({
            conversation_id: conversation.id,
            user_id: userId,
          });
      }

      toast.success('Member added to team');
      await fetchMembers();
      await fetchAvailableUsers();
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    } finally {
      setAddingMember(null);
    }
  };

  const handlePromoteToAdmin = async (memberId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: 'admin' })
        .eq('id', memberId);

      if (error) throw error;

      toast.success(`${memberName} is now an admin`);
      await fetchMembers();
    } catch (error) {
      console.error('Error promoting member:', error);
      toast.error('Failed to promote member');
    }
  };

  const handleDemoteFromAdmin = async (memberId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: 'member' })
        .eq('id', memberId);

      if (error) throw error;

      toast.success(`${memberName} is no longer an admin`);
      await fetchMembers();
    } catch (error) {
      console.error('Error demoting member:', error);
      toast.error('Failed to demote member');
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string, memberName: string) => {
    if (!team) return;

    try {
      // Remove from team_members
      const { error: removeError } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (removeError) throw removeError;

      // Remove from team conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('team_id', team.id)
        .eq('type', 'team')
        .maybeSingle();

      if (conversation) {
        await supabase
          .from('conversation_participants')
          .delete()
          .eq('conversation_id', conversation.id)
          .eq('user_id', userId);
      }

      toast.success(`${memberName} removed from team`);
      await fetchMembers();
      await fetchAvailableUsers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleDeleteTeam = async () => {
    if (!team || !isTeamOwner) return;
    
    setDeleting(true);
    try {
      // 1. Delete conversation participants for team conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('team_id', team.id)
        .eq('type', 'team')
        .maybeSingle();

      if (conversation) {
        // Delete all participants
        await supabase
          .from('conversation_participants')
          .delete()
          .eq('conversation_id', conversation.id);
        
        // Delete messages (if any)
        await supabase
          .from('messages')
          .delete()
          .eq('conversation_id', conversation.id);
        
        // Delete the conversation
        await supabase
          .from('conversations')
          .delete()
          .eq('id', conversation.id);
      }

      // 2. Delete team members
      await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team.id);

      // 3. Delete the team
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', team.id);

      if (error) throw error;

      toast.success('Team deleted successfully');
      onClose();
      onTeamDeleted?.();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    } finally {
      setDeleting(false);
    }
  };

  if (!team) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {team.name}
          </DialogTitle>
          <DialogDescription>
            {members.length} member{members.length !== 1 ? 's' : ''} • {team.studio.charAt(0).toUpperCase() + team.studio.slice(1)} Studio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onOpenChat}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Team Chat
            </Button>
            {isCurrentUserAdmin && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowAddMembers(!showAddMembers)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Members
              </Button>
            )}
          </div>

          {/* Add members section */}
          {showAddMembers && isCurrentUserAdmin && (
            <div className="p-3 rounded-lg bg-accent/30 space-y-2">
              <p className="text-sm font-medium">Available Users</p>
              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users available to add</p>
              ) : (
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {availableUsers.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-2 rounded-lg bg-background"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.program}</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleAddMember(user.id)}
                          disabled={addingMember === user.id}
                        >
                          {addingMember === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Add'
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Team members */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Team Members</p>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {members.map((member) => (
                    <div 
                      key={member.memberId}
                      className="flex items-center justify-between p-3 rounded-lg bg-accent/20 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedMember(member)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.name}</p>
                            {member.role === 'admin' && (
                              <Badge variant="secondary" className="text-xs">
                                <Crown className="w-3 h-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            {member.id === currentUserId && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{member.program}</p>
                        </div>
                      </div>

                      {isCurrentUserAdmin && member.id !== currentUserId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role === 'admin' ? (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDemoteFromAdmin(member.memberId, member.name);
                                }}
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Remove Admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePromoteToAdmin(member.memberId, member.name);
                                }}
                              >
                                <Crown className="w-4 h-4 mr-2" />
                                Make Admin
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMember(member.memberId, member.id, member.name);
                              }}
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Remove from Team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Delete Team Section */}
          {isTeamOwner && (
            <div className="pt-4 border-t border-border">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete Team
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Team?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the team "{team.name}", 
                      remove all members, and delete all team conversations.
                      <br /><br />
                      All team members will become available again in the Find People tab.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteTeam}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Team
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Member Profile Modal */}
        <MemberProfileModal
          profile={selectedMember}
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      </DialogContent>
    </Dialog>
  );
};
