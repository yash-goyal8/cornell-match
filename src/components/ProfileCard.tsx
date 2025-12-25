import { motion } from 'framer-motion';
import { UserProfile } from '@/types';
import { programColors, studioInfo } from '@/data/mockData';
import { Briefcase, GraduationCap, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProfileCardProps {
  profile: UserProfile;
  style?: React.CSSProperties;
}

export const ProfileCard = ({ profile, style }: ProfileCardProps) => {
  const studioData = studioInfo[profile.studioPreference];

  return (
    <motion.div
      className="absolute w-full max-w-sm mx-auto"
      style={style}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative rounded-2xl overflow-hidden shadow-card glass min-h-[420px] sm:min-h-[480px]">
        {/* Image Section */}
        <div className="relative h-48 sm:h-64 overflow-hidden">
          <img
            src={profile.avatar}
            alt={profile.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          {/* Studio Badge */}
          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${studioData.color} text-primary-foreground`}>
            {studioData.name}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          {/* Name and Program */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">{profile.name}</h2>
            <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-semibold ${programColors[profile.program]} text-primary-foreground`}>
              {profile.program}
            </span>
          </div>

          {/* Bio */}
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3">
            {profile.bio}
          </p>

          {/* Skills */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>Skills</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
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
