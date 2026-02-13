import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, Program, Studio } from '@/types';
import { studioInfo, programColors } from '@/data/mockData';
import { X, Pencil, Save, Sparkles, Linkedin, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { uploadAvatar } from '@/lib/avatarUpload';

interface MyProfileModalProps {
  profile: Omit<UserProfile, 'id'> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Omit<UserProfile, 'id'>) => void;
}

const programs: { value: Program; label: string }[] = [
  { value: 'MEng-CS', label: 'MEng in CS' },
  { value: 'MEng-DSDA', label: 'MEng in DSDA' },
  { value: 'MEng-ECE', label: 'MEng in ECE' },
  { value: 'CM', label: 'Connective Media' },
  { value: 'DesignTech', label: 'Design Tech' },
  { value: 'HealthTech', label: 'Health Tech' },
  { value: 'UrbanTech', label: 'Urban Tech' },
  { value: 'MBA', label: 'MBA' },
  { value: 'LLM', label: 'LLM' },
];

const studios: { value: Studio; label: string }[] = [
  { value: 'bigco', label: 'BigCo Studio' },
  { value: 'startup', label: 'Startup Studio' },
  { value: 'pitech', label: 'PiTech Studio' },
];

export const MyProfileModal = ({ profile, isOpen, onClose, onSave }: MyProfileModalProps) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Omit<UserProfile, 'id'> | null>(profile);
  const [newSkill, setNewSkill] = useState('');

  if (!profile) return null;

  const studioPrefs = profile.studioPreferences || [profile.studioPreference];
  const studioData = studioInfo[profile.studioPreference];

  const handleStartEdit = () => {
    setEditedProfile({ ...profile });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editedProfile) {
      onSave(editedProfile);
      setIsEditing(false);
      toast.success('Profile updated!');
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && editedProfile && editedProfile.skills.length < 5) {
      setEditedProfile({
        ...editedProfile,
        skills: [...editedProfile.skills, newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (editedProfile) {
      setEditedProfile({
        ...editedProfile,
        skills: editedProfile.skills.filter((s) => s !== skillToRemove),
      });
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editedProfile && user) {
      try {
        const url = await uploadAvatar(user.id, file);
        setEditedProfile({
          ...editedProfile,
          avatar: url,
        });
        toast.success('Photo uploaded!');
      } catch (err) {
        console.error('Avatar upload failed:', err);
        toast.error('Failed to upload photo');
      }
    }
  };

  const displayProfile = isEditing ? editedProfile : profile;
  if (!displayProfile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-x-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="h-full rounded-2xl overflow-hidden shadow-card glass flex flex-col">
              {/* Header buttons */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                {!isEditing ? (
                  <button
                    onClick={handleStartEdit}
                    className="w-10 h-10 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center hover:bg-primary transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-primary-foreground" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleCancel}
                      className="w-10 h-10 rounded-full bg-secondary backdrop-blur flex items-center justify-center hover:bg-secondary/80 transition-colors"
                    >
                      <X className="w-4 h-4 text-foreground" />
                    </button>
                    <button
                      onClick={handleSave}
                      className="w-10 h-10 rounded-full bg-primary backdrop-blur flex items-center justify-center hover:bg-primary/90 transition-colors"
                    >
                      <Save className="w-4 h-4 text-primary-foreground" />
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-background/50 backdrop-blur flex items-center justify-center hover:bg-background/80 transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                {/* Hero Image */}
                <div className="relative h-72">
                  <InitialsAvatar
                    name={displayProfile.name}
                    src={displayProfile.avatar}
                    className="w-full h-full text-7xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                  
                  {isEditing && (
                    <label className="absolute bottom-20 left-1/2 -translate-x-1/2 cursor-pointer">
                      <div className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors">
                        <Camera className="w-4 h-4" />
                        Change Photo
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  )}
                  
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
                    <div className="flex items-start justify-between gap-2">
                      {isEditing ? (
                        <Input
                          value={editedProfile?.name || ''}
                          onChange={(e) => setEditedProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                          className="text-2xl font-bold bg-secondary border-border"
                          placeholder="Your name"
                        />
                      ) : (
                        <h2 className="text-3xl font-bold text-foreground">{displayProfile.name}</h2>
                      )}
                      {!isEditing && (
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${programColors[displayProfile.program]} text-primary-foreground shrink-0`}>
                          {displayProfile.program}
                        </span>
                      )}
                    </div>
                    {isEditing && (
                      <select
                        value={editedProfile?.program || ''}
                        onChange={(e) => setEditedProfile(prev => prev ? { ...prev, program: e.target.value as Program } : null)}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground"
                      >
                        {programs.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Studio Preferences (editable) */}
                  {isEditing && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Studio Preferences</h3>
                      <p className="text-xs text-muted-foreground mb-2">Select one or more studios</p>
                      <div className="flex flex-wrap gap-2">
                        {studios.map((s) => {
                          const isSelected = editedProfile?.studioPreferences?.includes(s.value) || 
                            (editedProfile?.studioPreference === s.value && !editedProfile?.studioPreferences?.length);
                          return (
                            <button
                              key={s.value}
                              onClick={() => {
                                if (!editedProfile) return;
                                const currentPrefs = editedProfile.studioPreferences || [editedProfile.studioPreference];
                                let newPrefs: Studio[];
                                if (currentPrefs.includes(s.value)) {
                                  newPrefs = currentPrefs.filter(p => p !== s.value);
                                  if (newPrefs.length === 0) newPrefs = [s.value]; // Keep at least one
                                } else {
                                  newPrefs = [...currentPrefs, s.value];
                                }
                                setEditedProfile({
                                  ...editedProfile,
                                  studioPreferences: newPrefs,
                                  studioPreference: newPrefs[0], // Primary is first
                                });
                              }}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                isSelected 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                              }`}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">About</h3>
                    {isEditing ? (
                      <Textarea
                        value={editedProfile?.bio || ''}
                        onChange={(e) => setEditedProfile(prev => prev ? { ...prev, bio: e.target.value.slice(0, 200) } : null)}
                        className="min-h-[100px] bg-secondary border-border resize-none"
                        placeholder="Tell others about yourself..."
                      />
                    ) : (
                      <p className="text-foreground leading-relaxed">
                        {displayProfile.bio || 'No bio added yet.'}
                      </p>
                    )}
                  </div>

                  {/* Skills */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Skills & Expertise</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {displayProfile.skills.map((skill) => (
                        <Badge 
                          key={skill} 
                          variant="secondary" 
                          className={`px-3 py-1.5 text-sm ${isEditing ? 'pr-1' : ''}`}
                        >
                          {skill}
                          {isEditing && (
                            <button
                              onClick={() => handleRemoveSkill(skill)}
                              className="ml-2 w-5 h-5 rounded-full bg-destructive/20 text-destructive hover:bg-destructive/30 flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                    {isEditing && displayProfile.skills.length < 5 && (
                      <div className="flex gap-2">
                        <Input
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          placeholder="Add a skill"
                          className="bg-secondary border-border"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                        />
                        <Button onClick={handleAddSkill} variant="secondary" size="sm">
                          Add
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* LinkedIn */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Linkedin className="w-4 h-4" />
                      <span className="font-semibold uppercase tracking-wide">LinkedIn</span>
                    </div>
                    {isEditing ? (
                      <Input
                        type="url"
                        value={editedProfile?.linkedIn || ''}
                        onChange={(e) => setEditedProfile(prev => prev ? { ...prev, linkedIn: e.target.value } : null)}
                        placeholder="https://linkedin.com/in/yourprofile"
                        className="bg-secondary border-border"
                      />
                    ) : displayProfile.linkedIn ? (
                      <a
                        href={displayProfile.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <Linkedin className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-foreground">View LinkedIn Profile</span>
                      </a>
                    ) : (
                      <p className="text-muted-foreground text-sm">No LinkedIn profile added.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border">
                <p className="text-center text-xs text-muted-foreground">
                  {isEditing ? 'Click save to update your profile' : 'This is how others see your profile'}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
