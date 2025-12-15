import { motion, useMotionValue, useTransform, PanInfo, animate } from 'framer-motion';
import { Team } from '@/types';
import { TeamCard } from './TeamCard';

interface SwipeableTeamCardProps {
  team: Team;
  onSwipe: (direction: 'left' | 'right') => void;
  onTap: () => void;
  isTop: boolean;
}

export const SwipeableTeamCard = ({ team, onSwipe, onTap, isTop }: SwipeableTeamCardProps) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 120;
    
    if (info.offset.x > threshold) {
      animate(x, 500, { duration: 0.3 });
      setTimeout(() => onSwipe('right'), 300);
    } else if (info.offset.x < -threshold) {
      animate(x, -500, { duration: 0.3 });
      setTimeout(() => onSwipe('left'), 300);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  };

  if (!isTop) {
    return (
      <motion.div 
        className="absolute w-full max-w-sm mx-auto"
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 0.95, y: 10 }}
      >
        <TeamCard team={team} />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute w-full max-w-sm mx-auto cursor-grab active:cursor-grabbing z-10"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      initial={{ scale: 1, y: 0 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ 
        x: x.get() > 0 ? 500 : -500,
        opacity: 0,
        transition: { duration: 0.3 }
      }}
      onTap={(e) => {
        if (Math.abs(x.get()) < 10) {
          onTap();
        }
      }}
    >
      {/* Join indicator */}
      <motion.div
        className="absolute top-8 right-8 z-20 px-4 py-2 rounded-lg border-4 border-green-500 bg-green-500/20 text-green-500 font-bold text-2xl rotate-12"
        style={{ opacity: likeOpacity }}
      >
        JOIN
      </motion.div>

      {/* Pass indicator */}
      <motion.div
        className="absolute top-8 left-8 z-20 px-4 py-2 rounded-lg border-4 border-red-500 bg-red-500/20 text-red-500 font-bold text-2xl -rotate-12"
        style={{ opacity: nopeOpacity }}
      >
        PASS
      </motion.div>

      {/* Tap hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-background/60 backdrop-blur text-xs text-muted-foreground">
        Tap for details
      </div>

      <TeamCard team={team} />
    </motion.div>
  );
};
