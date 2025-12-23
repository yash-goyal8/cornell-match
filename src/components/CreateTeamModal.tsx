import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Studio } from '@/types';
import { Users, Loader2, X } from 'lucide-react';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTeam: (teamData: { 
    name: string; 
    description: string; 
    studio: Studio;
    lookingFor: string;
    skillsNeeded: string[];
  }) => Promise<void>;
}

const studioOptions: { value: Studio; label: string; description: string }[] = [
  { value: 'bigco', label: 'BigCo Studio', description: 'Fortune 500 innovation projects' },
  { value: 'startup', label: 'Startup Studio', description: 'Build your own venture' },
  { value: 'pitech', label: 'PiTech Studio', description: 'Tech for social good' },
];

const skillOptions = [
  'Full-Stack Development',
  'Frontend Development',
  'Backend Development',
  'Machine Learning',
  'Data Science',
  'Product Management',
  'UI/UX Design',
  'Marketing',
  'Finance',
  'Operations',
  'Sales',
  'Business Development',
];

export const CreateTeamModal = ({ isOpen, onClose, onCreateTeam }: CreateTeamModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [studio, setStudio] = useState<Studio>('startup');
  const [lookingFor, setLookingFor] = useState('');
  const [skillsNeeded, setSkillsNeeded] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const toggleSkill = (skill: string) => {
    setSkillsNeeded(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreateTeam({ 
        name: name.trim(), 
        description: description.trim(), 
        studio,
        lookingFor: lookingFor.trim(),
        skillsNeeded,
      });
      // Reset form
      setName('');
      setDescription('');
      setStudio('startup');
      setLookingFor('');
      setSkillsNeeded([]);
      onClose();
    } catch (error) {
      console.error('Error creating team:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Create Your Team
          </DialogTitle>
          <DialogDescription>
            Start a team and become its admin. You can invite members after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name *</Label>
            <Input
              id="team-name"
              placeholder="Enter team name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-description">Description</Label>
            <Textarea
              id="team-description"
              placeholder="What's your team about? What are you building?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="looking-for">Looking For</Label>
            <Textarea
              id="looking-for"
              placeholder="What kind of teammates are you looking for? (e.g., A technical co-founder with ML experience)"
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              maxLength={200}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Skills Needed</Label>
            <div className="flex flex-wrap gap-2">
              {skillOptions.map((skill) => (
                <Badge
                  key={skill}
                  variant={skillsNeeded.includes(skill) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                  {skillsNeeded.includes(skill) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Studio Preference *</Label>
            <RadioGroup value={studio} onValueChange={(v) => setStudio(v as Studio)} className="space-y-2">
              {studioOptions.map((option) => (
                <label
                  key={option.value}
                  htmlFor={option.value}
                  className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                  <div className="flex-1">
                    <span className="font-medium">
                      {option.label}
                    </span>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isCreating} className="flex-1">
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Team'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
