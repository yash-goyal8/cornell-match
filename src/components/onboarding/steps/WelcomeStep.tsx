import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Users, Sparkles, Target, Zap } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep = ({ onNext }: WelcomeStepProps) => {
  const features = [
    { icon: Users, text: 'Find teammates from different programs' },
    { icon: Target, text: 'Match with BigCo, Startup, or PiTech studios' },
    { icon: Zap, text: 'Build diverse teams of 5-6 members' },
  ];

  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center mx-auto shadow-glow"
      >
        <Sparkles className="w-12 h-12 text-primary-foreground" />
      </motion.div>

      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-foreground">
          Welcome to <span className="text-gradient">TeamMatch</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Cornell Tech Spring Studio Team Formation
        </p>
      </div>

      <div className="space-y-4 py-6">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-xl glass"
          >
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <feature.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-foreground text-left">{feature.text}</span>
          </motion.div>
        ))}
      </div>

      <Button size="xl" onClick={onNext} className="w-full">
        Get Started
      </Button>
    </div>
  );
};
