import { motion } from 'framer-motion';
import { Team } from '@/types';
import { programColors, studioInfo } from '@/data/mockData';
import { Users, Target, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface TeamCardProps {
  team: Team;
}

export const TeamCard = ({ team }: TeamCardProps) => {
  const studioData = studioInfo[team.studio];

  return (
    <motion.div
      className="w-full max-w-sm mx-auto"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rounded-2xl overflow-hidden shadow-card glass min-h-[420px] sm:min-h-[480px] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 gradient-card border-b border-border/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${studioData.color} flex items-center justify-center`}>
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{team.name}</h2>
                <p className="text-sm text-muted-foreground">{studioData.name}</p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-secondary text-secondary-foreground">
              {team.members.length}/6
            </span>
          </div>

          {/* Team Members */}
          <div className="flex -space-x-2">
            {team.members.map((member) => (
              <Avatar key={member.id} className="border-2 border-background w-10 h-10 sm:w-11 sm:h-11">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{member.name[0]}</AvatarFallback>
              </Avatar>
            ))}
            {Array.from({ length: 6 - team.members.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center"
              >
                <span className="text-muted-foreground text-sm">?</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col">
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed line-clamp-3 flex-shrink-0">
            {team.description}
          </p>

          {/* Looking For */}
          <div className="space-y-2 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              <span className="font-medium">Looking for</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {team.lookingFor.map((program) => (
                <span
                  key={program}
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${programColors[program]} text-primary-foreground`}
                >
                  {program}
                </span>
              ))}
            </div>
          </div>

          {/* Skills Needed */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">Skills needed</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {team.skillsNeeded.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-sm px-3 py-1">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
