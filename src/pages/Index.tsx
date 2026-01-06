import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/Header";
import { SwipeableCard } from "@/components/SwipeableCard";
import { SwipeableTeamCard } from "@/components/SwipeableTeamCard";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { ProfileDetailModal } from "@/components/ProfileDetailModal";
import { TeamDetailModal } from "@/components/TeamDetailModal";
import { MyProfileModal } from "@/components/MyProfileModal";
import { ChatModal } from "@/components/chat/ChatModal";
import { CreateTeamModal } from "@/components/CreateTeamModal";
import { TeamManagementModal } from "@/components/TeamManagementModal";
import { ActivityModal } from "@/components/ActivityModal";
import { FilterPanel, PeopleFilters, TeamFilters } from "@/components/FilterPanel";
import { UserProfile, Team, Program, Studio } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamMatching } from "@/hooks/useTeamMatching";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { profileSchema, teamSchema, validateInput } from "@/lib/validation";
import { Loader2, Plus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SwipeHistory {
  type: "user" | "team";
  item: UserProfile | Team;
  direction: "left" | "right";
}

const Index = () => {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"individuals" | "teams">("individuals");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<string[]>([]);
  const [history, setHistory] = useState<SwipeHistory[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  // Load activity history from database on mount
  useEffect(() => {
    const loadActivityHistory = async () => {
      if (!user) return;

      setLoadingHistory(true);
      try {
        // Fetch all matches (swipes) made by the user
        const { data: matchesData, error } = await supabase
          .from("matches")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading activity history:", error);
          return;
        }

        if (!matchesData || matchesData.length === 0) {
          setLoadingHistory(false);
          return;
        }

        // Separate individual and team matches
        const individualMatches = matchesData.filter(
          (m) => m.match_type === "individual_to_individual" || m.match_type === "team_to_individual"
        );
        const teamMatches = matchesData.filter((m) => m.match_type === "individual_to_team");

        // Fetch profiles for individual matches
        const targetUserIds = individualMatches.map((m) => m.target_user_id);
        let profilesMap: Record<string, any> = {};

        if (targetUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("*")
            .in("user_id", targetUserIds);

          (profiles || []).forEach((p) => {
            profilesMap[p.user_id] = p;
          });
        }

        // Fetch teams for team matches
        const teamIds = teamMatches.map((m) => m.team_id).filter(Boolean);
        let teamsMap: Record<string, any> = {};

        if (teamIds.length > 0) {
          const { data: teamsData } = await supabase
            .from("teams")
            .select("*")
            .in("id", teamIds);

          (teamsData || []).forEach((t) => {
            teamsMap[t.id] = t;
          });
        }

        // Build history items
        const historyItems: SwipeHistory[] = [];

        individualMatches.forEach((match) => {
          const profile = profilesMap[match.target_user_id];
          if (profile) {
            historyItems.push({
              type: "user",
              item: {
                id: profile.user_id,
                name: profile.name,
                program: profile.program as Program,
                skills: profile.skills || [],
                bio: profile.bio || "",
                studioPreference: profile.studio_preference as Studio,
                studioPreferences: (profile.studio_preferences as Studio[]) || [profile.studio_preference as Studio],
                avatar: profile.avatar || undefined,
                linkedIn: profile.linkedin || undefined,
              },
              direction: match.status === "rejected" ? "left" : "right",
            });
          }
        });

        teamMatches.forEach((match) => {
          const team = match.team_id ? teamsMap[match.team_id] : null;
          if (team) {
            historyItems.push({
              type: "team",
              item: {
                id: team.id,
                name: team.name,
                description: team.description || "",
                studio: team.studio as Studio,
                members: [],
                lookingFor: [],
                skillsNeeded: [],
                createdBy: team.created_by,
              },
              direction: match.status === "rejected" ? "left" : "right",
            });
          }
        });

        setHistory(historyItems);
      } catch (error) {
        console.error("Error loading activity history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (profile) {
      loadActivityHistory();
    }
  }, [user, profile]);

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

  // Fetch profiles of users NOT in any team and NOT already swiped (excluding current user)
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user) return;

      setLoadingProfiles(true);
      try {
        // First get all user_ids who are active team members
        const { data: teamMembers, error: tmError } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("status", "confirmed");

        if (tmError) {
          console.error("Error fetching team members:", tmError);
        }

        const usersInTeams = new Set((teamMembers || []).map((tm) => tm.user_id));

        // Get all users that the current user has already swiped on
        const { data: swipedMatches, error: matchesError } = await supabase
          .from("matches")
          .select("target_user_id")
          .eq("user_id", user.id)
          .in("match_type", ["individual_to_individual", "team_to_individual"]);

        if (matchesError) {
          console.error("Error fetching swiped matches:", matchesError);
        }

        const swipedUserIds = new Set((swipedMatches || []).map((m) => m.target_user_id));

        // Fetch all profiles except current user
        const { data, error } = await supabase.from("profiles").select("*").neq("user_id", user.id);

        if (error) {
          console.error("Error fetching profiles:", error);
          toast.error("Failed to load profiles");
          return;
        }

        // Filter out users who are already in a team OR already swiped
        const availableProfiles = (data || []).filter(
          (p) => !usersInTeams.has(p.user_id) && !swipedUserIds.has(p.user_id)
        );

        // Transform database profiles to UserProfile format
        const transformedProfiles: UserProfile[] = availableProfiles.map((p) => ({
          id: p.user_id, // Use user_id as id for matching purposes
          name: p.name,
          program: p.program as Program,
          skills: p.skills || [],
          bio: p.bio || "",
          studioPreference: p.studio_preference as Studio,
          studioPreferences: (p.studio_preferences as Studio[]) || [p.studio_preference as Studio],
          avatar: p.avatar || undefined,
          linkedIn: p.linkedin || undefined,
        }));

        setUsers(transformedProfiles);
      } catch (error) {
        console.error("Error fetching profiles:", error);
      } finally {
        setLoadingProfiles(false);
      }
    };

    if (profile) {
      fetchProfiles();
    }
  }, [user, profile]);

  // Fetch real teams with their members from database (excluding already swiped)
  useEffect(() => {
    const fetchTeams = async () => {
      if (!user) return;

      setLoadingTeams(true);
      try {
        // Get teams the user has already swiped on
        const { data: swipedTeams, error: swipedError } = await supabase
          .from("matches")
          .select("team_id")
          .eq("user_id", user.id)
          .eq("match_type", "individual_to_team")
          .not("team_id", "is", null);

        if (swipedError) {
          console.error("Error fetching swiped teams:", swipedError);
        }

        const swipedTeamIds = new Set((swipedTeams || []).map((m) => m.team_id));

        // Fetch all teams
        const { data: teamsData, error: teamsError } = await supabase.from("teams").select("*");

        if (teamsError) {
          console.error("Error fetching teams:", teamsError);
          toast.error("Failed to load teams");
          return;
        }

        if (!teamsData || teamsData.length === 0) {
          setTeams([]);
          return;
        }

        // Filter out already swiped teams and teams user is a member of
        const availableTeamsData = teamsData.filter((t) => !swipedTeamIds.has(t.id));

        // Fetch all team members
        const { data: membersData, error: membersError } = await supabase
          .from("team_members")
          .select("team_id, user_id, role")
          .eq("status", "confirmed");

        if (membersError) {
          console.error("Error fetching team members:", membersError);
        }

        // Check which teams the user is a member of
        const userTeamIds = new Set(
          (membersData || [])
            .filter((m) => m.user_id === user.id)
            .map((m) => m.team_id)
        );

        // Filter out teams the user is already a member of
        const filteredTeamsData = availableTeamsData.filter((t) => !userTeamIds.has(t.id));

        // Fetch profiles for all team members
        const memberUserIds = (membersData || []).map((m) => m.user_id);
        let profilesMap: Record<string, any> = {};

        if (memberUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("*")
            .in("user_id", memberUserIds);

          if (profilesError) {
            console.error("Error fetching member profiles:", profilesError);
          }

          (profilesData || []).forEach((p) => {
            profilesMap[p.user_id] = p;
          });
        }

        // Group members by team with their profile data
        const membersByTeam: Record<string, UserProfile[]> = {};
        (membersData || []).forEach((member) => {
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
              bio: profile.bio || "",
              studioPreference: profile.studio_preference as Studio,
              studioPreferences: (profile.studio_preferences as Studio[]) || [profile.studio_preference as Studio],
              avatar: profile.avatar || undefined,
              linkedIn: profile.linkedin || undefined,
            });
          }
        });

        // Transform teams data
        const transformedTeams: Team[] = filteredTeamsData.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description || "",
          studio: t.studio as Studio,
          members: membersByTeam[t.id] || [],
          lookingFor: [], // Can be added to teams table later
          skillsNeeded: [], // Can be added to teams table later
          createdBy: t.created_by,
        }));

        setTeams(transformedTeams);
      } catch (error) {
        console.error("Error fetching teams:", error);
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
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isTeamManagementOpen, setIsTeamManagementOpen] = useState(false);
  const [myTeam, setMyTeam] = useState<Team | null>(null);

  // Team matching hook
  const { createIndividualToIndividualMatch, createTeamToIndividualMatch, createIndividualToTeamMatch } = useTeamMatching({
    currentUserId: user?.id || '',
    myTeam,
    onMatchCreated: () => {
      // Could refresh data here if needed
    },
  });

  // Check if current user has a team
  useEffect(() => {
    const checkUserTeam = async () => {
      if (!user) return;

      // Check if user is a member of any team
      const { data: membership } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .maybeSingle();

      if (membership) {
        // Fetch team details
        const { data: teamData } = await supabase.from("teams").select("*").eq("id", membership.team_id).single();

        if (teamData) {
          // Fetch team members
          const { data: members } = await supabase
            .from("team_members")
            .select("user_id")
            .eq("team_id", teamData.id)
            .eq("status", "confirmed");

          const memberUserIds = (members || []).map((m) => m.user_id);
          let teamMembers: UserProfile[] = [];

          if (memberUserIds.length > 0) {
            const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", memberUserIds);

            teamMembers = (profiles || []).map((p) => ({
              id: p.user_id,
              name: p.name,
              program: p.program as Program,
              skills: p.skills || [],
              bio: p.bio || "",
              studioPreference: p.studio_preference as Studio,
              studioPreferences: (p.studio_preferences as Studio[]) || [p.studio_preference as Studio],
              avatar: p.avatar || "",
              linkedIn: p.linkedin,
            }));
          }

          setMyTeam({
            id: teamData.id,
            name: teamData.name,
            description: teamData.description || "",
            studio: teamData.studio as Studio,
            members: teamMembers,
            lookingFor: [],
            skillsNeeded: [],
            createdBy: teamData.created_by,
          });
        }
      } else {
        setMyTeam(null);
      }
    };

    if (profile) {
      checkUserTeam();
    }
  }, [user, profile]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleOnboardingComplete = async (profileData: Omit<UserProfile, "id">) => {
    if (!user) return;

    // Validate input data
    const validation = validateInput(profileSchema, profileData);
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    const validatedData = (validation as { success: true; data: typeof profileData }).data;

    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").insert({
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
        console.error("Error saving profile:", error);
        toast.error("Failed to save profile. Please try again.");
        return;
      }

      await refreshProfile();
      toast.success(`Welcome, ${validatedData.name}!`, {
        description: "Your profile is ready. Start swiping to find teammates!",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile: Omit<UserProfile, "id">) => {
    if (!user) return;

    // Validate input data
    const validation = validateInput(profileSchema, updatedProfile);
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    const validatedData = (validation as { success: true; data: typeof updatedProfile }).data;

    try {
      const { error } = await supabase
        .from("profiles")
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
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        toast.error("Failed to update profile");
        return;
      }

      await refreshProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleCreateTeam = async (teamData: {
    name: string;
    description: string;
    studio: Studio;
    lookingFor: string;
    skillsNeeded: string[];
  }) => {
    if (!user) return;

    // Validate input data
    const validation = validateInput(teamSchema, teamData);
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    const validatedData = (validation as { success: true; data: typeof teamData }).data;

    try {
      // 1. Create the team
      const { data: newTeam, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: validatedData.name,
          description: validatedData.description,
          studio: validatedData.studio,
          looking_for: validatedData.lookingFor,
          skills_needed: validatedData.skillsNeeded,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // 2. Add creator as owner member
      const { error: memberError } = await supabase.from("team_members").insert({
        team_id: newTeam.id,
        user_id: user.id,
        role: "owner",
        status: "confirmed",
      });

      if (memberError) throw memberError;

      // 3. Create team conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          type: "team",
          team_id: newTeam.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // 4. Add creator to conversation participants
      const { error: participantError } = await supabase.from("conversation_participants").insert({
        conversation_id: conversation.id,
        user_id: user.id,
      });

      if (participantError) throw participantError;

      // Update local state
      const creatorProfile: UserProfile = {
        id: user.id,
        name: profile?.name || "You",
        program: (profile?.program as Program) || "MBA",
        skills: profile?.skills || [],
        bio: profile?.bio || "",
        studioPreference: (profile?.studioPreference as Studio) || "startup",
        studioPreferences: (profile?.studioPreferences as Studio[]) || [(profile?.studioPreference as Studio) || "startup"],
        avatar: profile?.avatar || "",
        linkedIn: profile?.linkedIn,
      };

      const createdTeam: Team = {
        id: newTeam.id,
        name: newTeam.name,
        description: newTeam.description || "",
        studio: newTeam.studio as Studio,
        members: [creatorProfile],
        lookingFor: [],
        skillsNeeded: [],
        createdBy: user.id,
      };

      setMyTeam(createdTeam);
      setTeams((prev) => [createdTeam, ...prev]);

      toast.success("Team created!", {
        description: `You are now the admin of "${teamData.name}"`,
      });
    } catch (error) {
      console.error("Error creating team:", error);
      toast.error("Failed to create team");
      throw error;
    }
  };

  const handleUserSwipe = useCallback(
    async (direction: "left" | "right") => {
      if (users.length === 0) return;

      const currentUserProfile = users[0];

      setHistory((prev) => [...prev, { type: "user", item: currentUserProfile, direction }]);

      if (direction === "right") {
        // If user is part of a team, create team-to-individual match
        if (myTeam) {
          const result = await createTeamToIndividualMatch(currentUserProfile);
          if (result) {
            setIsChatOpen(true);
          }
        } else {
          // Individual to individual matching - create match and conversation
          const result = await createIndividualToIndividualMatch(currentUserProfile);
          if (result) {
            setIsChatOpen(true);
          }
        }
      } else {
        // Left swipe - still record it so they don't see this person again
        // We'll create a match record with status 'rejected' for filtering
        try {
          await supabase
            .from('matches')
            .insert({
              user_id: user?.id,
              target_user_id: currentUserProfile.id,
              match_type: 'individual_to_individual',
              status: 'rejected',
            });
        } catch (error) {
          console.error('Error recording pass:', error);
        }
      }

      setUsers((prev) => prev.slice(1));
    },
    [users, myTeam, createTeamToIndividualMatch, createIndividualToIndividualMatch, user],
  );

  const handleTeamSwipe = useCallback(
    async (direction: "left" | "right") => {
      if (teams.length === 0) return;

      const currentTeam = teams[0];

      setHistory((prev) => [...prev, { type: "team", item: currentTeam, direction }]);

      if (direction === "right") {
        // Individual swipes on team - create individual-to-team match
        const result = await createIndividualToTeamMatch(currentTeam);
        if (result) {
          setIsChatOpen(true);
        }
      } else {
        // Left swipe - record it so they don't see this team again
        try {
          await supabase
            .from('matches')
            .insert({
              user_id: user?.id,
              target_user_id: currentTeam.createdBy,
              team_id: currentTeam.id,
              match_type: 'individual_to_team',
              status: 'rejected',
            });
        } catch (error) {
          console.error('Error recording team pass:', error);
        }
      }

      setTeams((prev) => prev.slice(1));
    },
    [teams, createIndividualToTeamMatch, user],
  );

  const handleUndo = useCallback(async () => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];

    if (lastAction.type === "user" && activeTab === "individuals") {
      const profile = lastAction.item as UserProfile;
      setUsers((prev) => [profile, ...prev]);
      if (lastAction.direction === "right") {
        setMatches((prev) => prev.filter((id) => id !== profile.id));
      }
      // Delete the match record from database
      try {
        await supabase
          .from('matches')
          .delete()
          .eq('user_id', user?.id)
          .eq('target_user_id', profile.id);
      } catch (error) {
        console.error('Error deleting match:', error);
      }
      toast.info("Undid last swipe");
    } else if (lastAction.type === "team" && activeTab === "teams") {
      const team = lastAction.item as Team;
      setTeams((prev) => [team, ...prev]);
      // Delete the match record from database
      try {
        await supabase
          .from('matches')
          .delete()
          .eq('user_id', user?.id)
          .eq('team_id', team.id);
      } catch (error) {
        console.error('Error deleting team match:', error);
      }
      toast.info("Undid last swipe");
    }

    setHistory((prev) => prev.slice(0, -1));
  }, [history, activeTab, user]);

  // Undo a specific action by index (from Activity modal)
  const handleUndoByIndex = useCallback(async (index: number) => {
    const action = history[index];
    if (!action) return;

    if (action.type === "user") {
      const profile = action.item as UserProfile;
      setUsers((prev) => [profile, ...prev]);
      if (action.direction === "right") {
        setMatches((prev) => prev.filter((id) => id !== profile.id));
      }
      // Delete the match record from database
      try {
        await supabase
          .from('matches')
          .delete()
          .eq('user_id', user?.id)
          .eq('target_user_id', profile.id);
      } catch (error) {
        console.error('Error deleting match:', error);
      }
    } else if (action.type === "team") {
      const team = action.item as Team;
      setTeams((prev) => [team, ...prev]);
      // Delete the match record from database
      try {
        await supabase
          .from('matches')
          .delete()
          .eq('user_id', user?.id)
          .eq('team_id', team.id);
      } catch (error) {
        console.error('Error deleting team match:', error);
      }
    }

    setHistory((prev) => prev.filter((_, i) => i !== index));
    toast.info("Action undone");
  }, [history, user]);

  const handleProfileTap = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setIsProfileModalOpen(true);
  };

  const handleTeamTap = (team: Team) => {
    setSelectedTeam(team);
    setIsTeamModalOpen(true);
  };

  const canUndo =
    history.length > 0 &&
    ((activeTab === "individuals" && history[history.length - 1]?.type === "user") ||
      (activeTab === "teams" && history[history.length - 1]?.type === "team"));

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Filter by skills
      if (peopleFilters.skills.length > 0) {
        const hasMatchingSkill = peopleFilters.skills.some((skill) =>
          user.skills.some((s) => s.toLowerCase().includes(skill.toLowerCase()))
        );
        if (!hasMatchingSkill) return false;
      }
      // Filter by program
      if (peopleFilters.programs.length > 0) {
        if (!peopleFilters.programs.includes(user.program)) return false;
      }
      // Filter by studio preference (match any of user's studio preferences)
      if (peopleFilters.studios.length > 0) {
        const userStudios = user.studioPreferences || [user.studioPreference];
        const hasMatchingStudio = peopleFilters.studios.some((studio) =>
          userStudios.includes(studio)
        );
        if (!hasMatchingStudio) return false;
      }
      return true;
    });
  }, [users, peopleFilters]);

  // Filtered teams
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      // Filter by skills needed
      if (teamFilters.skillsNeeded.length > 0) {
        const hasMatchingSkill = teamFilters.skillsNeeded.some((skill) =>
          team.skillsNeeded.some((s) => s.toLowerCase().includes(skill.toLowerCase()))
        );
        if (!hasMatchingSkill) return false;
      }
      // Filter by looking for (programs)
      if (teamFilters.lookingFor.length > 0) {
        const hasMatchingProgram = teamFilters.lookingFor.some((program) =>
          team.lookingFor.includes(program)
        );
        if (!hasMatchingProgram) return false;
      }
      // Filter by studio
      if (teamFilters.studios.length > 0) {
        if (!teamFilters.studios.includes(team.studio)) return false;
      }
      // Filter by team size
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

  const currentItems = activeTab === "individuals" ? filteredUsers : filteredTeams;
  const isLastCard = currentItems.length === 1;
  const hasCards = currentItems.length > 0;

  const currentUserProfile: Omit<UserProfile, "id"> = {
    name: profile.name,
    program: profile.program,
    skills: profile.skills,
    bio: profile.bio,
    studioPreference: profile.studioPreference,
    studioPreferences: profile.studioPreferences || [profile.studioPreference],
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
            {activeTab === "individuals"
              ? `${filteredUsers.length} ${filteredUsers.length === 1 ? "person" : "people"} to discover${filteredUsers.length !== users.length ? ` (${users.length} total)` : ""}`
              : `${filteredTeams.length} ${filteredTeams.length === 1 ? "team" : "teams"} to explore${filteredTeams.length !== teams.length ? ` (${teams.length} total)` : ""}`}
          </p>
        </motion.div>

        {/* Filter Panel and Activity Button */}
        <div className="flex items-start justify-center gap-2 mb-4 max-w-sm mx-auto">
          <div className="flex-1">
            {activeTab === "individuals" ? (
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
            <AnimatePresence mode="popLayout">
              {activeTab === "individuals" ? (
                hasCards ? (
                  filteredUsers
                    .slice(0, 2)
                    .map((user, index) => (
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
                      {users.length > 0 ? "No matches for current filters" : "You've seen everyone!"}
                    </p>
                    {canUndo && (
                      <p className="text-sm text-muted-foreground">Use the undo button to go back through profiles</p>
                    )}
                  </motion.div>
                )
              ) : hasCards ? (
                filteredTeams
                  .slice(0, 2)
                  .map((team, index) => (
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
                    {teams.length > 0 ? "No matches for current filters" : "You've seen all teams!"}
                  </p>
                  {canUndo && (
                    <p className="text-sm text-muted-foreground">Use the undo button to go back through teams</p>
                  )}
                </motion.div>
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
            { name: "BigCo Studio", color: "studio-bigco", desc: "Fortune 500 innovation" },
            { name: "Startup Studio", color: "studio-startup", desc: "Build your venture" },
            { name: "PiTech Studio", color: "studio-pitech", desc: "Tech for social good" },
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
        onLike={() => handleUserSwipe("right")}
        onPass={() => handleUserSwipe("left")}
      />

      {/* Team Detail Modal */}
      <TeamDetailModal
        team={selectedTeam}
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onJoin={() => handleTeamSwipe("right")}
        onPass={() => handleTeamSwipe("left")}
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
        currentUserId={user?.id || "dev-user"}
        onMemberAdded={() => {
          // Refresh team data when a member is added
          const refreshTeamData = async () => {
            if (!user) return;
            
            // Check if user has a team now
            const { data: membership } = await supabase
              .from("team_members")
              .select("team_id")
              .eq("user_id", user.id)
              .eq("status", "confirmed")
              .maybeSingle();

            if (membership) {
              const { data: teamData } = await supabase.from("teams").select("*").eq("id", membership.team_id).single();

              if (teamData) {
                const { data: members } = await supabase
                  .from("team_members")
                  .select("user_id")
                  .eq("team_id", teamData.id)
                  .eq("status", "confirmed");

                const memberUserIds = (members || []).map((m) => m.user_id);
                let teamMembers: UserProfile[] = [];

                if (memberUserIds.length > 0) {
                  const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", memberUserIds);

                  teamMembers = (profiles || []).map((p) => ({
                    id: p.user_id,
                    name: p.name,
                    program: p.program as Program,
                    skills: p.skills || [],
                    bio: p.bio || "",
                    studioPreference: p.studio_preference as Studio,
                    studioPreferences: (p.studio_preferences as Studio[]) || [p.studio_preference as Studio],
                    avatar: p.avatar || "",
                    linkedIn: p.linkedin,
                  }));
                }

                setMyTeam({
                  id: teamData.id,
                  name: teamData.name,
                  description: teamData.description || "",
                  studio: teamData.studio as Studio,
                  members: teamMembers,
                  lookingFor: [],
                  skillsNeeded: [],
                  createdBy: teamData.created_by,
                });
              }
            }
          };
          refreshTeamData();
        }}
      />

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreateTeam={handleCreateTeam}
      />

      {/* Team Management Modal */}
      <TeamManagementModal
        isOpen={isTeamManagementOpen}
        onClose={() => setIsTeamManagementOpen(false)}
        team={myTeam}
        currentUserId={user?.id || ""}
        onOpenChat={() => {
          setIsTeamManagementOpen(false);
          setIsChatOpen(true);
        }}
        onTeamDeleted={() => {
          setMyTeam(null);
          // Refresh profiles to show former team members in Find People
          const fetchProfiles = async () => {
            if (!user) return;
            try {
              const { data: teamMembers } = await supabase
                .from("team_members")
                .select("user_id")
                .eq("status", "confirmed");
              
              const usersInTeams = new Set((teamMembers || []).map((tm) => tm.user_id));
              
              const { data } = await supabase.from("profiles").select("*").neq("user_id", user.id);
              
              const availableProfiles = (data || []).filter((p) => !usersInTeams.has(p.user_id));
              
              const transformedProfiles: UserProfile[] = availableProfiles.map((p) => ({
                id: p.id,
                name: p.name,
                program: p.program as Program,
                skills: p.skills || [],
                bio: p.bio || "",
                studioPreference: p.studio_preference as Studio,
                studioPreferences: (p.studio_preferences as Studio[]) || [p.studio_preference as Studio],
                avatar: p.avatar || undefined,
                linkedIn: p.linkedin || undefined,
              }));
              
              setUsers(transformedProfiles);
            } catch (error) {
              console.error("Error refreshing profiles:", error);
            }
          };
          fetchProfiles();
          // Also refresh teams list
          setTeams((prev) => prev.filter((t) => t.id !== myTeam?.id));
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
    </div>
  );
};

export default Index;
