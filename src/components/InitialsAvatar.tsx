import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface InitialsAvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  textClassName?: string;
}

// Generate a consistent color based on the name
const getColorFromName = (name: string): string => {
  const colors = [
    'bg-rose-500',
    'bg-pink-500',
    'bg-fuchsia-500',
    'bg-purple-500',
    'bg-violet-500',
    'bg-indigo-500',
    'bg-blue-500',
    'bg-sky-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-emerald-500',
    'bg-green-500',
    'bg-lime-500',
    'bg-amber-500',
    'bg-orange-500',
  ];
  
  // Simple hash based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Get initials from a name (max 2 characters)
const getInitials = (name: string): string => {
  if (!name || name.trim() === '') return '?';
  
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Check if the avatar is a valid custom image (not a default placeholder)
const isValidCustomAvatar = (src: string | null | undefined): boolean => {
  if (!src) return false;
  
  // Check for common placeholder patterns
  const placeholderPatterns = [
    'unsplash.com/photo-1535713875002-d1d0cf377fde', // Default avatar
    'placeholder.svg',
    'placeholder.png',
  ];
  
  return !placeholderPatterns.some(pattern => src.includes(pattern));
};

export const InitialsAvatar = ({ 
  name, 
  src, 
  className = '',
  textClassName = ''
}: InitialsAvatarProps) => {
  const initials = useMemo(() => getInitials(name), [name]);
  const bgColor = useMemo(() => getColorFromName(name), [name]);
  const hasValidImage = isValidCustomAvatar(src);

  if (hasValidImage && src) {
    return (
      <div className={cn('overflow-hidden', className)}>
        <img 
          src={src} 
          alt={name} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide broken image and show fallback
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement?.classList.add(bgColor);
          }}
        />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'flex items-center justify-center text-white font-bold',
        bgColor,
        className
      )}
    >
      <span className={cn('select-none', textClassName)}>
        {initials}
      </span>
    </div>
  );
};

export { getInitials, getColorFromName, isValidCustomAvatar };
