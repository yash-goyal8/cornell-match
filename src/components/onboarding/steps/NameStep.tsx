import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const NameStep = ({ value, onChange, onNext, onBack }: NameStepProps) => {
  const isValid = value.trim().length >= 2;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">What's your name?</h2>
        <p className="text-muted-foreground">
          This is how other students will see you
        </p>
      </div>

      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Enter your full name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-14 text-lg text-center bg-secondary border-border focus:border-primary"
          autoFocus
        />
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
