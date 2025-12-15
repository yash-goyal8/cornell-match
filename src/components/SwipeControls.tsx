import { motion } from 'framer-motion';
import { X, Heart, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SwipeControlsProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  isLastCard?: boolean;
}

export const SwipeControls = ({ onSwipeLeft, onSwipeRight, onUndo, canUndo, isLastCard }: SwipeControlsProps) => {
  return (
    <motion.div
      className="flex items-center justify-center gap-6 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {canUndo && (
        <Button
          variant="glass"
          size="icon"
          onClick={onUndo}
          className="w-12 h-12 rounded-full"
        >
          <RotateCcw className="w-5 h-5 text-accent" />
        </Button>
      )}
      
      <Button
        variant="swipe-pass"
        onClick={onSwipeLeft}
      >
        <X className="w-7 h-7 text-muted-foreground" />
      </Button>

      <Button
        variant="swipe-like"
        onClick={onSwipeRight}
      >
        <Heart className="w-7 h-7 text-primary-foreground" />
      </Button>

      {isLastCard && (
        <motion.span 
          className="absolute -bottom-8 text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Last profile - undo to go back
        </motion.span>
      )}
    </motion.div>
  );
};
