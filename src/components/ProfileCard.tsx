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
      <div className="relative rounded-2xl overflow-hidden shadow-card glass">
        {/* Image Section */}
        <div className="relative h-56 overflow-hidden">
          <img
            src={profile.avatar}
            alt={profile.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          {/* Studio Badge */}
          <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold ${studioData.color} text-primary-foreground`}>
            {studioData.name}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 space-y-3">
          {/* Name and Program */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">{profile.name}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${programColors[profile.program]} text-primary-foreground`}>
                {profile.program}
              </span>
            </div>
          </div>

          {/* Bio */}
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
            {profile.bio}
          </p>

          {/* Skills */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>Skills</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
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
