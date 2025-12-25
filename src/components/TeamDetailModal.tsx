import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Team, UserProfile } from '@/types';
import { programColors, studioInfo } from '@/data/mockData';
import { X, Users, Target, Sparkles, Building2, Rocket, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MemberProfileModal } from '@/components/MemberProfileModal';

interface TeamDetailModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
  onJoin: () => void;
  onPass: () => void;
}

const studioIcons = {
  bigco: Building2,
  startup: Rocket,
  pitech: Heart,
};

export const TeamDetailModal = ({ team, isOpen, onClose, onJoin, onPass }: TeamDetailModalProps) => {
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  if (!team) return null;

  const studioData = studioInfo[team.studio];
  const StudioIcon = studioIcons[team.studio];

  const handleMemberClick = (member: UserProfile) => {
    setSelectedMember(member);
    setIsMemberModalOpen(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-x-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 z-[60] overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button - outside the overflow container */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-[70] w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors shadow-lg"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
            
            <div className="h-full rounded-2xl overflow-hidden shadow-card glass flex flex-col">

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className={`p-8 ${studioData.color}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-background/20 flex items-center justify-center">
                      <StudioIcon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-primary-foreground">{team.name}</h2>
                      <p className="text-primary-foreground/80">{studioData.name}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Team composition */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Team Members</h3>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{team.members.length}/6</span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full gradient-primary transition-all duration-500"
                        style={{ width: `${(team.members.length / 6) * 100}%` }}
                      />
                    </div>

                    {/* Member avatars with names */}
                    <div className="space-y-2">
                      {team.members.map((member) => (
                        <div 
                          key={member.id} 
                          className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 cursor-pointer hover:bg-secondary/80 transition-colors"
                          onClick={() => handleMemberClick(member)}
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.program}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${programColors[member.program]} text-primary-foreground`}>
                            {member.program}
                          </span>
                        </div>
                      ))}
                      
                      {/* Empty slots */}
                      {Array.from({ length: 6 - team.members.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-muted-foreground/20">
                          <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
                            <span className="text-muted-foreground">?</span>
                          </div>
                          <p className="text-sm text-muted-foreground">Open position</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">About the Team</h3>
                    <p className="text-foreground leading-relaxed">
                      {team.description}
                    </p>
                  </div>

                  {/* Looking for */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Looking For</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {team.lookingFor.map((program) => (
                        <span
                          key={program}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold ${programColors[program]} text-primary-foreground`}
                        >
                          {program}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Skills needed */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Skills Needed</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {team.skillsNeeded.map((skill) => (
                        <Badge key={skill} variant="secondary" className="px-3 py-1.5 text-sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 border-t border-border flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => { onPass(); onClose(); }}
                  className="flex-1"
                >
                  <X className="w-5 h-5 mr-2" />
                  Pass
                </Button>
                <Button
                  size="lg"
                  onClick={() => { onJoin(); onClose(); }}
                  className="flex-1"
                >
                  Request to Join
                </Button>
              </div>
            </div>
          </motion.div>
          {/* Member Profile Modal */}
          <MemberProfileModal
            profile={selectedMember}
            isOpen={isMemberModalOpen}
            onClose={() => setIsMemberModalOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  );
};
