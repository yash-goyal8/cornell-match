import { useState } from 'react';
import { Check, X, Loader2, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JoinRequestMatch } from '@/types/chat';
import { motion } from 'framer-motion';

interface JoinRequestBannerProps {
  match: JoinRequestMatch;
  currentUserId: string;
  isTeamMember: boolean;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

export const JoinRequestBanner = ({
  match,
  currentUserId,
  isTeamMember,
  onAccept,
  onReject,
}: JoinRequestBannerProps) => {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Determine who can take action
  const isTeamSide = isTeamMember;
  const isIndividualSide = match.match_type === 'individual_to_team' 
    ? match.user_id === currentUserId 
    : match.target_user_id === currentUserId;

  // Team initiated the request - individual needs to accept
  const teamInitiated = match.match_type === 'team_to_individual';
  // Individual initiated the request - team needs to accept
  const individualInitiated = match.match_type === 'individual_to_team';

  const canTakeAction = (teamInitiated && isIndividualSide) || (individualInitiated && isTeamSide);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject();
    } finally {
      setIsRejecting(false);
    }
  };

  if (match.status !== 'pending') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`px-4 py-3 text-center text-sm font-medium ${
          match.status === 'accepted' 
            ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
            : 'bg-destructive/10 text-destructive'
        }`}
      >
        {match.status === 'accepted' ? (
          <span className="flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" />
            Request accepted! Member added to team.
          </span>
        ) : (
          'Request was declined'
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-primary/5 border-b border-primary/20 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {teamInitiated ? (
            <>
              <Users className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm text-foreground truncate">
                <span className="font-medium">{match.team?.name}</span>
                {' wants you to join!'}
              </p>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm text-foreground truncate">
                <span className="font-medium">{match.individual_profile?.name}</span>
                {' wants to join your team'}
              </p>
            </>
          )}
        </div>
        
        {canTakeAction && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={isAccepting || isRejecting}
              className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {isRejecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={isAccepting || isRejecting}
              className="h-8 px-4"
            >
              {isAccepting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Accept
                </>
              )}
            </Button>
          </div>
        )}
        
        {!canTakeAction && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            Waiting for response
          </span>
        )}
      </div>
    </motion.div>
  );
};
