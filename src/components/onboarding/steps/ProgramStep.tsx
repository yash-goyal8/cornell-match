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
  { value: 'CM', label: 'Connective Media', description: 'MS in Information Science', color: 'bg-program-cm' },
  { value: 'HealthTech', label: 'Health Tech', description: 'Health Tech MBA/MS', color: 'bg-program-healthtech' },
  { value: 'UrbanTech', label: 'Urban Tech', description: 'MS in Urban Tech', color: 'bg-program-urbantech' },
  { value: 'MEng-CS', label: 'MEng in CS', description: 'Master of Engineering in Computer Science', color: 'bg-program-meng-cs' },
  { value: 'MEng-DS', label: 'MEng in Data Science', description: 'Master of Engineering in Data Science', color: 'bg-program-meng-ds' },
  { value: 'LLM', label: 'LLM', description: 'Law, Technology & Entrepreneurship', color: 'bg-program-llm' },
];

export const ProgramStep = ({ value, onChange, onNext, onBack }: ProgramStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Which program are you in?</h2>
        <p className="text-muted-foreground">
          Teams need representation from at least 3 programs
        </p>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {programs.map((program) => (
          <button
            key={program.value}
            onClick={() => onChange(program.value)}
            className={cn(
              'w-full p-3 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 text-left',
              value === program.value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-secondary/50 hover:border-muted-foreground'
            )}
          >
            <div className={cn('w-3 h-3 rounded-full flex-shrink-0', program.color)} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{program.label}</p>
              <p className="text-xs text-muted-foreground truncate">{program.description}</p>
            </div>
            {value === program.value && (
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
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
