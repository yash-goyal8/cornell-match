/**
 * Skeleton Card Components
 * 
 * Loading placeholders for cards and lists to improve perceived performance.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
}

/**
 * Skeleton for profile cards
 */
export function ProfileCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <Card className={cn("w-full max-w-sm overflow-hidden", className)}>
      {/* Avatar area */}
      <Skeleton className="h-48 sm:h-64 w-full rounded-none" />
      
      <CardContent className="p-4 space-y-3">
        {/* Name and program */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        
        {/* Bio */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        
        {/* Skills badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for team cards
 */
export function TeamCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <Card className={cn("w-full max-w-sm overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Description */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        
        {/* Team members */}
        <div className="flex -space-x-2">
          <Skeleton className="h-10 w-10 rounded-full border-2 border-background" />
          <Skeleton className="h-10 w-10 rounded-full border-2 border-background" />
          <Skeleton className="h-10 w-10 rounded-full border-2 border-background" />
        </div>
        
        {/* Skills needed */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-18 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for chat list items
 */
export function ChatListItemSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn("flex items-center gap-3 p-3", className)}>
      <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton for message bubbles
 */
export function MessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
      <div className={cn("space-y-1", isOwn ? "items-end" : "items-start")}>
        <Skeleton className={cn("h-10 rounded-2xl", isOwn ? "w-40" : "w-48")} />
        <Skeleton className="h-2 w-12" />
      </div>
    </div>
  );
}

/**
 * Skeleton for the main swipe card stack
 */
export function SwipeStackSkeleton() {
  return (
    <div className="relative h-[420px] sm:h-[460px] flex items-center justify-center">
      {/* Background card */}
      <div className="absolute w-full max-w-sm transform scale-95 translate-y-2 opacity-60">
        <ProfileCardSkeleton className="h-[400px] sm:h-[440px]" />
      </div>
      {/* Front card */}
      <div className="absolute w-full max-w-sm z-10 animate-pulse">
        <ProfileCardSkeleton className="h-[400px] sm:h-[440px]" />
      </div>
    </div>
  );
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b">
        <div className="container flex items-center justify-between h-16 px-4">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="container px-4 py-8">
        <SwipeStackSkeleton />
      </div>
    </div>
  );
}
