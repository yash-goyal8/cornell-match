import { motion } from 'framer-motion';
import { Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  type: 'individuals' | 'teams';
  onReset: () => void;
}

export const EmptyState = ({ type, onReset }: EmptyStateProps) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center mb-6">
        {type === 'individuals' ? (
          <Search className="w-10 h-10 text-muted-foreground" />
        ) : (
          <Users className="w-10 h-10 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        No more {type === 'individuals' ? 'people' : 'teams'} to show
      </h3>
      <p className="text-muted-foreground mb-6 max-w-xs">
        You've seen everyone! Check back later for new {type === 'individuals' ? 'profiles' : 'teams'} or reset to start again.
      </p>
      <Button onClick={onReset}>
        Start Over
      </Button>
    </motion.div>
  );
};
