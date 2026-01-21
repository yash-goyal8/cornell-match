import { UserProfile, Team, Program, Studio } from '@/types';

export const mockUsers: UserProfile[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    program: 'MBA',
    skills: ['Product Strategy', 'Marketing', 'Finance'],
    bio: 'Passionate about building products that matter. Previously at Google, looking to join a startup studio team.',
    studioPreference: 'startup',
    studioPreferences: ['startup', 'bigco'],
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  },
  {
    id: '2',
    name: 'Alex Rodriguez',
    program: 'MEng-CS',
    skills: ['Full-Stack Development', 'Machine Learning', 'Cloud Architecture'],
    bio: 'Software engineer with 5 years experience. Excited to work on impactful tech projects.',
    studioPreference: 'pitech',
    studioPreferences: ['pitech'],
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  },
  {
    id: '3',
    name: 'Emily Watson',
    program: 'LLM',
    skills: ['IP Law', 'Contract Negotiation', 'Regulatory Compliance'],
    bio: 'Tech lawyer specializing in IP and startup law. Ready to bring legal expertise to innovative teams.',
    studioPreference: 'bigco',
    studioPreferences: ['bigco', 'startup'],
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
  },
  {
    id: '4',
    name: 'Marcus Johnson',
    program: 'CM',
    skills: ['Data Science', 'Python', 'Statistical Analysis'],
    bio: 'Data enthusiast with a background in media analytics. Looking to apply ML to real-world problems.',
    studioPreference: 'startup',
    studioPreferences: ['startup', 'pitech'],
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
  },
  {
    id: '5',
    name: 'Priya Patel',
    program: 'HealthTech',
    skills: ['Healthcare Operations', 'UX Research', 'Clinical Workflows'],
    bio: 'Former nurse turned health tech innovator. Bridging the gap between clinical needs and technology.',
    studioPreference: 'pitech',
    studioPreferences: ['pitech', 'startup', 'bigco'],
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
  },
];

export const mockTeams: Team[] = [
  {
    id: 't1',
    name: 'HealthAI Ventures',
    studio: 'startup',
    description: 'Building AI-powered diagnostics for rural healthcare. Looking for passionate individuals who want to make healthcare accessible.',
    members: [mockUsers[0], mockUsers[1]],
    lookingFor: ['LLM', 'HealthTech'],
    skillsNeeded: ['Healthcare Domain', 'Legal Expertise'],
    createdBy: '1',
  },
  {
    id: 't2',
    name: 'FinTech Disruptors',
    studio: 'bigco',
    description: 'Partnering with major banks to revolutionize payment systems. Join us to work with Fortune 500 companies.',
    members: [mockUsers[2]],
    lookingFor: ['MBA', 'MEng-CS', 'CM'],
    skillsNeeded: ['Product Management', 'Backend Development'],
    createdBy: '3',
  },
];

export const studioInfo: Record<Studio, { name: string; description: string; color: string }> = {
  bigco: {
    name: 'BigCo Studio',
    description: 'Work with Fortune 500 companies on innovation projects',
    color: 'studio-bigco',
  },
  startup: {
    name: 'Startup Studio',
    description: 'Build your own venture from the ground up',
    color: 'studio-startup',
  },
  pitech: {
    name: 'PiTech Studio',
    description: 'Create technology for social impact',
    color: 'studio-pitech',
  },
};

export const programColors: Record<Program, string> = {
  'MEng-CS': 'bg-program-meng-cs',
  'MEng-DSDA': 'bg-program-meng-dsda',
  'MEng-ECE': 'bg-program-meng-ece',
  CM: 'bg-program-cm',
  DesignTech: 'bg-program-designtech',
  HealthTech: 'bg-program-healthtech',
  UrbanTech: 'bg-program-urbantech',
  MBA: 'bg-program-mba',
  LLM: 'bg-program-llm',
};
