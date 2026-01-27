import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '@/types';
import { programColors, studioInfo } from '@/data/mockData';
import { X, Sparkles, Linkedin, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { InitialsAvatar } from '@/components/InitialsAvatar';

interface MemberProfileModalProps {
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MemberProfileModal = ({ profile, isOpen, onClose }: MemberProfileModalProps) => {
  if (!profile) return null;

  const studioData = studioInfo[profile.studioPreference];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2 z-[60] overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="h-full rounded-2xl overflow-hidden shadow-card glass flex flex-col">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/50 backdrop-blur flex items-center justify-center hover:bg-background/80 transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                {/* Hero Image */}
                <div className="relative h-64">
                  <InitialsAvatar
                    name={profile.name}
                    src={profile.avatar}
                    className="w-full h-full text-7xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                  
                  {/* Studio Badge */}
                  <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-semibold ${studioData.color} text-primary-foreground`}>
                    {studioData.name}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 -mt-12 relative">
                  {/* Name and Program */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h2 className="text-2xl font-bold text-foreground">{profile.name}</h2>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${programColors[profile.program]} text-primary-foreground`}>
                        {profile.program}
                      </span>
                    </div>
                  </div>

                  {/* Studio Preference */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Interested in {studioData.name}</p>
                      <p className="text-xs text-muted-foreground">{studioData.description}</p>
                    </div>
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">About</h3>
                      <p className="text-foreground leading-relaxed text-sm">
                        {profile.bio}
                      </p>
                    </div>
                  )}

                  {/* Skills */}
                  {profile.skills && profile.skills.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Skills & Expertise</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* LinkedIn */}
                  {profile.linkedIn && (
                    <a
                      href={profile.linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Linkedin className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">View LinkedIn Profile</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
