import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Linkedin } from 'lucide-react';

interface BioStepProps {
  value: string;
  linkedIn: string;
  onChange: (value: string) => void;
  onLinkedInChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const BioStep = ({ value, linkedIn, onChange, onLinkedInChange, onNext, onBack }: BioStepProps) => {
  const maxLength = 200;
  const isValid = value.trim().length >= 20;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Tell us about yourself</h2>
        <p className="text-muted-foreground">
          A short bio helps others know what you're about
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="I'm passionate about... Previously I worked on... Looking forward to..."
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
            className="min-h-[120px] text-base bg-secondary border-border focus:border-primary resize-none"
            autoFocus
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{value.length < 20 && 'Minimum 20 characters'}</span>
            <span>{value.length}/{maxLength}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Linkedin className="w-4 h-4" />
            <span>LinkedIn URL (optional)</span>
          </div>
          <Input
            type="url"
            placeholder="https://linkedin.com/in/yourprofile"
            value={linkedIn}
            onChange={(e) => onLinkedInChange(e.target.value)}
            className="text-base bg-secondary border-border focus:border-primary"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button size="lg" onClick={onNext} disabled={!isValid} className="flex-1">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
