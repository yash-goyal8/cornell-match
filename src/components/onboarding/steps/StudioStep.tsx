import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Rocket, Building2, Heart } from 'lucide-react';
import { Studio } from '@/types';
import { cn } from '@/lib/utils';

interface StudioStepProps {
  value: Studio[];
  onChange: (value: Studio[]) => void;
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
  const toggleStudio = (studio: Studio) => {
    if (value.includes(studio)) {
      onChange(value.filter(s => s !== studio));
    } else {
      onChange([...value, studio]);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Choose your studio preferences</h2>
        <p className="text-muted-foreground">
          Select one or more Spring Studio experiences that excite you
        </p>
      </div>

      <div className="space-y-4">
        {studios.map((studio) => {
          const isSelected = value.includes(studio.value);
          return (
            <button
              key={studio.value}
              onClick={() => toggleStudio(studio.value)}
              className={cn(
                'w-full p-5 rounded-2xl border-2 transition-all duration-200 text-left',
                isSelected
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
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{studio.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {value.length === 0 
          ? 'Please select at least one studio' 
          : `${value.length} studio${value.length > 1 ? 's' : ''} selected`}
      </p>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button size="lg" onClick={onComplete} disabled={value.length === 0} className="flex-1">
          Complete Profile
        </Button>
      </div>
    </div>
  );
};
