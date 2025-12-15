import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SkillsStepProps {
  value: string[];
  onChange: (value: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const suggestedSkills = [
  'Product Management',
  'Full-Stack Development',
  'Machine Learning',
  'UX/UI Design',
  'Data Science',
  'Marketing',
  'Finance',
  'Legal/IP',
  'Healthcare',
  'Cloud Architecture',
  'Business Strategy',
  'Sales',
];

export const SkillsStep = ({ value, onChange, onNext, onBack }: SkillsStepProps) => {
  const [customSkill, setCustomSkill] = useState('');

  const toggleSkill = (skill: string) => {
    if (value.includes(skill)) {
      onChange(value.filter((s) => s !== skill));
    } else if (value.length < 5) {
      onChange([...value, skill]);
    }
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !value.includes(customSkill.trim()) && value.length < 5) {
      onChange([...value, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">What are your skills?</h2>
        <p className="text-muted-foreground">
          Select up to 5 skills you bring to the team
        </p>
      </div>

      {/* Selected skills */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-secondary/50">
          {value.map((skill) => (
            <Badge
              key={skill}
              variant="default"
              className="px-3 py-1.5 text-sm cursor-pointer"
              onClick={() => toggleSkill(skill)}
            >
              {skill}
              <X className="w-3 h-3 ml-2" />
            </Badge>
          ))}
        </div>
      )}

      {/* Suggested skills */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Suggested skills</p>
        <div className="flex flex-wrap gap-2">
          {suggestedSkills
            .filter((skill) => !value.includes(skill))
            .map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className={cn(
                  'px-3 py-1.5 text-sm cursor-pointer transition-all',
                  'hover:bg-primary hover:text-primary-foreground'
                )}
                onClick={() => toggleSkill(skill)}
              >
                {skill}
              </Badge>
            ))}
        </div>
      </div>

      {/* Custom skill input */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Add a custom skill..."
          value={customSkill}
          onChange={(e) => setCustomSkill(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomSkill()}
          className="flex-1 bg-secondary border-border"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={addCustomSkill}
          disabled={!customSkill.trim() || value.length >= 5}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {value.length}/5 skills selected
      </p>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button size="lg" onClick={onNext} disabled={value.length === 0} className="flex-1">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
