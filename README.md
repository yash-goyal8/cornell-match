# Spring Studio Team Matching

A modern team matching application for MBA and graduate students to find teammates for studio projects. Built with React, TypeScript, and Supabase.

## Features

- **Swipe-based Matching**: Tinder-style card swiping to discover potential teammates
- **Team Management**: Create teams, manage members, and handle join requests
- **Real-time Chat**: Instant messaging with matched individuals and team conversations
- **Smart Filtering**: Filter profiles by skills, programs, and studio preferences
- **Activity History**: Track your swipe history with undo functionality
- **Unread Notifications**: Real-time badge indicators for new messages

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Animation**: Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **State Management**: React hooks + Context API

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── chat/           # Chat-related components
│   ├── onboarding/     # User onboarding wizard
│   └── ui/             # shadcn/ui base components
├── contexts/           # React Context providers
│   └── AuthContext.tsx # Authentication state management
├── hooks/              # Custom React hooks
│   ├── useProfiles.ts      # Profile data fetching
│   ├── useTeams.ts         # Team data fetching
│   ├── useUnreadCount.ts   # Unread message counter
│   ├── useMyTeam.ts        # User's team management
│   ├── useActivityHistory.ts # Swipe history tracking
│   ├── useSwipeActions.ts  # Swipe action handlers
│   └── useTeamMatching.ts  # Match creation logic
├── pages/              # Route pages
│   ├── Index.tsx       # Main matching interface
│   ├── Auth.tsx        # Authentication page
│   └── NotFound.tsx    # 404 page
├── types/              # TypeScript type definitions
├── lib/                # Utility functions
└── integrations/       # External service integrations
```

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useProfiles` | Fetches available user profiles, excludes swiped/team members |
| `useTeams` | Fetches available teams with member data |
| `useUnreadCount` | Optimized unread message counter with real-time updates |
| `useMyTeam` | Manages current user's team membership |
| `useActivityHistory` | Tracks and loads swipe history |
| `useSwipeActions` | Handles swipe, undo, and match creation |

## Database Schema

- **profiles**: User profile information
- **teams**: Team metadata and settings
- **team_members**: Team membership with roles/status
- **matches**: Swipe records (likes/passes)
- **conversations**: Chat conversation metadata
- **messages**: Chat messages
- **message_reads**: Read receipt tracking

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Environment Variables

The following are automatically configured:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

## Development

- Code is organized by feature with custom hooks for data logic
- All database queries use optimized parallel fetching
- Real-time subscriptions for live updates
- Proper TypeScript typing throughout

## License

Private - All rights reserved
