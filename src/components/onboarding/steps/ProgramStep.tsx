import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Program } from '@/types';
import { cn } from '@/lib/utils';

interface ProgramStepProps {
  value: Program | '';
  onChange: (value: Program) => void;
  onNext: () => void;
  onBack: () => void;
}

const programs: { value: Program; label: string; description: string; color: string }[] = [
  { value: 'MBA', label: 'MBA', description: 'Johnson Cornell Tech MBA', color: 'bg-program-mba' },
  { value: 'MEng', label: 'MEng', description: 'Master of Engineering', color: 'bg-program-meng' },
  { value: 'LLM', label: 'LLM', description: 'Law, Technology & Entrepreneurship', color: 'bg-program-llm' },
  { value: 'CM', label: 'CM', description: 'Connective Media', color: 'bg-program-cm' },
  { value: 'HealthTech', label: 'Health Tech', description: 'Health Tech MBA/MS', color: 'bg-program-healthtech' },
];

export const ProgramStep = ({ value, onChange, onNext, onBack }: ProgramStepProps) => {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Which program are you in?</h2>
        <p className="text-muted-foreground">
          Teams need representation from at least 3 programs
        </p>
      </div>

      <div className="space-y-3">
        {programs.map((program) => (
          <button
            key={program.value}
            onClick={() => onChange(program.value)}
            className={cn(
              'w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 text-left',
              value === program.value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-secondary/50 hover:border-muted-foreground'
            )}
          >
            <div className={cn('w-4 h-4 rounded-full', program.color)} />
            <div className="flex-1">
              <p className="font-semibold text-foreground">{program.label}</p>
              <p className="text-sm text-muted-foreground">{program.description}</p>
            </div>
            {value === program.value && (
              <Check className="w-5 h-5 text-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button size="lg" onClick={onNext} disabled={!value} className="flex-1">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
