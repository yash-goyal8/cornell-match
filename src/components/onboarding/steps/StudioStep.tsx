import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Rocket, Building2, Heart } from 'lucide-react';
import { Studio } from '@/types';
import { cn } from '@/lib/utils';

interface StudioStepProps {
  value: Studio | '';
  onChange: (value: Studio) => void;
  onComplete: () => void;
  onBack: () => void;
}

const studios: { value: Studio; label: string; description: string; icon: React.ElementType; colorClass: string }[] = [
  {
    value: 'bigco',
    label: 'BigCo Studio',
    description: 'Work with Fortune 500 companies on real innovation challenges',
    icon: Building2,
    colorClass: 'studio-bigco',
  },
  {
    value: 'startup',
    label: 'Startup Studio',
    description: 'Build your own venture from the ground up',
    icon: Rocket,
    colorClass: 'studio-startup',
  },
  {
    value: 'pitech',
    label: 'PiTech Studio',
    description: 'Create technology solutions for social impact',
    icon: Heart,
    colorClass: 'studio-pitech',
  },
];

export const StudioStep = ({ value, onChange, onComplete, onBack }: StudioStepProps) => {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Choose your studio</h2>
        <p className="text-muted-foreground">
          Which Spring Studio experience excites you most?
        </p>
      </div>

      <div className="space-y-4">
        {studios.map((studio) => (
          <button
            key={studio.value}
            onClick={() => onChange(studio.value)}
            className={cn(
              'w-full p-5 rounded-2xl border-2 transition-all duration-200 text-left',
              value === studio.value
                ? 'border-primary bg-primary/10 scale-[1.02]'
                : 'border-border bg-secondary/50 hover:border-muted-foreground hover:scale-[1.01]'
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', studio.colorClass)}>
                <studio.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-lg text-foreground">{studio.label}</p>
                  {value === studio.value && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{studio.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button size="lg" onClick={onComplete} disabled={!value} className="flex-1">
          Complete Profile
        </Button>
      </div>
    </div>
  );
};
