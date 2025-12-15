import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { UserProfile } from '@/types';
import { ProfileCard } from './ProfileCard';

interface SwipeableCardProps {
  profile: UserProfile;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
}

export const SwipeableCard = ({ profile, onSwipe, isTop }: SwipeableCardProps) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      onSwipe(info.offset.x > 0 ? 'right' : 'left');
    }
  };

  if (!isTop) {
    return (
      <div className="absolute w-full max-w-sm mx-auto scale-95 opacity-50">
        <ProfileCard profile={profile} />
      </div>
    );
  }

  return (
    <motion.div
      className="absolute w-full max-w-sm mx-auto cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
    >
      {/* Like indicator */}
      <motion.div
        className="absolute top-8 right-8 z-10 px-4 py-2 rounded-lg border-4 border-green-500 text-green-500 font-bold text-2xl rotate-12"
        style={{ opacity: likeOpacity }}
      >
        LIKE
      </motion.div>

      {/* Nope indicator */}
      <motion.div
        className="absolute top-8 left-8 z-10 px-4 py-2 rounded-lg border-4 border-red-500 text-red-500 font-bold text-2xl -rotate-12"
        style={{ opacity: nopeOpacity }}
      >
        PASS
      </motion.div>

      <ProfileCard profile={profile} />
    </motion.div>
  );
};
