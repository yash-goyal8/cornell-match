import { validatePasswordStrength, getPasswordStrengthDisplay } from '@/lib/security';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

export const PasswordStrengthMeter = ({ password, showRequirements = true }: PasswordStrengthMeterProps) => {
  const strength = validatePasswordStrength(password);
  const display = getPasswordStrengthDisplay(strength.score);

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2 mt-2"
    >
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Password strength</span>
          <span className={`text-xs font-medium ${display.color}`}>{display.label}</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(strength.score / 5) * 100}%` }}
            className={`h-full rounded-full transition-colors ${
              strength.score <= 1 ? 'bg-destructive' :
              strength.score <= 2 ? 'bg-orange-500' :
              strength.score <= 3 ? 'bg-yellow-500' :
              strength.score <= 4 ? 'bg-green-500' :
              'bg-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-1 text-xs">
          <RequirementItem met={strength.requirements.minLength} text="8+ characters" />
          <RequirementItem met={strength.requirements.hasUppercase} text="Uppercase letter" />
          <RequirementItem met={strength.requirements.hasLowercase} text="Lowercase letter" />
          <RequirementItem met={strength.requirements.hasNumber} text="Number" />
          <RequirementItem met={strength.requirements.hasSpecial} text="Special character" />
          <RequirementItem met={strength.requirements.notCommon} text="Not common" />
        </div>
      )}
    </motion.div>
  );
};

const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
  <div className={`flex items-center gap-1 ${met ? 'text-green-600' : 'text-muted-foreground'}`}>
    {met ? (
      <Check className="w-3 h-3" />
    ) : (
      <X className="w-3 h-3" />
    )}
    <span>{text}</span>
  </div>
);

export default PasswordStrengthMeter;
