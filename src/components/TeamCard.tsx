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
        <div className="p-6 gradient-card border-b border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${studioData.color} flex items-center justify-center`}>
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{team.name}</h2>
                <p className="text-sm text-muted-foreground">{studioData.name}</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
              {team.members.length}/6
            </span>
          </div>

          {/* Team Members */}
          <div className="flex -space-x-2">
            {team.members.map((member) => (
              <Avatar key={member.id} className="border-2 border-background w-10 h-10">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{member.name[0]}</AvatarFallback>
              </Avatar>
            ))}
            {Array.from({ length: 6 - team.members.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center"
              >
                <span className="text-muted-foreground text-xs">?</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {team.description}
          </p>

          {/* Looking For */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="w-3 h-3" />
              <span>Looking for</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {team.lookingFor.map((program) => (
                <span
                  key={program}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${programColors[program]} text-primary-foreground`}
                >
                  {program}
                </span>
              ))}
            </div>
          </div>

          {/* Skills Needed */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>Skills needed</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {team.skillsNeeded.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
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
