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
      <div className="rounded-2xl overflow-hidden shadow-card glass">
        {/* Header */}
        <div className="p-5 gradient-card border-b border-border/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl ${studioData.color} flex items-center justify-center`}>
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{team.name}</h2>
                <p className="text-xs text-muted-foreground">{studioData.name}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
              {team.members.length}/6
            </span>
          </div>

          {/* Team Members */}
          <div className="flex -space-x-2">
            {team.members.map((member) => (
              <Avatar key={member.id} className="border-2 border-background w-9 h-9">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{member.name[0]}</AvatarFallback>
              </Avatar>
            ))}
            {Array.from({ length: 6 - team.members.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-9 h-9 rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center"
              >
                <span className="text-muted-foreground text-xs">?</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
            {team.description}
          </p>

          {/* Looking For */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="w-3 h-3" />
              <span>Looking for</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {team.lookingFor.map((program) => (
                <span
                  key={program}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${programColors[program]} text-primary-foreground`}
                >
                  {program}
                </span>
              ))}
            </div>
          </div>

          {/* Skills Needed */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>Skills needed</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {team.skillsNeeded.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs px-2 py-0.5">
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
