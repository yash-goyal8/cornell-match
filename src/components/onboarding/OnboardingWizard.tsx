import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WelcomeStep } from './steps/WelcomeStep';
import { NameStep } from './steps/NameStep';
import { ProgramStep } from './steps/ProgramStep';
import { SkillsStep } from './steps/SkillsStep';
import { BioStep } from './steps/BioStep';
import { StudioStep } from './steps/StudioStep';
import { UserProfile, Program, Studio } from '@/types';
import { Users } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: (profile: Omit<UserProfile, 'id' | 'avatar'>) => void;
}

const TOTAL_STEPS = 6;

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    program: '' as Program | '',
    skills: [] as string[],
    bio: '',
    studioPreference: '' as Studio | '',
  });

  const nextStep = () => {
    setDirection(1);
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  };

  const prevStep = () => {
    setDirection(-1);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const updateFormData = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleComplete = () => {
    if (formData.name && formData.program && formData.studioPreference) {
      onComplete({
        name: formData.name,
        program: formData.program as Program,
        skills: formData.skills,
        bio: formData.bio,
        studioPreference: formData.studioPreference as Studio,
      });
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <WelcomeStep onNext={nextStep} />;
      case 1:
        return (
          <NameStep
            value={formData.name}
            onChange={(value) => updateFormData('name', value)}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 2:
        return (
          <ProgramStep
            value={formData.program}
            onChange={(value) => updateFormData('program', value)}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <SkillsStep
            value={formData.skills}
            onChange={(value) => updateFormData('skills', value)}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <BioStep
            value={formData.bio}
            onChange={(value) => updateFormData('bio', value)}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 5:
        return (
          <StudioStep
            value={formData.studioPreference}
            onChange={(value) => updateFormData('studioPreference', value)}
            onComplete={handleComplete}
            onBack={prevStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">TeamMatch</h1>
            <p className="text-xs text-muted-foreground">Cornell Tech</p>
          </div>
        </div>
      </header>

      {/* Progress */}
      {step > 0 && (
        <div className="px-6 mb-4">
          <div className="flex gap-2 max-w-md mx-auto">
            {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i < step ? 'gradient-primary' : 'bg-secondary'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Step {step} of {TOTAL_STEPS - 1}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
