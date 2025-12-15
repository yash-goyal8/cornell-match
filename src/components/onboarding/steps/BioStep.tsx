import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface BioStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const BioStep = ({ value, onChange, onNext, onBack }: BioStepProps) => {
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

      <div className="space-y-2">
        <Textarea
          placeholder="I'm passionate about... Previously I worked on... Looking forward to..."
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          className="min-h-[150px] text-base bg-secondary border-border focus:border-primary resize-none"
          autoFocus
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{value.length < 20 && 'Minimum 20 characters'}</span>
          <span>{value.length}/{maxLength}</span>
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
