import { motion } from 'framer-motion';
import { Users, User, MessageCircle, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  activeTab: 'individuals' | 'teams';
  onTabChange: (tab: 'individuals' | 'teams') => void;
  matchCount?: number;
  onProfileClick?: () => void;
  userAvatar?: string;
}

export const Header = ({ activeTab, onTabChange, matchCount = 0, onProfileClick, userAvatar }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg text-foreground">TeamMatch</h1>
              <p className="text-xs text-muted-foreground">Cornell Tech</p>
            </div>
          </motion.div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50">
            <Button
              variant={activeTab === 'individuals' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onTabChange('individuals')}
              className="gap-2"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Find People</span>
            </Button>
            <Button
              variant={activeTab === 'teams' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onTabChange('teams')}
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Find Teams</span>
            </Button>
          </div>

          {/* Right side actions */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button variant="glass" size="sm" className="gap-2 relative">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Matches</span>
              {matchCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-xs flex items-center justify-center text-primary-foreground">
                  {matchCount}
                </span>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onProfileClick}
              className="rounded-full overflow-hidden w-10 h-10 p-0"
            >
              {userAvatar ? (
                <img src={userAvatar} alt="Your profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-6 h-6" />
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </header>
  );
};
