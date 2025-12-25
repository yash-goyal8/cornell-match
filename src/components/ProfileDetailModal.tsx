import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '@/types';
import { programColors, studioInfo } from '@/data/mockData';
import { X, Sparkles, MapPin, Linkedin, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProfileDetailModalProps {
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onLike?: () => void;
  onPass?: () => void;
  showActions?: boolean;
}

export const ProfileDetailModal = ({ profile, isOpen, onClose, onLike, onPass, showActions = true }: ProfileDetailModalProps) => {
  if (!profile) return null;

  const studioPrefs = profile.studioPreferences || [profile.studioPreference];

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
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-4 right-4 z-[70] w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors shadow-lg"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
            
            <div className="h-full rounded-2xl overflow-hidden shadow-card glass flex flex-col">

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                {/* Hero Image */}
                <div className="relative h-80">
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                  
                  {/* Studio Badges */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
                    {studioPrefs.map((studio) => {
                      const stData = studioInfo[studio];
                      return (
                        <div 
                          key={studio}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${stData.color} text-primary-foreground`}
                        >
                          {stData.name}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 -mt-16 relative">
                  {/* Name and Program */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h2 className="text-3xl font-bold text-foreground">{profile.name}</h2>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${programColors[profile.program]} text-primary-foreground`}>
                        {profile.program}
                      </span>
                    </div>
                  </div>

                  {/* Studio Preferences */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Studio Interests</h3>
                    </div>
                    <div className="space-y-2">
                      {studioPrefs.map((studio) => {
                        const stData = studioInfo[studio];
                        return (
                          <div key={studio} className="p-3 rounded-lg bg-secondary/50">
                            <p className="text-sm font-medium text-foreground">{stData.name}</p>
                            <p className="text-xs text-muted-foreground">{stData.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">About</h3>
                    <p className="text-foreground leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>

                  {/* Skills */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Skills & Expertise</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="px-3 py-1.5 text-sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* LinkedIn */}
                  {profile.linkedIn && (
                    <a
                      href={profile.linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <Linkedin className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">View LinkedIn Profile</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {showActions && onLike && onPass && (
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
                    onClick={() => { onLike(); onClose(); }}
                    className="flex-1"
                  >
                    Like
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
